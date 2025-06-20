
"use client";

import type { Dish, Table, OrderItem } from '@/types';
import { initialDishes, initialTables } from '@/lib/data';
import TableSelector from '@/components/table-selector';
import Menu from '@/components/menu';
import OrderSummary from '@/components/order-summary';
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from 'react';

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
    // Toast notifications for table selection can be a bit noisy if the order summary updates immediately.
    // Consider removing if the floating summary provides enough feedback.
    // toast({
    //   title: "已选择餐桌",
    //   description: `您正在为 ${tables.find(t => t.id === tableId)?.number} 号桌点餐。`,
    // });
  };

  const handleAddDishToOrder = (dishToAdd: Dish) => {
    if (!selectedTableId) {
      toast({
        variant: "destructive",
        title: "未选择餐桌",
        description: "请先选择餐桌再添加菜品。",
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
    // Toast for adding dish can also be optional if order summary updates clearly.
    // toast({
    //   title: "菜品已添加",
    //   description: `${dishToAdd.name} 已添加到您的订单。`,
    // });
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
            .filter(Boolean) as OrderItem[];
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
    // toast({
    //   title: "菜品已移除",
    //   description: `菜品已从您的订单中移除。`,
    // });
  };

  const selectedTableDetails = tables.find(table => table.id === selectedTableId);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        <div className="space-y-6"> {/* Simplified main content wrapper */}
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
      </main>

      <OrderSummary
        table={selectedTableDetails}
        onUpdateQuantity={handleUpdateOrderItemQuantity}
        onRemoveItem={handleRemoveOrderItem}
      />

      <footer className="text-center p-4 text-muted-foreground text-sm border-t mt-8">
        © {new Date().getFullYear()} EasyOrder。简单点餐。
      </footer>
      <Toaster />
    </div>
  );
}
