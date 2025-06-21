
"use client";

import type { Table } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Armchair, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TableSelectorProps {
  tables: Table[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
}

export default function TableSelector({ tables, selectedTableId, onSelectTable }: TableSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSelectAndCollapse = (tableId: string) => {
    onSelectTable(tableId);
    setIsExpanded(false);
  };

  const selectedTableNumber = selectedTableId ? tables.find(t => t.id === selectedTableId)?.number : null;

  if (!isExpanded) {
    return (
      <Button
        variant="default"
        size="lg"
        className="fixed top-6 left-6 z-50 shadow-xl rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center space-x-2"
        onClick={() => setIsExpanded(true)}
        aria-label="选择餐桌"
      >
        <Armchair className="h-5 w-5" />
        <span>
          {selectedTableNumber ? `${selectedTableNumber}号桌` : "选择餐桌"}
        </span>
        <ChevronDown className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Card className="fixed top-6 left-6 z-50 w-full max-w-xs shadow-xl rounded-lg bg-card flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Armchair className="h-6 w-6 text-primary" />
          <CardTitle>选择餐桌</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} aria-label="收起餐桌选择">
          <ChevronUp className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent>
        {tables.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {tables.map((table) => (
              <Button
                key={table.id}
                variant={selectedTableId === table.id ? 'default' : 'outline'}
                onClick={() => handleSelectAndCollapse(table.id)}
                className="text-lg font-semibold"
                aria-pressed={selectedTableId === table.id}
              >
                {table.number}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">没有可用的餐桌。</p>
        )}
      </CardContent>
    </Card>
  );
}
