
'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import type { Dish, DishOrderLog } from '@/types';
import { getCachedDishOrderLogs } from '@/lib/settings';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CalendarIcon, ChevronLeft, ChevronRight, BarChartHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DishSalesReportProps {
  dishes: Dish[];
  restaurantId: string;
}

type SalesData = {
  name: string;
  count: number;
};

type MonthlySales = {
  month: string; // YYYY-MM
  counts: { [dishId: string]: number };
}

export default function DishSalesReport({ dishes, restaurantId }: DishSalesReportProps) {
  const [logs, setLogs] = useState<DishOrderLog[]>([]);
  const [isLoading, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD for daily
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // YYYY-MM for monthly

  const dishMap = useMemo(() => new Map(dishes.map(d => [d.id, d])), [dishes]);

  useEffect(() => {
    startTransition(async () => {
      console.log('[DishSalesReport] Fetching dish order logs...');
      const fetchedLogs = await getCachedDishOrderLogs(restaurantId);
      console.log('[DishSalesReport] Fetched logs:', fetchedLogs);
      setLogs(fetchedLogs);
      if (fetchedLogs.length > 0) {
        setSelectedDate(fetchedLogs[0].date);
      }
    });
  }, [restaurantId]);

  const monthlySales: MonthlySales[] = useMemo(() => {
    if (logs.length === 0) return [];
    
    const monthlyData: { [month: string]: { [dishId: string]: number } } = {};

    logs.forEach(log => {
      const month = log.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = {};
      }
      Object.entries(log.counts).forEach(([dishId, count]) => {
        monthlyData[month][dishId] = (monthlyData[month][dishId] || 0) + count;
      });
    });

    return Object.entries(monthlyData).map(([month, counts]) => ({ month, counts })).sort((a,b) => b.month.localeCompare(a.month));
  }, [logs]);

  useEffect(() => {
    if (viewMode === 'monthly' && monthlySales.length > 0 && !selectedMonth) {
        setSelectedMonth(monthlySales[0].month);
    }
  }, [viewMode, monthlySales, selectedMonth]);

  const salesDataForSelectedDate: SalesData[] = useMemo(() => {
    if (viewMode !== 'daily' || !selectedDate) return [];
    const logForDate = logs.find(log => log.date === selectedDate);
    if (!logForDate) return [];

    return Object.entries(logForDate.counts)
      .map(([dishId, count]) => ({
        name: dishMap.get(dishId)?.name || `未知菜品 (${dishId.substring(0, 5)})`,
        count: count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [selectedDate, logs, dishMap, viewMode]);

  const salesDataForSelectedMonth: SalesData[] = useMemo(() => {
    if (viewMode !== 'monthly' || !selectedMonth) return [];
    const monthData = monthlySales.find(m => m.month === selectedMonth);
    if (!monthData) return [];
    
    return Object.entries(monthData.counts)
      .map(([dishId, count]) => ({
        name: dishMap.get(dishId)?.name || `未知菜品 (${dishId.substring(0, 5)})`,
        count: count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [selectedMonth, monthlySales, dishMap, viewMode]);

  const handleDateChange = (direction: 'prev' | 'next') => {
    if (viewMode === 'daily') {
        const currentIndex = logs.findIndex(log => log.date === selectedDate);
        if (currentIndex === -1) return;
        const newIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1;
        if (newIndex >= 0 && newIndex < logs.length) setSelectedDate(logs[newIndex].date);
    } else {
        const currentIndex = monthlySales.findIndex(m => m.month === selectedMonth);
        if (currentIndex === -1) return;
        const newIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1;
        if (newIndex >= 0 && newIndex < monthlySales.length) setSelectedMonth(monthlySales[newIndex].month);
    }
  };

  const { canGoPrev, canGoNext, currentSelection, salesData } = useMemo(() => {
    if (viewMode === 'daily') {
      const selectedDateIndex = logs.findIndex(log => log.date === selectedDate);
      return {
        canGoPrev: selectedDateIndex < logs.length - 1,
        canGoNext: selectedDateIndex > 0,
        currentSelection: selectedDate,
        salesData: salesDataForSelectedDate,
      }
    } else { // monthly
      const selectedMonthIndex = monthlySales.findIndex(m => m.month === selectedMonth);
       return {
        canGoPrev: selectedMonthIndex < monthlySales.length - 1,
        canGoNext: selectedMonthIndex > 0,
        currentSelection: selectedMonth,
        salesData: salesDataForSelectedMonth,
      }
    }
  }, [viewMode, logs, selectedDate, monthlySales, selectedMonth, salesDataForSelectedDate, salesDataForSelectedMonth]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
          <BarChartHorizontal className="h-12 w-12 mb-4" />
          <p className="font-semibold">没有可用的销售数据</p>
          <p className="text-sm">当有新的订单产生后，这里会显示菜品的销量统计。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'daily' | 'monthly')}>
                <TabsList>
                    <TabsTrigger value="daily">每日</TabsTrigger>
                    <TabsTrigger value="monthly">每月</TabsTrigger>
                </TabsList>
            </Tabs>
            
            {currentSelection && (
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleDateChange('prev')} disabled={!canGoPrev}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2 text-sm font-medium w-24 justify-center">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{currentSelection}</span>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => handleDateChange('next')} disabled={!canGoNext}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
        
        {salesData.length > 0 ? (
          <>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesData.slice(0, 15).reverse()} // Show top 15, reversed for horizontal layout
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
                    {salesData.map((item, index) => (
                      <TableRow key={item.name}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right font-mono">{item.count}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
             <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 h-64">
                <p className="font-semibold">当前选择的时段内没有销售记录</p>
            </div>
        )}
    </div>
  );
}

    