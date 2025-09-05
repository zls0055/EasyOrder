
"use client";

import type { PlacedOrder, OrderItem, Dish, AppSettings } from '@/types';
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronLeft, ChevronRight, CheckCircle2, PlusCircle, MinusCircle, Loader2, Share2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import AddDishDialog from './add-dish-dialog';
import QRCode from 'qrcode';
import lz from 'lz-string';
import { toast as sonnerToast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { updateOrder } from '@/ai/flows/order-flow';

interface OrderDetailViewProps {
  order: PlacedOrder;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onOrderUpdate: (updatedOrder: PlacedOrder) => void;
  isFirst: boolean;
  isLast: boolean;
  isServerTab?: boolean;
  servedDishIds?: string[];
  onToggleDishStatus?: (dishId: string) => void;
  isOrderServed?: boolean;
  allDishes: Dish[];
  settings: AppSettings;
  restaurantId: string;
  addingDishId: string | null;
  setAddingDishId: (id: string | null) => void;
}

export default function OrderDetailView({ 
  order, 
  onClose, 
  onNavigate,
  onOrderUpdate, 
  isFirst, 
  isLast,
  isServerTab,
  servedDishIds = [],
  onToggleDishStatus,
  isOrderServed,
  allDishes,
  settings,
  restaurantId,
  addingDishId,
  setAddingDishId
}: OrderDetailViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateOrder = async (orderId: string, updatedItems: OrderItem[], newTotal: number) => {
    setIsUpdating(true);
    try {
      const result = await updateOrder(restaurantId, orderId, updatedItems, newTotal);
      if (result.error || !result.order) {
        throw new Error(result.error || 'Server returned a null order after update.');
      }
      sonnerToast.success('订单已更新', { description: '菜品已成功添加或修改。' });
      onOrderUpdate(result.order);
    } catch (error) {
      console.error('Failed to update order:', error);
      sonnerToast.error('更新失败', { description: `无法更新订单。 ${error instanceof Error ? error.message : ''}` });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateQuantity = (dishId: string, change: number) => {
    if (isUpdating || isOrderServed) return;
    
    let newOrderItems = order.order.map(item => {
        if (item.dish.id === dishId) return {...item, quantity: item.quantity + change}
        return item;
    }).filter(item => item.quantity > 0);
    
    const newTotal = newOrderItems.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
    handleUpdateOrder(order.id, newOrderItems, newTotal);
  };
  
  const handleAddDish = async (dishToAdd: Dish) => {
    if (isUpdating || isOrderServed || addingDishId) return;
    setAddingDishId(dishToAdd.id);

    try {
        let newOrderItems = [...order.order];
        const existingItemIndex = newOrderItems.findIndex(item => item.dish.id === dishToAdd.id);

        if (existingItemIndex > -1) {
          newOrderItems[existingItemIndex].quantity += 1;
        } else {
          newOrderItems.push({ dish: dishToAdd, quantity: 1 });
        }
        
        const newTotal = newOrderItems.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
        await handleUpdateOrder(order.id, newOrderItems, newTotal);
    } finally {
        setAddingDishId(null);
    }
  };
  
  const generateAndDrawQRCode = () => {
    const compactItems = order.order.map(item => `${item.dish.id.replace('dish-', '')}:${item.quantity}`).join(',');
    
    const payload = {
      v: 1,
      r: restaurantId, // Include restaurant ID
      t: order.tableNumber,
      p: order.placedAt,
      i: compactItems,
    };

    const compressed = lz.compressToEncodedURIComponent(JSON.stringify(payload));
    
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.set('share', compressed);
    const url = `${window.location.origin}/${restaurantId}?${currentParams.toString()}`;

    setTimeout(() => {
        if (canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, url, {
                width: 256,
                margin: 2,
                errorCorrectionLevel: 'M',
            }, function (error) { if (error) console.error("QR Code Generation Error:", error) });
        }
    }, 50);
  };

  const isActionDisabled = isUpdating || !!addingDishId || isOrderServed;

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="p-4 flex items-center justify-between gap-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full" onClick={() => onNavigate('prev')} disabled={isFirst} aria-label="上一个订单"><ChevronLeft className="h-5 w-5" /></Button>
            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full" onClick={() => onNavigate('next')} disabled={isLast} aria-label="下一个订单"><ChevronRight className="h-5 w-5" /></Button>
        </div>

        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold truncate text-accent">{order.tableNumber === '外卖' ? '外卖' : `${order.tableNumber}号桌`}</h1>
          {isOrderServed && <CheckCircle2 className="h-6 w-6 text-primary" />}
        </div>
        
        <Button variant="secondary" size="icon" onClick={onClose} className="h-10 w-10 rounded-full" aria-label="关闭账单详情"><X className="h-5 w-5" /></Button>
      </header>
      
      <ScrollArea className="flex-1">
        <div className={cn("bg-card text-card-foreground transition-colors", isOrderServed && "bg-primary/10")}>
            <div className="p-6">
                <div className="flex justify-between items-baseline mb-2">
                    <p className="text-base text-muted-foreground">{new Date(order.placedAt).toLocaleString('zh-CN')}</p>
                    <div className="text-2xl font-bold text-primary"><span>￥{order.total.toFixed(1)}</span></div>
                </div>
                <Separator className="my-4" />
                <Table>
                  <TableBody>
                    {order.order.map((item, index) => {
                      const isServed = isServerTab && servedDishIds.includes(item.dish.id);
                      return (
                      <TableRow 
                        key={`${item.dish.id}-${index}`}
                        className={cn("transition-colors", index % 2 !== 0 && 'bg-muted/30', isServerTab && onToggleDishStatus && "cursor-pointer", isServed && "bg-primary/10 hover:bg-primary/20", isActionDisabled && "opacity-60")}
                        onDoubleClick={() => { if (isServerTab && onToggleDishStatus && !isOrderServed) onToggleDishStatus(item.dish.id) }}
                      >
                        <TableCell className="font-medium py-4">
                          <p className="text-xl">{item.dish.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                              <p className="text-base text-muted-foreground">￥{item.dish.price.toFixed(1)}</p>
                              {isServerTab && (
                                <div className="flex items-center gap-1">
                                    <Button variant="secondary" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(item.dish.id, -1)}} disabled={isActionDisabled}><MinusCircle className="h-4 w-4" /></Button>
                                    <span className="w-8 text-center text-sm font-medium text-muted-foreground">x {item.quantity}</span>
                                    <Button variant="secondary" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(item.dish.id, 1)}} disabled={isActionDisabled}><PlusCircle className="h-4 w-4" /></Button>
                                </div>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xl font-semibold py-4 align-middle">￥{(item.dish.price * item.quantity).toFixed(1)}</TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
            </div>
        </div>
      </ScrollArea>
      
      {isServerTab && (
        <div className="absolute bottom-4 right-4 z-20">
            <AddDishDialog dishes={allDishes} settings={settings} onAddDish={handleAddDish} addingDishId={addingDishId}>
                <Button className="shadow-lg" size="lg" disabled={isActionDisabled}>
                {isUpdating || addingDishId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                {isOrderServed ? '订单已上齐' : '加菜'}
                </Button>
            </AddDishDialog>
        </div>
      )}

      {!isServerTab && (
        <div className="absolute bottom-4 right-4 z-20">
            <Dialog onOpenChange={(open) => { if (open) generateAndDrawQRCode() }}>
                <DialogTrigger asChild>
                    <Button className="shadow-lg" variant="outline"><Share2 className="mr-2 h-4 w-4" />分享订单</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>分享订单</DialogTitle><DialogDescription>使用另一台手机扫描此二维码，即可将此订单添加到其本地历史记录中。</DialogDescription></DialogHeader>
                    <div className="flex items-center justify-center p-4 bg-white rounded-lg"><canvas ref={canvasRef} /></div>
                </DialogContent>
            </Dialog>
        </div>
      )}
    </div>
  );
}
