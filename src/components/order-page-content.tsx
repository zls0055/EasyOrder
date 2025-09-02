
"use client";

import type { Dish, Table, OrderItem, PlacedOrder, PlaceOrderResult, AppSettings } from '@/types';
import Menu from '@/components/menu';
import OrderSummary from '@/components/order-summary';
import { toast as sonnerToast } from "sonner";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PlacedOrdersSheet from '@/components/placed-orders-sheet';
import { placeOrder } from '@/ai/flows/order-flow';
import lz from 'lz-string';
import { Loader2 } from 'lucide-react';

const generateTables = (count: number): Table[] => {
  const tables = Array.from({ length: count }, (_, i) => ({
    id: `table-${i + 1}`,
    number: (i + 1).toString(),
    order: [],
  }));
  tables.push({ id: 'table-takeout', number: '外卖', order: [] });
  return tables;
};


interface OrderPageContentProps {
  initialDishes: Dish[];
  initialSettings: AppSettings;
  restaurantId: string;
}

export default function OrderPageContent({ initialDishes, initialSettings, restaurantId }: OrderPageContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [dishes] = useState<Dish[]>(initialDishes);
  const [settings] = useState<AppSettings>(initialSettings);
  const [tables, setTables] = useState<Table[]>(() => generateTables(initialSettings.tableCount));
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isTableLocked, setIsTableLocked] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [addingDishId, setAddingDishId] = useState<string | null>(null);
  const [justAddedDishId, setJustAddedDishId] = useState<string | null>(null);
  const [recentDishes, setRecentDishes] = useState<Dish[]>([]);
  
  const localPlacedOrdersKey = `placedOrders-${restaurantId}`;
  
  const allTables = useMemo(() => generateTables(settings.tableCount), [settings.tableCount]);

  const updateRecentDishes = useCallback(() => {
    try {
      const savedOrdersRaw = localStorage.getItem(localPlacedOrdersKey);
      if (savedOrdersRaw) {
        const orders: PlacedOrder[] = JSON.parse(savedOrdersRaw);
        const allOrderedDishes = orders.flatMap(order => (order && Array.isArray(order.order)) ? order.order.map(item => item.dish) : []);
        const uniqueDishesMap = new Map<string, Dish>();
        allOrderedDishes.forEach(dish => { if(dish && dish.id) uniqueDishesMap.set(dish.id, dish) });
        setRecentDishes(Array.from(uniqueDishesMap.values()));
      } else {
        setRecentDishes([]);
      }
    } catch (error) {
      console.error("Failed to load recent dishes from localStorage", error);
      setRecentDishes([]);
    }
  }, [localPlacedOrdersKey]);

  const handleSharedOrder = useCallback((data: string) => {
    try {
      const decompressed = lz.decompressFromEncodedURIComponent(data);
      if (!decompressed) throw new Error('Decompression failed');
      const payload = JSON.parse(decompressed);

      if (payload.v !== 1 || payload.r !== restaurantId) throw new Error('Unsupported or mismatched share version');
      
      const items: OrderItem[] = payload.i.split(',').map((itemStr: string) => {
          const [id, qty] = itemStr.split(':');
          const dish = dishes.find(d => d.id === `dish-${id}`);
          if (!dish) return null;
          return { dish, quantity: parseInt(qty, 10) };
        }).filter((item: OrderItem | null): item is OrderItem => item !== null);

      if (items.length === 0) throw new Error('No valid items found');

      const total = items.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
      const table = allTables.find(t => t.number === payload.t);
      if (!table) throw new Error('Invalid table number');

      const newOrder: PlacedOrder = {
        id: `local-share-${Date.now()}`,
        restaurantId: payload.r,
        placedAt: payload.p,
        tableNumber: payload.t,
        tableId: table.id,
        order: items,
        total,
      };

      const existingOrdersRaw = localStorage.getItem(localPlacedOrdersKey);
      const existingOrders: PlacedOrder[] = existingOrdersRaw ? JSON.parse(existingOrdersRaw) : [];
      const isDuplicate = existingOrders.some(o => o.placedAt === newOrder.placedAt && o.tableNumber === newOrder.tableNumber);

      if (!isDuplicate) {
        const updatedOrders = [...existingOrders, newOrder];
        localStorage.setItem(localPlacedOrdersKey, JSON.stringify(updatedOrders));
        sonnerToast("订单已导入", { description: `来自 ${newOrder.tableNumber === '外卖' ? '外卖' : newOrder.tableNumber + '号桌'} 的分享订单已成功添加到本地历史。`});
        updateRecentDishes();
        setIsHistoryVisible(true);
      } else {
        sonnerToast("订单已存在", { description: "这个分享的订单已经在您的本地历史中了。" });
      }

    } catch (error) {
      console.error("Failed to process shared order:", error);
      sonnerToast.error("导入订单失败", { description: `无法解析分享的订单链接。${error instanceof Error ? error.message : ''}`});
    }
  }, [restaurantId, dishes, localPlacedOrdersKey, updateRecentDishes, allTables]);
  
  useEffect(() => {
    updateRecentDishes();
  }, [updateRecentDishes]);

  useEffect(() => {
    const tableNumberFromUrl = searchParams.get('table_no');
    if (tableNumberFromUrl) {
      const tableToSelect = allTables.find(t => t.number === tableNumberFromUrl);
      if (tableToSelect) {
        setSelectedTableId(tableToSelect.id);
        setIsTableLocked(true);
      }
    }

    const shareData = searchParams.get('share');
    if (shareData && dishes.length > 0) {
        handleSharedOrder(shareData);
        router.replace(`/${restaurantId}`, { scroll: false });
    }
  }, [searchParams, dishes, restaurantId, router, handleSharedOrder, allTables]);

  useEffect(() => {
    if (justAddedDishId) {
      const timer = setTimeout(() => setJustAddedDishId(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [justAddedDishId]);

  const handleSelectTable = (tableId: string) => {
    if (isTableLocked) {
        sonnerToast("餐桌已锁定", { description: "通过URL指定餐桌后，无法在此页面更改。" });
        return;
    }
    setSelectedTableId(tableId);
  };

  const handleAddDishToOrder = async (dishToAdd: Dish) => {
    if (!selectedTableId) {
      sonnerToast.error("未选择餐桌", { description: "请先选择餐桌再添加菜品。" });
      return;
    }
    if (settings?.isRestaurantClosed) {
      sonnerToast.error("店铺已打烊", { description: "抱歉，本店已打烊，无法添加菜品。" });
      return;
    }
    if (addingDishId) return;
    setAddingDishId(dishToAdd.id);
    try {
        await new Promise(resolve => setTimeout(resolve, 250));
        setTables(prevTables => prevTables.map(table => {
            if (table.id === selectedTableId) {
              const existingItemIndex = table.order.findIndex(item => item.dish.id === dishToAdd.id);
              let updatedOrder: OrderItem[];
              if (existingItemIndex > -1) {
                updatedOrder = table.order.map((item, index) => index === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item);
              } else {
                updatedOrder = [...table.order, { dish: dishToAdd, quantity: 1 }];
              }
              return { ...table, order: updatedOrder };
            }
            return table;
          })
        );
        setJustAddedDishId(dishToAdd.id);
    } finally {
        setAddingDishId(null);
    }
  };

  const handleUpdateOrderItemQuantity = (dishId: string, change: number) => {
    if (!selectedTableId) return;
    setTables(prevTables => prevTables.map(table => {
        if (table.id === selectedTableId) {
          const updatedOrder = table.order.map(item => {
              if (item.dish.id === dishId) {
                const newQuantity = item.quantity + change;
                return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
              }
              return item;
            }).filter(Boolean) as OrderItem[];
          return { ...table, order: updatedOrder };
        }
        return table;
      })
    );
  };

  const handleRemoveOrderItem = (dishId: string) => {
    if (!selectedTableId) return;
    setTables(prevTables => prevTables.map(table => {
        if (table.id === selectedTableId) {
          const updatedOrder = table.order.filter(item => item.dish.id !== dishId);
          return { ...table, order: updatedOrder };
        }
        return table;
      })
    );
  };

  const calculateTotal = (order: OrderItem[]): number => {
    return order.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
  };

  const handlePlaceOrder = async (tableId: string) => {
    const tableToUpdate = tables.find(t => t.id === tableId);
    if (!tableToUpdate || tableToUpdate.order.length === 0) {
      sonnerToast.error("下单失败", { description: "订单为空，无法下单。" });
      return;
    }
    setIsPlacingOrder(true);

    const orderPayload = {
      restaurantId: restaurantId,
      tableId: tableToUpdate.id,
      tableNumber: tableToUpdate.number,
      order: tableToUpdate.order,
      total: calculateTotal(tableToUpdate.order),
    };

    try {
      const result: PlaceOrderResult = await placeOrder(orderPayload);
      if (result.error || !result.order) {
        sonnerToast.error("下单失败", { description: result.error || "服务器返回未知错误。" });
        return;
      }
      let localSaveSuccess = true;
      try {
        const existingOrdersRaw = localStorage.getItem(localPlacedOrdersKey);
        const existingOrders: PlacedOrder[] = existingOrdersRaw ? JSON.parse(existingOrdersRaw) : [];
        const updatedOrders = [...existingOrders, result.order];
        localStorage.setItem(localPlacedOrdersKey, JSON.stringify(updatedOrders));
      } catch (localError) {
        localSaveSuccess = false;
        console.error("Failed to save order to localStorage:", localError);
      }
      setTables(prevTables => prevTables.map(table => table.id === tableId ? { ...table, order: [] } : table));
      if (localSaveSuccess) {
        sonnerToast("下单成功", { description: `${tableToUpdate.number === '外卖' ? '外卖' : tableToUpdate.number + '号桌'}的订单已成功提交。` });
      } else {
        sonnerToast.error("下单成功，但本地保存失败", { description: "订单已提交，但未能保存到此设备的本地历史。" });
      }
      updateRecentDishes();
    } catch (serverError) {
      console.error("Failed to place order on server:", serverError);
      try {
        const localOrder: PlacedOrder = {
          ...orderPayload,
          id: `local-${Date.now()}`,
          placedAt: new Date().toISOString(),
        };
        const existingOrdersRaw = localStorage.getItem(localPlacedOrdersKey);
        const existingOrders: PlacedOrder[] = existingOrdersRaw ? JSON.parse(existingOrdersRaw) : [];
        const updatedOrders = [...existingOrders, localOrder];
        localStorage.setItem(localPlacedOrdersKey, JSON.stringify(updatedOrders));
        setTables(prevTables => prevTables.map(table => table.id === tableId ? { ...table, order: [] } : table));
        sonnerToast.warning("订单已本地保存", { description: `服务器连接失败。订单已保存在此设备上，请在“本地历史”中查看。` });
        updateRecentDishes();
      } catch (localError) {
        console.error("CRITICAL: Failed to save to server AND localStorage:", localError);
        sonnerToast.error("下单完全失败", { description: `无法连接服务器也无法保存到本地。请刷新页面重试。` });
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const selectedTableDetails = tables.find(table => table.id === selectedTableId);

  return (
    <div className='flex flex-col min-h-screen'>
      {isPlacingOrder && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-xl flex items-center gap-4 border">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-lg font-medium text-foreground">正在下单，请稍候...</span>
          </div>
        </div>
      )}

      <Menu
        dishes={dishes}
        settings={settings}
        onAddDish={handleAddDishToOrder}
        isTableSelected={!!selectedTableId}
        tables={allTables}
        selectedTableId={selectedTableId}
        onSelectTable={handleSelectTable}
        onShowHistory={() => setIsHistoryVisible(true)}
        justAddedDishId={justAddedDishId}
        addingDishId={addingDishId}
        isTableLocked={isTableLocked}
        orderItems={selectedTableDetails?.order || []}
        recentDishes={recentDishes}
      />
      
      {dishes.length > 0 && (
        <OrderSummary
          table={selectedTableDetails}
          onUpdateQuantity={handleUpdateOrderItemQuantity}
          onRemoveItem={handleRemoveOrderItem}
          onPlaceOrder={handlePlaceOrder}
          isPlacingOrder={isPlacingOrder}
          operationCode={settings.placeOrderOpCode}
          settings={settings}
        />
      )}

      <PlacedOrdersSheet 
        open={isHistoryVisible} 
        onOpenChange={setIsHistoryVisible}
        viewMode="customer"
        allDishes={dishes}
        settings={settings}
        restaurantId={restaurantId}
        onHistoryCleared={updateRecentDishes}
      />
    </div>
  );
}

    