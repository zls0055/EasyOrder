
'use client';

import type { AppSettings, Dish, PlacedOrder } from '@/types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PlacedOrderSchema } from '@/types';
import { toast as sonnerToast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from './ui/table';
import OrderDetailView from './full-screen-order';
import { CheckCircle2, Loader2, LayoutGrid, Columns } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface KitchenDisplayProps {
  allDishes: Dish[];
  settings: AppSettings;
  restaurantId: string;
}

const RESTAURANTS_COLLECTION = 'restaurants';
const ORDERS_COLLECTION = 'orders';

export default function KitchenDisplay({ allDishes, settings, restaurantId }: KitchenDisplayProps) {
  const [serverOrders, setServerOrders] = useState<PlacedOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PlacedOrder | null>(null);
  const [servedDishStatuses, setServedDishStatuses] = useState<Record<string, string[]>>({});
  const [servedOrderIds, setServedOrderIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingDishId, setAddingDishId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'columns'>('grid');

  const localServedDishKey = `servedDishStatuses-${restaurantId}`;
  const localServedOrderKey = `servedOrderIds-${restaurantId}`;

  // Load initial served statuses from localStorage
  useEffect(() => {
    try {
      const savedStatuses = localStorage.getItem(localServedDishKey);
      if (savedStatuses) setServedDishStatuses(JSON.parse(savedStatuses));
      
      const savedOrderIds = localStorage.getItem(localServedOrderKey);
      if (savedOrderIds) setServedOrderIds(JSON.parse(savedOrderIds));
    } catch (error) { console.error("Failed to load served statuses from localStorage", error); }
  }, [localServedDishKey, localServedOrderKey]);

  // Persist served dish statuses to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(localServedDishKey, JSON.stringify(servedDishStatuses));
    } catch (error) { console.error("Failed to save served dish statuses to localStorage", error); }
  }, [servedDishStatuses, localServedDishKey]);

  // Persist served order IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(localServedOrderKey, JSON.stringify(servedOrderIds));
    } catch (error) { console.error("Failed to save served order IDs to localStorage", error); }
  }, [servedOrderIds, localServedOrderKey]);

  const processAndSetOrders = useCallback((snapshot: any, source: 'push' | 'pull') => {
      const newOrders: PlacedOrder[] = [];
      snapshot.forEach((doc: any) => {
          const data = doc.data();
          let placedAtISO = new Date().toISOString(); 
          const placedAtTimestamp = data.placedAt;

          if (placedAtTimestamp instanceof Timestamp) {
              placedAtISO = placedAtTimestamp.toDate().toISOString();
          } else if (typeof placedAtTimestamp === 'string') {
              placedAtISO = new Date(placedAtTimestamp).toISOString();
          }

          const orderData = { ...data, id: doc.id, placedAt: placedAtISO };
          const parsed = PlacedOrderSchema.safeParse(orderData);
          if (parsed.success) {
              newOrders.push(parsed.data);
          } else {
              console.warn(`[${source}] Skipping invalid order document (ID: ${doc.id}):`, parsed.error);
          }
      });
      setServerOrders(newOrders);
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    let unsubscribe: (() => void) | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    const ordersQuery = query(collection(db, RESTAURANTS_COLLECTION, restaurantId, ORDERS_COLLECTION), orderBy('placedAt', 'desc'), limit(settings.syncOrderCount));

    if (settings.orderFetchMode === 'push') {
        setIsLoading(true);
        unsubscribe = onSnapshot(ordersQuery, 
            (snapshot) => {
                processAndSetOrders(snapshot, 'push');
                setIsLoading(false);
            }, 
            (error) => {
                console.error("[Push] Error fetching orders:", error);
                sonnerToast.error("订单同步失败", { description: "无法从服务器建立实时连接。" });
                setIsLoading(false);
            }
        );
    } else { // 'pull' mode
        let isMounted = true;
        const fetchServerOrders = async () => {
            if (!isMounted) return;
            try {
                const snapshot = await getDocs(ordersQuery);
                if (isMounted) processAndSetOrders(snapshot, 'pull');
            } catch (error) {
                console.error("[Pull] Error fetching orders:", error);
                sonnerToast.error("订单同步失败", { description: "无法从服务器获取订单数据。" });
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        
        setIsLoading(true);
        fetchServerOrders();
        intervalId = setInterval(fetchServerOrders, settings.orderPullIntervalSeconds * 1000);

        return () => {
            isMounted = false;
            if (intervalId) clearInterval(intervalId);
        };
    }

    return () => {
        if (unsubscribe) unsubscribe();
        if (intervalId) clearInterval(intervalId);
    };
  }, [restaurantId, settings.syncOrderCount, settings.orderFetchMode, settings.orderPullIntervalSeconds, processAndSetOrders]);

  const handleToggleOrderStatus = (orderId: string) => {
    setServedOrderIds(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  };

  const handleToggleDishStatus = (orderId: string, dishId: string) => {
    setServedDishStatuses(prev => {
        const currentServedDishes = prev[orderId] ? [...prev[orderId]] : [];
        const dishIndex = currentServedDishes.indexOf(dishId);
        if (dishIndex > -1) currentServedDishes.splice(dishIndex, 1);
        else currentServedDishes.push(dishId);
        const newStatuses = { ...prev, [orderId]: currentServedDishes };
        if (newStatuses[orderId]?.length === 0) delete newStatuses[orderId];
        return newStatuses;
    });
  };

  const handleOrderUpdate = (updatedOrder: PlacedOrder) => {
    setServerOrders(prevOrders => prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    if (selectedOrder && selectedOrder.id === updatedOrder.id) setSelectedOrder(updatedOrder);
  };
  
  const selectedOrderIndex = selectedOrder ? serverOrders.findIndex((o) => o.id === selectedOrder.id) : -1;

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (selectedOrderIndex === -1) return;
    const newIndex = direction === 'prev' ? selectedOrderIndex - 1 : selectedOrderIndex + 1;
    if (newIndex >= 0 && newIndex < serverOrders.length) setSelectedOrder(serverOrders[newIndex]);
  };

  if (selectedOrder) {
      return (
        <OrderDetailView 
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onNavigate={handleNavigate}
            onOrderUpdate={handleOrderUpdate}
            isFirst={selectedOrderIndex === 0}
            isLast={selectedOrderIndex === serverOrders.length - 1}
            isServerTab={true}
            servedDishIds={servedDishStatuses[selectedOrder.id] || []}
            onToggleDishStatus={(dishId) => handleToggleDishStatus(selectedOrder.id, dishId)}
            isOrderServed={servedOrderIds.includes(selectedOrder.id)}
            allDishes={allDishes}
            settings={settings}
            restaurantId={restaurantId}
            addingDishId={addingDishId}
            setAddingDishId={setAddingDishId}
        />
      )
  }

  return (
    <div className="flex flex-col h-full bg-muted/40">
        <header className="p-4 flex justify-center items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b">
            <h1 className="text-xl font-bold">厨房看板</h1>
            {settings.showKitchenLayoutSwitch && (
              <div className="absolute right-4">
                  <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setLayoutMode(prev => prev === 'grid' ? 'columns' : 'grid')}>
                                  {layoutMode === 'grid' ? <Columns className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>切换到{layoutMode === 'grid' ? '瀑布流' : '网格'}布局</p>
                          </TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
              </div>
            )}
        </header>
        <ScrollArea className="flex-1">
            <div className="p-2">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-muted-foreground">
                    <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin" />
                    <p>正在获取订单...</p>
                </div>
            ) : serverOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-muted-foreground">
                     <p>等待新订单...</p>
                </div>
            ) : (
                <div className={cn(
                    "gap-4",
                    layoutMode === 'grid' 
                        ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                        : "columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5"
                )}>
                    {serverOrders.map((pOrder) => {
                        const isServed = servedOrderIds.includes(pOrder.id);
                        const totalQuantity = pOrder.order.reduce((sum, item) => sum + item.quantity, 0);

                        return (
                        <div key={pOrder.id} className={cn(
                            "rounded-lg border bg-card text-card-foreground shadow-sm transition-all flex flex-col mb-4 break-inside-avoid-column",
                            isServed && "bg-primary/10"
                        )}>
                             <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <button
                                        onClick={() => setSelectedOrder(pOrder)}
                                        className="text-left hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md -m-1 p-1 flex-1 min-w-0"
                                        aria-label={ pOrder.tableNumber === '外卖' ? '查看外卖账单详情' : `查看${pOrder.tableNumber}号桌的详细账单`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-2xl text-accent truncate">
                                                {pOrder.tableNumber === '外卖' ? '外卖' : `${pOrder.tableNumber}号桌`}
                                            </p>
                                            {isServed && <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(pOrder.placedAt).toLocaleString('zh-CN')}
                                        </p>
                                    </button>
                                    <div className="text-right pt-1 ml-4 shrink-0">
                                        <p className="text-xl font-bold text-primary">￥{pOrder.total.toFixed(2)}</p>
                                        <p className="text-xs text-muted-foreground">(共 {totalQuantity} 件)</p>
                                    </div>
                                </div>
                                <Separator />
                            </div>
                            <div className="flex-1 px-4">
                                <Table className="text-sm">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[30px] px-2">#</TableHead>
                                        <TableHead className="w-[50%] px-2">菜品</TableHead>
                                        <TableHead className="px-2">单价</TableHead>
                                        <TableHead className="text-right px-2">数量</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pOrder.order.map((item, index) => (
                                        <TableRow key={item.dish.id} className={cn(index % 2 !== 0 && 'bg-muted/30')}>
                                            <TableCell className="px-2 py-1 text-muted-foreground">{index + 1}</TableCell>
                                            <TableCell className="truncate py-1 px-2">{item.dish.name}</TableCell>
                                            <TableCell className="py-1 px-2 text-muted-foreground">￥{item.dish.price.toFixed(2)}</TableCell>
                                            <TableCell className="py-1 px-2 text-right text-muted-foreground">x {item.quantity}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                </Table>
                            </div>
                            <div className="p-4 mt-auto flex justify-end">
                                <Button variant={isServed ? 'secondary' : 'default'} size="sm" onClick={() => handleToggleOrderStatus(pOrder.id)}>
                                    {isServed ? '取消标记' : '标记为已上齐'}
                                </Button>
                            </div>
                        </div>
                    )})}
                </div>
            )}
            </div>
        </ScrollArea>
    </div>
  );
}
