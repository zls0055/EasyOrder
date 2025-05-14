"use client";

import type { Table } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Armchair } from 'lucide-react';

interface TableSelectorProps {
  tables: Table[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
}

export default function TableSelector({ tables, selectedTableId, onSelectTable }: TableSelectorProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Armchair className="h-6 w-6 text-primary" />
          Select a Table
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {tables.map((table) => (
            <Button
              key={table.id}
              variant={selectedTableId === table.id ? 'default' : 'outline'}
              onClick={() => onSelectTable(table.id)}
              className="text-lg font-semibold"
              aria-pressed={selectedTableId === table.id}
            >
              {table.number}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
