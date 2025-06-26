
"use client";

import type { Dish, Table, OrderItem, PlacedOrder } from '@/types';
import { initialDishes, initialTables } from '@/lib/data';
import Menu from '@/components/menu';
import OrderSummary from '@/components/order-summary';
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from 'react';
import PlacedOrdersSheet from '@/components/placed-orders-sheet';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { placeOrder } from '@/ai/flows/order-flow';

export default function HomePage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setDishes(initialDishes);
    setTables(initialTables);
  }, []);

  const handleSelectTable = (tableId: string) => {
    setSelectedTableId(tableId);
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
  };

  const calculateTotal = (order: OrderItem[]): number => {
    return order.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
  };

  const handlePlaceOrder = async (tableId: string) => {
    const tableToUpdate = tables.find(t => t.id === tableId);
    if (!tableToUpdate || tableToUpdate.order.length === 0) {
      toast({
        variant: "destructive",
        title: "下单失败",
        description: "订单为空，无法下单。",
      });
      return;
    }

    const orderPayload = {
      tableId: tableToUpdate.id,
      tableNumber: tableToUpdate.number,
      order: tableToUpdate.order,
      total: calculateTotal(tableToUpdate.order),
    };

    try {
      // Call the server-side flow
      await placeOrder(orderPayload);

      // Also save to localStorage for local history view
      const newPlacedOrderForLocal: PlacedOrder = {
        ...orderPayload,
        id: new Date().toISOString() + `-${tableId}`, // local id
        placedAt: new Date().toISOString(),
      };
      const existingOrdersRaw = localStorage.getItem('placedOrders');
      const existingOrders: PlacedOrder[] = existingOrdersRaw ? JSON.parse(existingOrdersRaw) : [];
      const updatedOrders = [...existingOrders, newPlacedOrderForLocal];
      localStorage.setItem('placedOrders', JSON.stringify(updatedOrders));


      // Clear the table's order on the client
      setTables(prevTables =>
        prevTables.map(table =>
          table.id === tableId ? { ...table, order: [] } : table
        )
      );

      toast({
        title: "下单成功",
        description: `${tableToUpdate.number}号桌的订单已成功提交至服务器。`,
      });
    } catch (error) {
      console.error("Failed to place order on server", error);
      toast({
        variant: "destructive",
        title: "下单失败",
        description: "无法将订单提交至服务器。",
      });
    }
  };

  const selectedTableDetails = tables.find(table => table.id === selectedTableId);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <main className="flex-grow">
        <Menu
          dishes={dishes}
          onAddDish={handleAddDishToOrder}
          isTableSelected={!!selectedTableId}
          tables={tables}
          selectedTableId={selectedTableId}
          onSelectTable={handleSelectTable}
        />
      </main>

      <OrderSummary
        table={selectedTableDetails}
        onUpdateQuantity={handleUpdateOrderItemQuantity}
        onRemoveItem={handleRemoveOrderItem}
        onPlaceOrder={handlePlaceOrder}
      />

      <Button
        variant="accent"
        size="icon"
        className="fixed bottom-6 left-16 z-40 shadow-xl rounded-lg"
        onClick={() => setIsHistoryVisible(true)}
        aria-label="查看历史订单"
      >
        <History className="h-5 w-5" />
      </Button>

      <Toaster />
      <PlacedOrdersSheet open={isHistoryVisible} onOpenChange={setIsHistoryVisible} />
    </div>
  );
}
