
'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import type { Dish, DishOrderLog } from '@/types';
import { getCachedDishOrderLogs } from '@/lib/settings';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CalendarIcon, ChevronLeft, ChevronRight, BarChartHorizontal } from 'lucide-react';
import { Button } from './ui/button';

interface DishSalesReportProps {
  dishes: Dish[];
  restaurantId: string;
}

type SalesData = {
  name: string;
  count: number;
};

export default function DishSalesReport({ dishes, restaurantId }: DishSalesReportProps) {
  const [logs, setLogs] = useState<DishOrderLog[]>([]);
  const [isLoading, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<string>('');

  const dishMap = useMemo(() => new Map(dishes.map(d => [d.id, d])), [dishes]);

  useEffect(() => {
    startTransition(async () => {
      console.log('[DishSalesReport] Fetching dish order logs...');
      const fetchedLogs = await getCachedDishOrderLogs(restaurantId);
      console.log('[DishSalesReport] Fetched logs:', fetchedLogs);
      setLogs(fetchedLogs);
      if (fetchedLogs.length > 0) {
        setSelectedDate(fetchedLogs[0].date);
        console.log('[DishSalesReport] Initial selected date set to:', fetchedLogs[0].date);
      } else {
        console.log('[DishSalesReport] No logs found, selected date not set.');
      }
    });
  }, [restaurantId]);

  const salesDataForSelectedDate: SalesData[] = useMemo(() => {
    console.log(`[DishSalesReport] Memoizing sales data for selectedDate: ${selectedDate}`);
    if (!selectedDate) return [];
    const logForDate = logs.find(log => log.date === selectedDate);
    if (!logForDate) {
      console.log(`[DishSalesReport] No log found for date: ${selectedDate}`);
      return [];
    }
    console.log(`[DishSalesReport] Log for date ${selectedDate}:`, logForDate);

    const data = Object.entries(logForDate.counts)
      .map(([dishId, count]) => {
        const dish = dishMap.get(dishId);
        return {
          name: dish ? dish.name : `未知菜品 (${dishId.substring(0, 5)})`,
          count: count,
        };
      })
      .sort((a, b) => b.count - a.count);
      
    console.log(`[DishSalesReport] Processed sales data for ${selectedDate}:`, data);
    return data;
  }, [selectedDate, logs, dishMap]);

  const handleDateChange = (direction: 'prev' | 'next') => {
    const currentIndex = logs.findIndex(log => log.date === selectedDate);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < logs.length) {
      const newDate = logs[newIndex].date;
      console.log(`[DishSalesReport] Date changed to: ${newDate}`);
      setSelectedDate(newDate);
    }
  };

  const selectedDateIndex = logs.findIndex(log => log.date === selectedDate);
  const canGoPrev = selectedDateIndex < logs.length - 1;
  const canGoNext = selectedDateIndex > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
            <BarChartHorizontal className="h-12 w-12 mb-4" />
            <p className="font-semibold">没有可用的销售数据</p>
            <p className="text-sm">当有新的订单产生后，这里会显示菜品的销量统计。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardDescription>按日查看各菜品的销售数量。</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => handleDateChange('prev')} disabled={!canGoPrev}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 text-sm font-medium">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedDate}</span>
                </div>
                <Button variant="outline" size="icon" onClick={() => handleDateChange('next')} disabled={!canGoNext}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={salesDataForSelectedDate.slice(0, 15).reverse()} // Show top 15, reversed for horizontal layout
              layout="vertical"
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} interval={0} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
              <Legend />
              <Bar dataKey="count" name="销量" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="border rounded-lg max-h-96 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-[50px]">排名</TableHead>
                <TableHead>菜品名称</TableHead>
                <TableHead className="text-right">销量</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesDataForSelectedDate.length > 0 ? (
                salesDataForSelectedDate.map((item, index) => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right font-mono">{item.count}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    这一天没有销售记录。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
