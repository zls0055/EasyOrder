
"use client";

import type { PlacedOrder } from '@/types';
import { useState, useEffect } from 'react';
import { getPlacedOrders } from '@/ai/flows/order-flow';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from '@/components/ui/separator';
import { Trash2, History, Server, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface PlacedOrdersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Reusable component to render a list of orders
const OrderList = ({ orders, emptyMessage }: { orders: PlacedOrder[], emptyMessage: string }) => {
    if (orders.length === 0) {
        return <p className="text-center text-muted-foreground py-6">{emptyMessage}</p>;
    }
    return (
        <div className="space-y-4">
            {orders.map((pOrder) => (
                <div key={pOrder.id} className="p-4 rounded-lg border bg-card text-card-foreground">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <p className="font-bold text-lg">{pOrder.tableNumber}号桌</p>
                            <p className="text-xs text-muted-foreground">
                                {new Date(pOrder.placedAt).toLocaleString('zh-CN')}
                            </p>
                        </div>
                        <p className="text-xl font-bold text-primary">￥{pOrder.total.toFixed(2)}</p>
                    </div>
                    <Separator />
                    <ul className="mt-3 space-y-2 text-sm">
                        {pOrder.order.map(item => (
                            <li key={item.dish.id} className="flex justify-between">
                                <span>{item.dish.name}</span>
                                <span className="text-muted-foreground">x {item.quantity}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};

export default function PlacedOrdersSheet({ open, onOpenChange }: PlacedOrdersSheetProps) {
  const [localOrders, setLocalOrders] = useState<PlacedOrder[]>([]);
  const [serverOrders, setServerOrders] = useState<PlacedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      try {
        const savedOrdersRaw = localStorage.getItem('placedOrders');
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
        toast({
            variant: "destructive",
            title: "加载本地历史失败",
            description: "无法从本地存储中读取订单数据。",
        });
      }
      // Reset server orders when sheet is opened
      setServerOrders([]);
    }
  }, [open, toast]);

  const handleClearLocalHistory = () => {
    try {
      localStorage.removeItem('placedOrders');
      setLocalOrders([]);
      toast({
        title: "本地历史已清除",
        description: "所有保存在浏览器中的历史记录已被删除。",
      });
    } catch (error) {
        console.error("Failed to clear localStorage", error);
        toast({
            variant: "destructive",
            title: "清除本地历史失败",
            description: "无法清除本地存储中的历史记录。",
        });
    }
  };

  const handleFetchServerOrders = async () => {
    setIsLoading(true);
    try {
        const orders = await getPlacedOrders();
        setServerOrders(orders); // The flow already sorts them
        if (orders.length === 0) {
            toast({
                title: "服务器无记录",
                description: "目前服务器上没有历史订单。",
            });
        }
    } catch (error) {
        console.error("Failed to fetch orders from server", error);
        toast({
            variant: "destructive",
            title: "获取服务器订单失败",
            description: "无法从服务器加载订单数据，请稍后重试。",
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-6 w-6" />
            已下单历史
          </SheetTitle>
          <SheetDescription className="flex items-center justify-between gap-4 pt-2">
            <span>本地和服务器的订单历史记录。</span>
            <Button size="sm" onClick={handleFetchServerOrders} disabled={isLoading}>
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Server className="mr-2 h-4 w-4" />
                )}
                同步服务器订单
            </Button>
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-8 py-4">
              {/* Server Orders Section */}
              {serverOrders.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-3 pb-2 border-b">服务器订单</h3>
                    <OrderList orders={serverOrders} emptyMessage="服务器上没有历史订单。" />
                </div>
              )}

              {/* Local Orders Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 pb-2 border-b">本地历史 (此设备)</h3>
                <OrderList orders={localOrders} emptyMessage="此设备上没有历史订单记录。" />
              </div>

          </div>
        </ScrollArea>
        {localOrders.length > 0 && (
            <SheetFooter>
                <Button variant="destructive" onClick={handleClearLocalHistory}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  清除本地历史
                </Button>
            </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
