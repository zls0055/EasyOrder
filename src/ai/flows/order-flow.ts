
'use server';
/**
 * @fileOverview Defines and exports server actions for managing restaurant orders.
 */
import { db } from '@/lib/firebase';
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
import { collection, addDoc, doc, getDoc, updateDoc, query, orderBy, limit, getDocs, Timestamp, runTransaction, increment } from 'firebase/firestore';

const RESTAURANTS_COLLECTION = 'restaurants';
const ORDERS_COLLECTION = 'orders';
const POINT_LOGS_COLLECTION = 'pointLogs';

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
  const { restaurantId } = input;
  if (!restaurantId) {
    return { order: null, logs: ['[SERVER] Order rejected: Missing restaurantId.'], error: '下单失败，缺少餐馆信息。' };
  }

  try {
    const restaurantRef = doc(db, RESTAURANTS_COLLECTION, restaurantId);
    
    // Correctly get the log date ID in YYYY-MM-DD format
    const logDateId = new Date().toISOString().split('T')[0];
    const pointLogRef = doc(db, RESTAURANTS_COLLECTION, restaurantId, POINT_LOGS_COLLECTION, logDateId);

    const placeOrderResult = await runTransaction(db, async (transaction) => {
      // --- ALL READS FIRST ---
      const restaurantDoc = await transaction.get(restaurantRef);
      const pointLogDoc = await transaction.get(pointLogRef); // Read point log early

      // --- VALIDATION AND LOGIC ---
      if (!restaurantDoc.exists()) {
        throw new Error("餐馆不存在。");
      }
      const restaurant = restaurantDoc.data();
      if (restaurant.points <= 0) {
        return { order: null, logs: ['[SERVER] Order rejected: Insufficient points.'], error: '点数不足，请联系管理员充值。' };
      }

      // Settings are read outside transaction, which is fine.
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
      const expireAt = new Timestamp(timestamp.seconds + 86400, timestamp.nanoseconds);

      const orderToSave = {
        ...input,
        placedAt: timestamp,
        expireAt: expireAt,
      };
      
      // --- ALL WRITES LAST ---
      const ordersCollectionRef = collection(db, RESTAURANTS_COLLECTION, restaurantId, ORDERS_COLLECTION);
      const newOrderRef = doc(ordersCollectionRef);
      
      // Write 1: Create the new order
      transaction.set(newOrderRef, orderToSave);

      // Write 2: Decrement points
      transaction.update(restaurantRef, { points: increment(-1) });

      // Write 3: Update or create the daily point log
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 90);
      const expireAtTimestamp = Timestamp.fromDate(expirationDate);

      if (pointLogDoc.exists()) {
        // If the log for today exists, increment it.
        transaction.update(pointLogRef, { 
            count: increment(1),
            expireAt: expireAtTimestamp // Also update expiration date
        });
      } else {
        // If the log for today does not exist, create it.
        transaction.set(pointLogRef, { 
            count: 1, 
            expireAt: expireAtTimestamp 
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
    
    // Revalidate caches after transaction to show updated points
    if(placeOrderResult.order) {
        revalidateTag(`restaurant-${restaurantId}`);
        revalidateTag('restaurants'); // Revalidate the list of all restaurants
        revalidateTag(`pointLogs-${restaurantId}`); // Revalidate point logs
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
    const orderRef = doc(db, RESTAURANTS_COLLECTION, restaurantId, ORDERS_COLLECTION, orderId);

    const itemsToSave = updatedItems.map(item => JSON.parse(JSON.stringify(item)));

    await updateDoc(orderRef, {
      order: itemsToSave,
      total: newTotal,
    });

    const updatedDoc = await getDoc(orderRef);
    if (!updatedDoc.exists()) {
      throw new Error('Updated document not found after update operation.');
    }
    const data = updatedDoc.data()!;
    
    let placedAtISO: string;
    const placedAtTimestamp = data.placedAt;

    if (placedAtTimestamp instanceof Timestamp) {
        placedAtISO = placedAtTimestamp.toDate().toISOString();
    } else if (typeof placedAtTimestamp === 'string') {
        placedAtISO = new Date(placedAtTimestamp).toISOString();
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
