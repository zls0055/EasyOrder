
"use client";

import type { Table, OrderItem, AppSettings } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, MinusCircle, Trash2, ShoppingBag, Info, ChevronDown, ChevronUp, Loader2, DoorClosed, Ban, Armchair } from 'lucide-react';
import React, { useState } from 'react';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface OrderSummaryProps {
  table: Table | undefined;
  onUpdateQuantity: (dishId: string, change: number) => void;
  onRemoveItem: (dishId: string) => void;
  onPlaceOrder: (tableId: string) => void;
  isPlacingOrder: boolean;
  operationCode: string;
  settings: AppSettings | null;
}

export default function OrderSummary({ table, onUpdateQuantity, onRemoveItem, onPlaceOrder, isPlacingOrder, operationCode: correctOperationCode, settings }: OrderSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false);
  const [operationCodeInput, setOperationCodeInput] = useState('');
  const { toast } = useToast();

  const calculateTotal = (order: OrderItem[]): number => {
    return order.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
  };

  const handlePlaceOrderWithCodeCheck = () => {
    if (!table) return;

    if (operationCodeInput === correctOperationCode) {
      onPlaceOrder(table.id);
      setIsConfirmingOrder(false);
      setOperationCodeInput('');
      setIsExpanded(false);
    } else {
      toast({
        variant: "destructive",
        title: "操作码错误",
        description: "您输入的操作码不正确，请重试。",
      });
      setOperationCodeInput(''); // Clear the input for re-entry
    }
  };

  const handlePrimaryActionClick = () => {
    if (!table) return;
    // If no operation code is required, place the order directly.
    if (!correctOperationCode) {
      onPlaceOrder(table.id);
      setIsExpanded(false);
    } else {
      // Otherwise, open the confirmation dialog.
      setIsConfirmingOrder(true);
    }
  };

  const orderTotal = table && table.order.length > 0 ? calculateTotal(table.order) : 0;
  const itemCount = table ? table.order.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const isRestaurantClosed = settings?.isRestaurantClosed ?? false;
  const isOnlineOrderingDisabled = settings?.isOnlineOrderingDisabled ?? false;
  const isActionDisabled = isPlacingOrder || isRestaurantClosed || isOnlineOrderingDisabled;
  const isTableUnselected = !table;


  const getFloatingButtonState = () => {
    if (isTableUnselected) {
      return {
        icon: null,
        text: null,
        variant: 'default' as const,
        disabled: true,
        hidden: true,
      };
    }
    if (isRestaurantClosed) {
      return {
        icon: <DoorClosed className="h-5 w-5" />,
        text: '本店已打烊',
        variant: 'secondary' as const,
        disabled: true,
      };
    }
    if (isOnlineOrderingDisabled) {
      return {
        icon: <Ban className="h-5 w-5" />,
        text: '仅支持线下点单',
        variant: 'secondary' as const,
        disabled: true,
      };
    }
    if (isPlacingOrder) {
      return {
        icon: <ShoppingBag className="h-5 w-5" />,
        text: '下单中...',
        variant: 'accent' as const,
        disabled: true,
      };
    }
    return {
      icon: <ShoppingBag className="h-5 w-5" />,
      text: itemCount > 0 ? `${itemCount}项 - ￥${orderTotal.toFixed(2)}` : '空订单',
      variant: 'accent' as const,
      disabled: false,
    };
  };

  const buttonState = getFloatingButtonState();

  if (buttonState.hidden) {
    return null;
  }

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-20">
        <Button
          variant={buttonState.variant}
          size="default"
          className="shadow-xl rounded-lg flex items-center space-x-2"
          onClick={() => setIsExpanded(true)}
          aria-label="查看订单详情"
          disabled={buttonState.disabled}
        >
          {buttonState.icon}
          <span>{buttonState.text}</span>
          {!buttonState.disabled && <ChevronUp className="h-5 w-5" />}
        </Button>
      </div>
    );
  }

  const getCardTitle = () => {
    if (isRestaurantClosed) return '本店已打烊';
    if (isOnlineOrderingDisabled) return '线上点单已关闭';
    if (!table) return '请选择餐桌';
    
    const baseTitle = table.number === '外卖' ? '外卖订单' : `${table.number} 号桌订单`;
    return itemCount > 0 ? `${baseTitle} (${itemCount}项)` : baseTitle;
  }

  return (
    <div className="fixed bottom-4 right-4 z-20 w-full max-w-xs">
        <Card className="w-full shadow-xl rounded-lg bg-card flex flex-col max-h-[60vh]">
        <CardHeader className="flex flex-row items-center justify-between p-2">
            <div className="flex items-center gap-2">
            {isRestaurantClosed ? <DoorClosed className="h-5 w-5 text-destructive" /> : (isOnlineOrderingDisabled ? <Ban className="h-5 w-5 text-destructive" /> : (!table ? <Armchair className="h-5 w-5 text-accent" /> :<ShoppingBag className="h-5 w-5 text-primary" />) )}
            <CardTitle className="text-base font-semibold">
                {getCardTitle()}
            </CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(false)} aria-label="收起订单概要">
            <ChevronDown className="h-5 w-5" />
            </Button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-3 pt-0">
            {!table ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-4">
                <Info className="h-10 w-10 mb-2" />
                <p>请先从上方选择一个餐桌。</p>
            </div>
            ) : table.order.length > 0 ? (
            <div>
                <div className="divide-y divide-border -mx-3">
                {table.order.map((item, index) => (
                    <div key={item.dish.id} className={cn("flex items-center justify-between py-2 px-3", index % 2 === 0 && 'bg-muted/30')}>
                    <div>
                        <p className="font-semibold text-sm">{item.dish.name}</p>
                        <p className="text-xs text-muted-foreground">
                        ￥{item.dish.price.toFixed(2)} x {item.quantity} = ￥{(item.dish.price * item.quantity).toFixed(2)}
                        </p>
                    </div>
                    <div className={cn("flex items-center gap-1", isActionDisabled && "opacity-50")}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.dish.id, -1)} aria-label={`减少 ${item.dish.name} 的数量`} disabled={isActionDisabled}>
                        <MinusCircle className="h-4 w-4" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.dish.id, 1)} aria-label={`增加 ${item.dish.name} 的数量`} disabled={isActionDisabled}>
                        <PlusCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 h-7 w-7" onClick={() => onRemoveItem(item.dish.id)} aria-label={`从订单中移除 ${item.dish.name}`} disabled={isActionDisabled}>
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    </div>
                ))}
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center text-base font-bold">
                <span>总计:</span>
                <span>￥{orderTotal.toFixed(2)}</span>
                </div>
            </div>
            ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-4">
                <Info className="h-10 w-10 mb-2" />
                <p>订单中还没有菜品。</p>
                <p className="text-xs mt-1">请从菜单添加菜品。</p>
            </div>
            )}
        </CardContent>
        {table && table.order.length > 0 && (
            <CardFooter className="p-3 pt-0">
            <AlertDialog open={isConfirmingOrder} onOpenChange={setIsConfirmingOrder}>
                <Button
                size="default"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isActionDisabled}
                onClick={handlePrimaryActionClick}
                >
                {isRestaurantClosed ? '本店已打烊' : (isOnlineOrderingDisabled ? '仅支持线下点单' : (isPlacingOrder ? '下单中...' : '下单'))}
                </Button>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>请输入操作码</AlertDialogTitle>
                    <AlertDialogDescription>
                    为了防止误操作，请输入授权操作码以确认下单。
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2">
                    <Label htmlFor="op-code" className="sr-only">
                    操作码
                    </Label>
                    <Input
                    id="op-code"
                    value={operationCodeInput}
                    onChange={(e) => setOperationCodeInput(e.target.value)}
                    placeholder="请输入操作码"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isPlacingOrder && operationCodeInput) {
                        e.preventDefault();
                        handlePlaceOrderWithCodeCheck();
                        }
                    }}
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setOperationCodeInput('')}>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePlaceOrderWithCodeCheck} disabled={isPlacingOrder || !operationCodeInput}>
                    {isPlacingOrder ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        下单中...
                        </>
                    ) : (
                        '确认下单'
                    )}
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </CardFooter>
        )}
        </Card>
    </div>
  );
}
