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
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Info className="h-10 w-10 mb-2" />
            <p>Please select a table to view the order.</p>
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
          Order for Table {table.number}
        </CardTitle>
        {table.order.length === 0 && (
          <CardDescription>Your order is empty. Add items from the menu.</CardDescription>
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
                    ${item.dish.price.toFixed(2)} x {item.quantity} = ${(item.dish.price * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onUpdateQuantity(item.dish.id, -1)} aria-label={`Decrease quantity of ${item.dish.name}`}>
                    <MinusCircle className="h-5 w-5" />
                  </Button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <Button variant="ghost" size="icon" onClick={() => onUpdateQuantity(item.dish.id, 1)} aria-label={`Increase quantity of ${item.dish.name}`}>
                    <PlusCircle className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => onRemoveItem(item.dish.id)} aria-label={`Remove ${item.dish.name} from order`}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
            <Separator className="my-4" />
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
             <Info className="h-10 w-10 mb-2" />
            <p>No items in order yet.</p>
          </div>
        )}
      </CardContent>
      {table.order.length > 0 && (
        <CardFooter>
          <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            Place Order (Not Implemented)
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
