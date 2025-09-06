
"use client";

import type { Dish, Table, AppSettings, OrderItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShoppingCart, Menu as MenuIcon, X as XIcon, Search, History, Check, Star, Loader2, Utensils, ArrowUp } from 'lucide-react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import TableSelector from '@/components/table-selector';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';


interface MenuProps {
  dishes: Dish[];
  settings: AppSettings;
  onAddDish: (dish: Dish) => void;
  isTableSelected: boolean;
  tables: Table[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onShowHistory: () => void;
  justAddedDishId: string | null;
  addingDishId: string | null;
  isTableLocked?: boolean;
  orderItems: OrderItem[];
  recentDishes: Dish[];
}

interface CategoryInfo {
  name: string;
  count: number;
}

const RECENTLY_ORDERED_CATEGORY = '最近点的菜品';

export default function Menu({ 
    dishes, 
    settings, 
    onAddDish, 
    isTableSelected, 
    tables, 
    selectedTableId, 
    onSelectTable, 
    onShowHistory, 
    justAddedDishId,
    addingDishId,
    isTableLocked, 
    orderItems,
    recentDishes,
}: MenuProps) {
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryListVisible, setIsCategoryListVisible] = useState(false);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);

  const orderQuantityMap = useMemo(() => new Map(orderItems.map(item => [item.dish.id, item.quantity])), [orderItems]);

  const availableCategories: CategoryInfo[] = useMemo(() => {
    const allUniqueCategories = Array.from(new Set(dishes.map(d => d.category)));
    const categoryCounts = dishes.reduce((acc, dish) => {
      acc[dish.category] = (acc[dish.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const orderedCategoryNames = settings.categoryOrder && settings.categoryOrder.length > 0 ? settings.categoryOrder : allUniqueCategories.sort((a,b) => a.localeCompare(b, 'zh-Hans-CN'));
    const finalCategoryOrder = [...new Set([...orderedCategoryNames, ...allUniqueCategories])];

    const categoriesInfo = finalCategoryOrder.filter(catName => categoryCounts[catName]).map(catName => ({ name: catName, count: categoryCounts[catName] }));
    const recentCategory = recentDishes.length > 0 ? [{ name: RECENTLY_ORDERED_CATEGORY, count: recentDishes.length }] : [];

    return [ { name: '全部菜品', count: dishes.length }, ...categoriesInfo, ...recentCategory ];
  }, [dishes, settings.categoryOrder, recentDishes]);

  const isSearching = !!searchQuery.trim();

  useEffect(() => {
    if (isSearching) return;
    if (availableCategories.length > 0) {
      const currentCategoryExists = availableCategories.some(cat => cat.name === selectedCategoryName);
      if (!selectedCategoryName || !currentCategoryExists) {
         setSelectedCategoryName('全部菜品');
      }
    } else {
      setSelectedCategoryName('');
    }
  }, [availableCategories, selectedCategoryName, isSearching]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryListRef.current && !categoryListRef.current.contains(event.target as Node) && categoryButtonRef.current && !categoryButtonRef.current.contains(event.target as Node)) {
        setIsCategoryListVisible(false);
      }
    }
    if (isCategoryListVisible) document.addEventListener('mousedown', handleClickOutside);
    else document.removeEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryListVisible]);

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategoryName(categoryName);
    setSearchQuery('');
    setIsCategoryListVisible(false); 
  };

  const searchResults = useMemo(() => {
    if (!isSearching) return null;
    const lowerCaseQuery = searchQuery.toLowerCase().trim();
    const filteredDishes = dishes.filter((dish) => dish.name.toLowerCase().includes(lowerCaseQuery));
    const grouped: Record<string, Dish[]> = {};
    const categoryOrder = availableCategories.map(c => c.name);
    const orderedGrouped: Record<string, Dish[]> = {};

    for (const dish of filteredDishes) {
      if (!grouped[dish.category]) grouped[dish.category] = [];
      grouped[dish.category].push(dish);
    }
    categoryOrder.forEach(catName => { if (grouped[catName]) orderedGrouped[catName] = grouped[catName]; });
    return orderedGrouped;
  }, [dishes, searchQuery, isSearching, availableCategories]);

  const allDishesGrouped = useMemo(() => {
    const grouped: Record<string, Dish[]> = {};
    const categoryOrder = availableCategories.map(c => c.name).filter(name => name !== '全部菜品' && name !== RECENTLY_ORDERED_CATEGORY);

    for (const dish of dishes) {
      if (!grouped[dish.category]) grouped[dish.category] = [];
      grouped[dish.category].push(dish);
    }
    const orderedGrouped: Record<string, Dish[]> = {};
    categoryOrder.forEach(catName => { if (grouped[catName]) orderedGrouped[catName] = grouped[catName]; });
    if (recentDishes.length > 0) orderedGrouped[RECENTLY_ORDERED_CATEGORY] = recentDishes;
    return orderedGrouped;
  }, [dishes, availableCategories, recentDishes]);

  const dishesForCategory = useMemo(() => {
    if (isSearching || !selectedCategoryName || selectedCategoryName === '全部菜品') return [];
    if (selectedCategoryName === RECENTLY_ORDERED_CATEGORY) return recentDishes;
    return dishes.filter((dish) => dish.category === selectedCategoryName);
  }, [dishes, selectedCategoryName, isSearching, recentDishes]);

  if (dishes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] text-center p-4 text-muted-foreground">
        <Utensils className="h-24 w-24 text-primary/30 mb-6" />
        <h2 className="text-2xl font-bold text-foreground">菜单暂未开放</h2>
        <p className="mt-2 text-lg">此餐馆还没有添加任何菜品。</p>
        <p className="mt-1 text-sm">请联系管理员在后台更新菜单。</p>
      </div>
    );
  }

  if (availableCategories.length === 0) return null;

  const DishCard = ({ dish }: { dish: Dish }) => {
    const isJustAdded = dish.id === justAddedDishId;
    const isAdding = dish.id === addingDishId;
    const isDisabled = !isTableSelected || !!addingDishId;
    const quantityInOrder = orderQuantityMap.get(dish.id);

    return (
        <Card key={dish.id} className="dish-card relative flex flex-col justify-between overflow-hidden">
          {quantityInOrder && quantityInOrder > 0 && (<Badge variant="destructive" className="absolute top-1 right-1 h-5 w-5 rounded-full flex items-center justify-center p-2 text-xs">{quantityInOrder}</Badge>)}
          <CardHeader className="p-3 pb-2"><CardTitle className="text-base font-semibold line-clamp-1">{dish.name}</CardTitle></CardHeader>
          <CardContent className="p-3 pt-0 flex justify-between items-center">
              <p className="text-sm font-bold text-accent">￥{dish.price.toFixed(1)}</p>
              <Button size="icon" variant={isJustAdded ? "secondary" : "default"} onClick={() => onAddDish(dish)} disabled={isDisabled || isJustAdded} aria-label={`将 ${dish.name} 加入订单`}>
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : (isJustAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />)}
              </Button>
          </CardContent>
        </Card>
    );
  };
  
  const GroupedDishList = ({ groupedDishes }: { groupedDishes: Record<string, Dish[]> }) => (
    <div className="space-y-6">
      {Object.entries(groupedDishes).map(([category, dishesInCategory]) => (
        <div key={category}>
          <h2 className="text-xl font-bold mb-2 p-3 bg-secondary text-secondary-foreground rounded-lg shadow-md flex items-center">
            {category === RECENTLY_ORDERED_CATEGORY && <Star className="h-5 w-5 mr-2 text-yellow-400" />} {category} ({dishesInCategory.length})
          </h2>
          <div className="dish-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {dishesInCategory.map((dish) => <DishCard key={dish.id} dish={dish} />)}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="border-none relative shadow-lg rounded-none md:rounded-lg flex flex-col flex-1">
      <div className="fixed top-3.5 right-2 z-50">
        {!isTableSelected && (
          <div className="absolute top-full right-0 mt-2 w-max animate-bounce bg-primary text-primary-foreground text-sm font-bold px-4 py-2 rounded-lg shadow-xl">
            <ArrowUp className="absolute left-1/2 -translate-x-1/2 -top-2 h-5 w-5 text-primary" />
            请先选择餐桌
          </div>
        )}
        <TableSelector tables={tables} selectedTableId={selectedTableId} onSelectTable={onSelectTable} disabled={isTableLocked} />
      </div>

      {!isTableSelected && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30" />
      )}

      <CardHeader className="p-2 flex flex-row items-center justify-between gap-4 sticky top-0 z-20 bg-card border-b">
        <div className="flex items-center gap-1">
          <Button ref={categoryButtonRef} variant="ghost" size="icon" onClick={() => setIsCategoryListVisible(!isCategoryListVisible)} aria-label={isCategoryListVisible ? "隐藏菜单分类" : "显示菜单分类"}>
            {isCategoryListVisible ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </Button>
          <CardTitle className="text-xl whitespace-nowrap">{isSearching ? '搜索结果' : '菜单'}</CardTitle>
        </div>
        
        <div className="flex items-center gap-2 mr-40">
          <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="打开搜索"><Search className="h-5 w-5" /></Button></PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input autoFocus type="search" placeholder="搜索所有菜品..." className="w-full pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label="搜索菜品" /></div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" onClick={onShowHistory} aria-label="查看历史订单"><History className="h-5 w-5" /></Button>
        </div>
      </CardHeader>
      
      <div className="relative flex-1 flex flex-col">
        <CardContent className="p-0 flex-1">
          <Tabs value={isSearching ? '__search__' : selectedCategoryName || ''} onValueChange={handleCategorySelect} className="w-full h-full flex">
            <div className="relative flex flex-row w-full">
              <TabsList ref={categoryListRef} className={cn("h-auto fixed top-[68px] left-0 bottom-4 flex flex-col items-stretch justify-start p-2 border-y border-r rounded-r-lg border-border bg-card shadow-xl z-40 w-48 overflow-y-auto", "transition-all duration-300 ease-in-out", isCategoryListVisible ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none")}>
                {availableCategories.map((category, index) => (
                  <React.Fragment key={category.name}>
                    <TabsTrigger value={category.name} className="inline-flex items-center text-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm w-full justify-start px-3 py-3 text-left rounded-md font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted/50">
                      {category.name === RECENTLY_ORDERED_CATEGORY && <Star className="h-4 w-4 mr-2 text-yellow-400" />} {category.name} ({category.count})
                    </TabsTrigger>
                    {index < availableCategories.length - 1 && (<Separator className="my-1 bg-border/70" />)}
                  </React.Fragment>
                ))}
              </TabsList>
               <TabsContent value={selectedCategoryName} className="w-full h-full overflow-y-auto p-2 mt-0 flex-1">
                  {isSearching ? ( searchResults && Object.keys(searchResults).length > 0 ? <GroupedDishList groupedDishes={searchResults} /> : <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground"><Search className="h-10 w-10 mb-2" /><p className="font-semibold">未找到匹配的菜品</p><p className="text-sm mt-1">请尝试其他搜索词。</p></div>) : selectedCategoryName === '全部菜品' ? <GroupedDishList groupedDishes={allDishesGrouped} /> : (dishesForCategory.length > 0 ? <div className="dish-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">{dishesForCategory.map((dish) => <DishCard key={dish.id} dish={dish} />)}</div> : <p className="text-muted-foreground p-6">请选择一个分类查看菜品。</p>)}
               </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </div>
    </Card>
  );
}

    

    

