"use client";

import type { Table, OrderItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, MinusCircle, Trash2, ShoppingBag, Info, ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState } from 'react';

interface OrderSummaryProps {
  table: Table | undefined;
  onUpdateQuantity: (dishId: string, change: number) => void;
  onRemoveItem: (dishId: string) => void;
  onPlaceOrder: (tableId: string) => void;
}

export default function OrderSummary({ table, onUpdateQuantity, onRemoveItem, onPlaceOrder }: OrderSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const calculateTotal = (order: OrderItem[]): number => {
    return order.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
  };

  const handlePlaceOrderClick = () => {
    if (table) {
      onPlaceOrder(table.id);
      setIsExpanded(false);
    }
  };

  const orderTotal = table && table.order.length > 0 ? calculateTotal(table.order) : 0;
  const itemCount = table ? table.order.reduce((sum, item) => sum + item.quantity, 0) : 0;

  if (!isExpanded) {
    return (
      <Button
        variant="accent"
        size="default"
        className="fixed bottom-6 right-4 z-50 shadow-xl rounded-lg flex items-center space-x-2"
        onClick={() => setIsExpanded(true)}
        aria-label="查看订单详情"
      >
        <ShoppingBag className="h-5 w-5" />
        {table ? (
          <span>
            {table.number}号桌: {itemCount > 0 ? `${itemCount}项 - ￥${orderTotal.toFixed(2)}` : "空订单"}
          </span>
        ) : (
          <span>查看订单</span>
        )}
        <ChevronUp className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-4 z-50 w-full max-w-xs shadow-xl rounded-lg bg-card flex flex-col max-h-[70vh]">
      <CardHeader className="flex flex-row items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">
            {table ? `${table.number} 号桌订单` : "订单概要"}
          </CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(false)} aria-label="收起订单概要">
          <ChevronDown className="h-5 w-5" />
        </Button>
      </CardHeader>
      {table && table.order.length === 0 && !isExpanded && (
         <CardDescription className="px-3 pb-2 text-sm">您的订单是空的。请从菜单添加菜品。</CardDescription>
      )}
      {!table && !isExpanded && (
          <CardDescription className="px-3 pb-2 text-sm">请选择一个餐桌以查看订单。</CardDescription>
      )}
      
      <CardContent className="flex-1 overflow-y-auto p-3 pt-0">
        {!table ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
            <Info className="h-10 w-10 mb-2" />
            <p>请选择一个餐桌以查看订单。</p>
          </div>
        ) : table.order.length > 0 ? (
          <div className="space-y-2">
            {table.order.map((item) => (
              <div key={item.dish.id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{item.dish.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ￥{item.dish.price.toFixed(2)} x {item.quantity} = ￥{(item.dish.price * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.dish.id, -1)} aria-label={`减少 ${item.dish.name} 的数量`}>
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.dish.id, 1)} aria-label={`增加 ${item.dish.name} 的数量`}>
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 h-7 w-7" onClick={() => onRemoveItem(item.dish.id)} aria-label={`从订单中移除 ${item.dish.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between items-center text-base font-bold">
              <span>总计：</span>
              <span>￥{orderTotal.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
             <Info className="h-10 w-10 mb-2" />
            <p>订单中还没有菜品。</p>
            <p className="text-xs mt-1">请从菜单添加菜品。</p>
          </div>
        )}
      </CardContent>
      {table && table.order.length > 0 && (
        <CardFooter className="p-3 pt-0">
          <Button
            size="default"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handlePlaceOrderClick}
          >
            下单
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
