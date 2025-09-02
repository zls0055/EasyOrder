"use client";

import type { Table } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Armchair, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface TableSelectorProps {
  tables: Table[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  disabled?: boolean;
}

export default function TableSelector({ tables, selectedTableId, onSelectTable, disabled = false }: TableSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedTableNumber = selectedTableId ? tables.find(t => t.id === selectedTableId)?.number : null;

  const handleSelect = (tableId: string) => {
    onSelectTable(tableId);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="accent" className="flex items-center gap-2" disabled={disabled}>
          <Armchair className="h-5 w-5" />
          <span>
            {selectedTableNumber
              ? selectedTableNumber === '外卖'
                ? '外卖'
                : `${selectedTableNumber}号桌`
              : '选择餐桌'}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2 bg-card">
        {tables.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {tables.map((table) => (
              <Button
                key={table.id}
                variant={selectedTableId === table.id ? 'default' : 'outline'}
                onClick={() => handleSelect(table.id)}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
