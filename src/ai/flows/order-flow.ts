
'use server';
/**
 * @fileOverview Defines and exports server actions for managing restaurant orders.
 */
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { getRestaurant, getSettings } from '@/lib/settings';
import {
  PlaceOrderInput,
  PlacedOrder,
  PlacedOrderSchema,
  PlaceOrderResult,
  OrderItem,
  GetPlacedOrdersResult,
} from '@/types';
import { revalidatePath, revalidateTag } from 'next/cache';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';


const RESTAURANTS_COLLECTION = 'restaurants';
const ORDERS_COLLECTION = 'orders';
const POINT_LOGS_COLLECTION = 'pointLogs';
const DISH_ORDER_LOGS_COLLECTION = 'dishOrderLogs';

function isWithinAutoCloseTime(startTime: string, endTime: string): boolean {
  const nowInBeijing = new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const [currentHours, currentMinutes] = nowInBeijing.split(':').map(Number);
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const startTimeInMinutes = startHours * 60 + startMinutes;

  const [endHours, endMinutes] = endTime.split(':').map(Number);
  const endTimeInMinutes = endHours * 60 + endMinutes;

  if (startTimeInMinutes <= endTimeInMinutes) {
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
  } else {
    return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes;
  }
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const { restaurantId, order } = input;
  if (!restaurantId) {
    return { order: null, logs: ['[SERVER] Order rejected: Missing restaurantId.'], error: '下单失败，缺少餐馆信息。' };
  }

  try {
    const { db: adminDb } = getFirebaseAdmin();
    const restaurantRef = adminDb.collection(RESTAURANTS_COLLECTION).doc(restaurantId);
    
    const logDateId = new Date().toISOString().split('T')[0];
    const pointLogRef = restaurantRef.collection(POINT_LOGS_COLLECTION).doc(logDateId);
    const dishLogRef = restaurantRef.collection(DISH_ORDER_LOGS_COLLECTION).doc(logDateId);


    const placeOrderResult = await adminDb.runTransaction(async (transaction) => {
      // --- ALL READS FIRST ---
      const restaurantDoc = await transaction.get(restaurantRef);
      const pointLogDoc = await transaction.get(pointLogRef);
      const dishLogDoc = await transaction.get(dishLogRef);

      // --- VALIDATION AND LOGIC ---
      if (!restaurantDoc.exists) {
        throw new Error("餐馆不存在。");
      }
      const restaurant = restaurantDoc.data();
      if (!restaurant || restaurant.points <= 0) {
        return { order: null, logs: ['[SERVER] Order rejected: Insufficient points.'], error: '点数不足，请联系管理员充值。' };
      }

      const settings = await getSettings(restaurantId);

      if (settings.isRestaurantClosed) {
        return { order: null, logs: ['[SERVER] Order rejected: Restaurant is manually closed.'], error: '抱歉，本店已打烊，暂时无法下单。' };
      }
      
      if (settings.isOnlineOrderingDisabled) {
          return { order: null, logs: ['[SERVER] Order rejected: Online ordering is disabled.'], error: '线上点单已经关闭，仅支持线下点单' };
      }

      if (isWithinAutoCloseTime(settings.autoCloseStartTime, settings.autoCloseEndTime)) {
          return { order: null, logs: ['[SERVER] Order rejected: Within automatic closing hours.'], error: `抱歉，现在是休息时间 (${settings.autoCloseStartTime} - ${settings.autoCloseEndTime})，暂时无法下单。` };
      }

      const timestamp = Timestamp.now();
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
      const expireAt = Timestamp.fromDate(oneMonthFromNow);

      const orderToSave = {
        ...input,
        placedAt: timestamp,
        expireAt: expireAt,
      };
      
      // --- ALL WRITES LAST ---
      const newOrderRef = restaurantRef.collection(ORDERS_COLLECTION).doc();
      
      // Write 1: Create the new order
      transaction.set(newOrderRef, orderToSave);

      // Write 2: Decrement points
      transaction.update(restaurantRef, { points: FieldValue.increment(-1) });

      // Write 3: Update or create the daily point log (expires in 90 days)
      const pointLogExpirationDate = new Date();
      pointLogExpirationDate.setDate(pointLogExpirationDate.getDate() + 90);
      const pointLogExpireAt = Timestamp.fromDate(pointLogExpirationDate);

      if (pointLogDoc.exists) {
        transaction.update(pointLogRef, { 
            count: FieldValue.increment(1),
            expireAt: pointLogExpireAt 
        });
      } else {
        transaction.set(pointLogRef, { 
            count: 1, 
            expireAt: pointLogExpireAt 
        });
      }

      // Write 4: Update or create daily dish order logs (expires in 30 days)
      if (dishLogDoc.exists) {
        const dishUpdates: { [key: string]: any } = { expireAt };
        order.forEach(item => {
            dishUpdates[`counts.${item.dish.id}`] = FieldValue.increment(item.quantity);
        });
        transaction.update(dishLogRef, dishUpdates);
      } else {
        const initialCounts: { [key: string]: number } = {};
         order.forEach(item => {
            initialCounts[item.dish.id] = item.quantity;
        });
        transaction.set(dishLogRef, {
          counts: initialCounts,
          expireAt: expireAt,
        });
      }
      
      const newPlacedOrder: PlacedOrder = {
        ...input,
        id: newOrderRef.id, 
        placedAt: timestamp.toDate().toISOString(),
      };

      return {
          order: PlacedOrderSchema.parse(newPlacedOrder),
          logs: ['[SERVER] Order placed successfully.'],
          error: null,
      };
    });
    
    // Revalidate caches after transaction to show updated data
    if(placeOrderResult && placeOrderResult.order) {
        revalidateTag(`restaurant-${restaurantId}`);
        revalidateTag('restaurants');
        revalidateTag(`pointLogs-${restaurantId}`);
        revalidateTag(`dishOrderLogs-${restaurantId}`);
    }
    
    return placeOrderResult;
  } catch (error: any) {
    console.error("CRITICAL: Unhandled exception in placeOrder:", error);
    return {
        order: null,
        logs: [`[SERVER] CRITICAL: Exception in placeOrder. Message: ${error.message}`],
        error: `下单时发生严重服务器错误: ${error.message}`,
    };
  }
}

