"use client";

import type { Dish, Table, OrderItem } from '@/types';
import { initialDishes, initialTables } from '@/lib/data';
import TableSelector from '@/components/table-selector';
import Menu from '@/components/menu';
import OrderSummary from '@/components/order-summary';
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from 'react';
import { Utensils } from 'lucide-react';

export default function HomePage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // In a real app, this data would be fetched from an API
    setDishes(initialDishes);
    setTables(initialTables);
  }, []);

  const handleSelectTable = (tableId: string) => {
    setSelectedTableId(tableId);
    toast({
      title: "Table Selected",
      description: `You are now ordering for Table ${tables.find(t => t.id === tableId)?.number}.`,
    });
  };

  const handleAddDishToOrder = (dishToAdd: Dish) => {
    if (!selectedTableId) {
      toast({
        variant: "destructive",
        title: "No Table Selected",
        description: "Please select a table before adding items to the order.",
      });
      return;
    }

    setTables(prevTables =>
      prevTables.map(table => {
        if (table.id === selectedTableId) {
          const existingItemIndex = table.order.findIndex(item => item.dish.id === dishToAdd.id);
          let updatedOrder: OrderItem[];

          if (existingItemIndex > -1) {
            updatedOrder = table.order.map((item, index) =>
              index === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item
            );
          } else {
            updatedOrder = [...table.order, { dish: dishToAdd, quantity: 1 }];
          }
          return { ...table, order: updatedOrder };
        }
        return table;
      })
    );
    toast({
      title: "Item Added",
      description: `${dishToAdd.name} has been added to your order.`,
    });
  };

  const handleUpdateOrderItemQuantity = (dishId: string, change: number) => {
    if (!selectedTableId) return;

    setTables(prevTables =>
      prevTables.map(table => {
        if (table.id === selectedTableId) {
          const updatedOrder = table.order
            .map(item => {
              if (item.dish.id === dishId) {
                const newQuantity = item.quantity + change;
                return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
              }
              return item;
            })
            .filter(Boolean) as OrderItem[]; // Filter out nulls (items with quantity <= 0)
          return { ...table, order: updatedOrder };
        }
        return table;
      })
    );
  };

  const handleRemoveOrderItem = (dishId: string) => {
    if (!selectedTableId) return;

    setTables(prevTables =>
      prevTables.map(table => {
        if (table.id === selectedTableId) {
          const updatedOrder = table.order.filter(item => item.dish.id !== dishId);
          return { ...table, order: updatedOrder };
        }
        return table;
      })
    );
    toast({
      title: "Item Removed",
      description: `Item has been removed from your order.`,
    });
  };

  const selectedTableDetails = tables.find(table => table.id === selectedTableId);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-3">
          <Utensils className="h-8 w-8" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">EasyOrder</h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TableSelector
              tables={tables}
              selectedTableId={selectedTableId}
              onSelectTable={handleSelectTable}
            />
            <Menu
              dishes={dishes}
              onAddDish={handleAddDishToOrder}
              isTableSelected={!!selectedTableId}
            />
          </div>

          <div className="lg:col-span-1">
            <OrderSummary
              table={selectedTableDetails}
              onUpdateQuantity={handleUpdateOrderItemQuantity}
              onRemoveItem={handleRemoveOrderItem}
            />
          </div>
        </div>
      </main>

      <footer className="text-center p-4 text-muted-foreground text-sm border-t">
        © {new Date().getFullYear()} EasyOrder. Simple Food Ordering.
      </footer>
      <Toaster />
    </div>
  );
}
