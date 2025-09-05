
"use client";

import type { PlacedOrder, Dish, AppSettings } from '@/types';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from '@/components/ui/separator';
import { Trash2 } from 'lucide-react';
import { toast as sonnerToast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableRow } from './ui/table';
import OrderDetailView from './full-screen-order';
import { cn } from '@/lib/utils';

export interface PlacedOrdersSheetContentProps {
  viewMode: 'customer' | 'kitchen';
  allDishes: Dish[];
  settings: AppSettings;
  restaurantId: string;
  onClose?: () => void;
  onSelectedOrderChange?: (order: PlacedOrder | null) => void;
  onHistoryCleared?: () => void;
}

const OrderList = ({ orders, emptyMessage, onOrderSelect }: { 
    orders: PlacedOrder[], 
    emptyMessage: string, 
    onOrderSelect: (order: PlacedOrder) => void,
}) => {
    if (orders.length === 0) {
        return <p className="text-center text-muted-foreground py-6">{emptyMessage}</p>;
    }
    return (
        <div className="space-y-4">
            {orders.map((pOrder) => (
                <div key={pOrder.id} className="p-4 rounded-lg border bg-card text-card-foreground transition-all">
                    <div className="flex justify-between items-start mb-3">
                        <button
                            onClick={() => onOrderSelect(pOrder)}
                            className="text-left hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md -m-1 p-1"
                            aria-label={ pOrder.tableNumber === '外卖' ? '查看外卖账单详情' : `查看${pOrder.tableNumber}号桌的详细账单`}
                        >
                            <p className="font-bold text-xl text-accent">
                                {pOrder.tableNumber === '外卖' ? '外卖' : `${pOrder.tableNumber}号桌`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {new Date(pOrder.placedAt).toLocaleString('zh-CN')}
                            </p>
                        </button>
                        <p className="text-xl font-bold text-primary pt-1">￥{pOrder.total.toFixed(1)}</p>
                    </div>
                    <Separator />
                    <div className="mt-3">
                        <Table className="text-sm">
                        <TableBody>
                            {pOrder.order.map((item, index) => (
                                <TableRow key={item.dish.id} className={cn(index % 2 !== 0 && 'bg-muted/30')}>
                                    <TableCell className="w-[50%] truncate py-1 px-2">{item.dish.name}</TableCell>
                                    <TableCell className="py-1 px-2 text-muted-foreground">￥{item.dish.price.toFixed(1)}</TableCell>
                                    <TableCell className="py-1 px-2 text-right text-muted-foreground">x {item.quantity}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default function PlacedOrdersSheetContent({ viewMode, allDishes, settings, restaurantId, onClose, onSelectedOrderChange, onHistoryCleared }: PlacedOrdersSheetContentProps) {
  const [localOrders, setLocalOrders] = useState<PlacedOrder[]>([]);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PlacedOrder | null>(null);
  const [addingDishId, setAddingDishId] = useState<string | null>(null);

  const localPlacedOrdersKey = `placedOrders-${restaurantId}`;

  const handleSetSelectedOrder = (order: PlacedOrder | null) => {
    setSelectedOrder(order);
    if(onSelectedOrderChange) onSelectedOrderChange(order);
  }

  useEffect(() => {
    try {
      const savedOrdersRaw = localStorage.getItem(localPlacedOrdersKey);
      if (savedOrdersRaw) {
        const orders: PlacedOrder[] = JSON.parse(savedOrdersRaw);
        orders.sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
        setLocalOrders(orders);
      } else {
        setLocalOrders([]);
      }
    } catch (error) {
      console.error("Failed to load orders from localStorage", error);
      setLocalOrders([]);
      sonnerToast.error("加载本地历史失败", { description: "无法从本地存储中读取订单数据。" });
    }
  }, [localPlacedOrdersKey]);
  
  const handleClearLocalHistory = () => {
    try {
      localStorage.removeItem(localPlacedOrdersKey);
      setLocalOrders([]);
      if (onHistoryCleared) onHistoryCleared();
      sonnerToast.success("本地历史已清除");
    } catch (error) {
        console.error("Failed to clear localStorage", error);
        sonnerToast.error("清除本地历史失败");
    }
    setIsClearConfirmOpen(false);
  };

  const handleOrderUpdate = (updatedOrder: PlacedOrder) => {
    // This function is for server-side updates, which are not handled here anymore.
    // We can keep it in case local history editing is added in the future.
  };
  
  const selectedOrderIndex = selectedOrder ? localOrders.findIndex((o) => o.id === selectedOrder.id) : -1;

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (selectedOrderIndex === -1) return;
    const newIndex = direction === 'prev' ? selectedOrderIndex - 1 : selectedOrderIndex + 1;
    if (newIndex >= 0 && newIndex < localOrders.length) handleSetSelectedOrder(localOrders[newIndex]);
  };

  if (selectedOrder) {
      return (
        <OrderDetailView 
            order={selectedOrder}
            onClose={() => handleSetSelectedOrder(null)}
            onNavigate={handleNavigate}
            onOrderUpdate={handleOrderUpdate}
            isFirst={selectedOrderIndex === 0}
            isLast={selectedOrderIndex === localOrders.length - 1}
            isServerTab={false}
            allDishes={allDishes}
            settings={settings}
            restaurantId={restaurantId}
            addingDishId={addingDishId}
            setAddingDishId={setAddingDishId}
        />
      )
  }

  return (
    <>
      <div className="p-4 border-b flex justify-center items-center gap-2 sticky top-0 bg-background z-10">
          <h2 className="text-lg font-semibold">本地订单历史 (此设备)</h2>
      </div>
      <ScrollArea className="flex-1">
          <div className="p-2 pb-24">
              <OrderList 
                  orders={localOrders} 
                  emptyMessage="此设备上没有历史订单记录。"
                  onOrderSelect={handleSetSelectedOrder} 
              />
          </div>
      </ScrollArea>
        
      {localOrders.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10">
          <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" className="shadow-lg"><Trash2 className="mr-2 h-4 w-4" />清除本地历史</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>您确定要清除本地历史吗？</AlertDialogTitle><AlertDialogDescription>此操作将永久删除此设备上保存的所有订单历史记录，该操作无法撤销。</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={handleClearLocalHistory}>确认清除</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </>
  );
}