export async function updateOrder(
  restaurantId: string,
  orderId: string,
  updatedItems: OrderItem[],
  newTotal: number
): Promise<PlaceOrderResult> {
  try {
    if (!restaurantId) {
      return { order: null, logs: ['[SERVER] Update rejected: Missing restaurantId.'], error: '更新失败，缺少餐馆信息。' };
    }
    const { db: adminDb } = getFirebaseAdmin();
    const orderRef = adminDb.collection(RESTAURANTS_COLLECTION).doc(restaurantId).collection(ORDERS_COLLECTION).doc(orderId);

    const itemsToSave = updatedItems.map(item => JSON.parse(JSON.stringify(item)));

    await orderRef.update({
      order: itemsToSave,
      total: newTotal,
    });

    const updatedDoc = await orderRef.get();
    if (!updatedDoc.exists) {
      throw new Error('Updated document not found after update operation.');
    }
    const data = updatedDoc.data()!;
    
    let placedAtISO: string;
    const placedAtTimestamp = data.placedAt as Timestamp;

    if (placedAtTimestamp) {
        placedAtISO = placedAtTimestamp.toDate().toISOString();
    } else {
        placedAtISO = new Date().toISOString();
    }

    const updatedPlacedOrder: PlacedOrder = {
      id: updatedDoc.id,
      restaurantId: data.restaurantId,
      tableId: data.tableId,
      tableNumber: data.tableNumber,
      order: data.order,
      total: data.total,
      placedAt: placedAtISO,
    };

    return {
      order: PlacedOrderSchema.parse(updatedPlacedOrder),
      logs: [`[SERVER] Order ${orderId} updated successfully.`],
      error: null,
    };
  } catch (error: any) {
    console.error("CRITICAL: Unhandled exception in updateOrder:", error);
    return {
      order: null,
      logs: [`[SERVER] CRITICAL: Exception in updateOrder. Message: ${error.message}`],
      error: `A critical server error occurred while updating the order. Details: ${error.message}`,
    };
  }
}
