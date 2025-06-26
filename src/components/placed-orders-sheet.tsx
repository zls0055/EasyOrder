
"use client";

import type { PlacedOrder } from '@/types';
import { useState, useEffect } from 'react';
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
import { Trash2, History } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface PlacedOrdersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PlacedOrdersSheet({ open, onOpenChange }: PlacedOrdersSheetProps) {
  const [placedOrders, setPlacedOrders] = useState<PlacedOrder[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      try {
        const savedOrdersRaw = localStorage.getItem('placedOrders');
        if (savedOrdersRaw) {
          const orders: PlacedOrder[] = JSON.parse(savedOrdersRaw);
          orders.sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
          setPlacedOrders(orders);
        } else {
          setPlacedOrders([]);
        }
      } catch (error) {
        console.error("Failed to load orders from localStorage", error);
        setPlacedOrders([]);
        toast({
            variant: "destructive",
            title: "加载历史订单失败",
            description: "无法从本地存储中读取订单数据。",
        });
      }
    }
  }, [open, toast]);

  const handleClearHistory = () => {
    try {
      localStorage.removeItem('placedOrders');
      setPlacedOrders([]);
      toast({
        title: "历史记录已清除",
        description: "所有已下单的历史记录已被删除。",
      });
    } catch (error) {
        console.error("Failed to clear localStorage", error);
        toast({
            variant: "destructive",
            title: "清除历史失败",
            description: "无法清除本地存储中的历史记录。",
        });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-6 w-6" />
            已下单历史
          </SheetTitle>
          <SheetDescription>
            这里显示了所有已成功下单的记录。此数据仅保存在您的浏览器中。
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {placedOrders.length > 0 ? (
              placedOrders.map((pOrder) => (
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
              ))
            ) : (
              <div className="text-center text-muted-foreground py-10">
                <p>没有历史订单记录。</p>
              </div>
            )}
          </div>
        </ScrollArea>
        {placedOrders.length > 0 && (
            <SheetFooter>
                <Button variant="destructive" onClick={handleClearHistory}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  清除所有历史记录
                </Button>
            </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
