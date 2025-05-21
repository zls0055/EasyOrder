"use client";

import type { Table, OrderItem, Dish } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, MinusCircle, Trash2, ShoppingBag, Info } from 'lucide-react';

interface OrderSummaryProps {
  table: Table | undefined;
  onUpdateQuantity: (dishId: string, change: number) => void;
  onRemoveItem: (dishId: string) => void;
}

export default function OrderSummary({ table, onUpdateQuantity, onRemoveItem }: OrderSummaryProps) {
  const calculateTotal = (order: OrderItem[]): number => {
    return order.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
  };

  if (!table) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            订单概要
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Info className="h-10 w-10 mb-2" />
            <p>请选择一个餐桌以查看订单。</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = calculateTotal(table.order);

  return (
    <Card className="shadow-lg sticky top-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          {table.number} 号桌订单
        </CardTitle>
        {table.order.length === 0 && (
          <CardDescription>您的订单是空的。请从菜单添加菜品。</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {table.order.length > 0 ? (
          <div className="space-y-4">
            {table.order.map((item) => (
              <div key={item.dish.id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{item.dish.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ￥{item.dish.price.toFixed(2)} x {item.quantity} = ￥{(item.dish.price * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onUpdateQuantity(item.dish.id, -1)} aria-label={`减少 ${item.dish.name} 的数量`}>
                    <MinusCircle className="h-5 w-5" />
                  </Button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <Button variant="ghost" size="icon" onClick={() => onUpdateQuantity(item.dish.id, 1)} aria-label={`增加 ${item.dish.name} 的数量`}>
                    <PlusCircle className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => onRemoveItem(item.dish.id)} aria-label={`从订单中移除 ${item.dish.name}`}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
            <Separator className="my-4" />
            <div className="flex justify-between items-center text-xl font-bold">
              <span>总计：</span>
              <span>￥{total.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
             <Info className="h-10 w-10 mb-2" />
            <p>订单中还没有菜品。</p>
          </div>
        )}
      </CardContent>
      {table.order.length > 0 && (
        <CardFooter>
          <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            下单 (未实现)
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
