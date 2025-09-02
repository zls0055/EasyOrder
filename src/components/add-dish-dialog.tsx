
"use client";

import type { Dish, AppSettings } from '@/types';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, X, ChevronDown, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface AddDishDialogProps {
  dishes: Dish[];
  settings: AppSettings;
  onAddDish: (dish: Dish) => void;
  children: React.ReactNode;
  addingDishId: string | null;
}

export default function AddDishDialog({ dishes, settings, onAddDish, children, addingDishId }: AddDishDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部分类');
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);

  const categories = useMemo(() => {
    const allUniqueCategories = Array.from(new Set(dishes.map(d => d.category)));
    const categoryCounts = dishes.reduce((acc, dish) => {
      acc[dish.category] = (acc[dish.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const orderedCategoryNames = settings.categoryOrder && settings.categoryOrder.length > 0 ? settings.categoryOrder : allUniqueCategories.sort((a,b) => a.localeCompare(b, 'zh-Hans-CN'));
    const finalCategoryOrder = [...new Set([...orderedCategoryNames, ...allUniqueCategories])];

    const categoriesInfo = finalCategoryOrder.filter(catName => categoryCounts[catName]).map(catName => ({ name: catName, count: categoryCounts[catName] }));
    return [ { name: '全部分类', count: dishes.length }, ...categoriesInfo ];
  }, [dishes, settings.categoryOrder]);

  const filteredDishes = useMemo(() => {
    const categoryOrder = settings.categoryOrder || [];
    const categoryIndexMap = new Map(categoryOrder.map((cat, index) => [cat, index]));

    const filtered = dishes.filter(dish => {
      const matchesCategory = selectedCategory === '全部分类' || dish.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() || dish.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    return filtered.sort((a, b) => {
      const catIndexA = categoryIndexMap.get(a.category) ?? Infinity;
      const catIndexB = categoryIndexMap.get(b.category) ?? Infinity;
      if (catIndexA !== catIndexB) return catIndexA - catIndexB;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
  }, [dishes, searchQuery, selectedCategory, settings.categoryOrder]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery('');
    setIsCategoryPopoverOpen(false);
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
        setSearchQuery('');
        setSelectedCategory('全部分类');
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetTitle className="sr-only">添加菜品</SheetTitle>
        <div className="p-4 border-b">
            <div className="flex items-center gap-2">
                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                    <PopoverTrigger asChild><Button variant="outline" className="flex-1 justify-between min-w-0 h-11"><span className="truncate">{selectedCategory}</span><ChevronDown className="h-4 w-4 text-muted-foreground ml-2" /></Button></PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                        {categories.map((category, index) => (
                            <React.Fragment key={category.name}>
                            <Button variant="ghost" className="w-full justify-start rounded-none font-normal h-12 text-base" onClick={() => handleCategorySelect(category.name)}>{category.name} ({category.count})</Button>
                            {index < categories.length - 1 && <Separator />}
                            </React.Fragment>
                        ))}
                    </PopoverContent>
                </Popover>

                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="搜索菜品..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 h-11" />
                </div>
                <SheetClose asChild><Button variant="secondary" size="icon" className="h-11 w-11 rounded-full"><X className="h-5 w-5" /><span className="sr-only">关闭</span></Button></SheetClose>
            </div>
        </div>

        <ScrollArea className="flex-1">
            <Table>
            <TableBody>
                {filteredDishes.map(dish => {
                    const isAdding = addingDishId === dish.id;
                    const isDisabled = !!addingDishId;
                    return (
                        <TableRow key={dish.id}>
                            <TableCell className="py-3"><p className="font-medium text-lg">{dish.name}</p><p className="text-sm text-muted-foreground">{dish.category}</p></TableCell>
                            <TableCell className="text-right font-semibold py-3 text-lg">￥{dish.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right py-3">
                              <Button size="sm" onClick={() => onAddDish(dish)} disabled={isDisabled}>
                                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><PlusCircle className="mr-2 h-4 w-4" />添加</>)}
                              </Button>
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
            </Table>
            {filteredDishes.length === 0 && (<div className="flex justify-center items-center h-48 text-muted-foreground"><p>没有找到相关菜品。</p></div>)}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
