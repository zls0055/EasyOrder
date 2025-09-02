
"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "./ui/button";
import PlacedOrdersSheetContent, { PlacedOrdersSheetContentProps } from './placed-orders-sheet-content';
import { X } from "lucide-react";
import { useState } from "react";
import type { PlacedOrder } from "@/types";

interface PlacedOrdersSheetProps extends Omit<PlacedOrdersSheetContentProps, 'onSelectedOrderChange' | 'onClose'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHistoryCleared?: () => void;
}

export default function PlacedOrdersSheet({ open, onOpenChange, ...props }: PlacedOrdersSheetProps) {
  const [selectedOrder, setSelectedOrder] = useState<PlacedOrder | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedOrder(null);
    }
    onOpenChange(isOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-lg p-0">
         <SheetHeader className="sr-only">
           <SheetTitle>已下单历史</SheetTitle>
           <SheetDescription>查看本地存储的历史订单。</SheetDescription>
         </SheetHeader>
         
         {!selectedOrder && (
            <SheetClose asChild>
                <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-8 w-8 rounded-full z-50">
                  <X className="h-4 w-4" />
                  <span className="sr-only">关闭</span>
                </Button>
            </SheetClose>
         )}

         <PlacedOrdersSheetContent 
            {...props} 
            onClose={() => handleOpenChange(false)} 
            onSelectedOrderChange={setSelectedOrder}
         />
      </SheetContent>
    </Sheet>
  );
}
