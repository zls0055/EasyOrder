
'use client';

import type { Restaurant, PointLog } from '@/types';
import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { X, Loader2, CalendarX, BarChart3 } from 'lucide-react';
import { getPointLogs } from '@/lib/settings';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface PointLogsSheetProps {
  restaurant: Restaurant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PointLogsSheet({ restaurant, open, onOpenChange }: PointLogsSheetProps) {
  const [logs, setLogs] = useState<PointLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && restaurant) {
      const fetchLogs = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const fetchedLogs = await getPointLogs(restaurant.id);
          setLogs(fetchedLogs);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
          setError(`加载日志失败: ${errorMessage}`);
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchLogs();
    }
  }, [open, restaurant]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>
            <div className="flex items-baseline gap-2">
              <span className="truncate">点数消耗日志</span>
              <span className="text-sm font-normal text-muted-foreground truncate">
                {restaurant?.name || '...'}
              </span>
            </div>
          </SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-8 w-8 rounded-full z-50">
              <X className="h-4 w-4" />
              <span className="sr-only">关闭</span>
            </Button>
          </SheetClose>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>正在加载消耗记录...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-48 text-destructive">
                <p>{error}</p>
              </div>
            ) : logs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead className="text-right">消耗点数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.date}>
                      <TableCell className="font-medium">{log.date}</TableCell>
                      <TableCell className="text-right font-mono">{log.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
                <CalendarX className="h-10 w-10 mb-4" />
                <p className="font-semibold">没有找到记录</p>
                <p className="text-sm mt-1">此餐馆在过去90天内没有点数消耗记录。</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {logs.length > 0 && (
            <div className="p-4 border-t text-sm text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>总消耗 (最近90天): <span className="font-bold text-foreground">{logs.reduce((sum, log) => sum + log.count, 0)}</span> 点</span>
            </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
