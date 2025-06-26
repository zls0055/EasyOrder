
"use client";

import type { Dish, Table } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShoppingCart, Utensils, Menu as MenuIcon, X as XIcon, Search } from 'lucide-react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import TableSelector from '@/components/table-selector';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';


interface MenuProps {
  dishes: Dish[];
  onAddDish: (dish: Dish) => void;
  isTableSelected: boolean;
  tables: Table[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
}

interface CategoryInfo {
  name: string;
  count: number;
}

export default function Menu({ dishes, onAddDish, isTableSelected, tables, selectedTableId, onSelectTable }: MenuProps) {
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryListVisible, setIsCategoryListVisible] = useState(false);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);

  const availableCategories: CategoryInfo[] = useMemo(() => {
    const allCats = dishes.map(d => d.category);
    const uniqueCats = Array.from(new Set(allCats));
    
    const categoryCounts: Record<string, number> = {};
    dishes.forEach(dish => {
      categoryCounts[dish.category] = (categoryCounts[dish.category] || 0) + 1;
    });

    const predefinedOrder = ['经济快餐', '凉拌类', '煲类', '汤类', '精美小炒', '干锅类', '铁板类', '火锅/鸡煲'];
    
    const orderedCatsInfo: CategoryInfo[] = predefinedOrder
      .filter(catName => uniqueCats.includes(catName))
      .map(catName => ({ name: catName, count: categoryCounts[catName] || 0 }));

    const otherCatsInfo: CategoryInfo[] = uniqueCats
      .filter(catName => !predefinedOrder.includes(catName))
      .map(catName => ({ name: catName, count: categoryCounts[catName] || 0 }));
      
    return [
      { name: '全部菜品', count: dishes.length },
      ...orderedCatsInfo, 
      ...otherCatsInfo
    ];
  }, [dishes]);

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
      if (
        categoryListRef.current &&
        !categoryListRef.current.contains(event.target as Node) &&
        categoryButtonRef.current &&
        !categoryButtonRef.current.contains(event.target as Node)
      ) {
        setIsCategoryListVisible(false);
      }
    }

    if (isCategoryListVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
      if (!grouped[dish.category]) {
        grouped[dish.category] = [];
      }
      grouped[dish.category].push(dish);
    }
    
    categoryOrder.forEach(catName => {
        if (grouped[catName]) {
            orderedGrouped[catName] = grouped[catName];
        }
    });

    return orderedGrouped;
  }, [dishes, searchQuery, isSearching, availableCategories]);

  const allDishesGrouped = useMemo(() => {
    const grouped: Record<string, Dish[]> = {};
    const categoryOrder = availableCategories
        .map(c => c.name)
        .filter(name => name !== '全部菜品');

    for (const dish of dishes) {
      if (!grouped[dish.category]) {
        grouped[dish.category] = [];
      }
      grouped[dish.category].push(dish);
    }
    
    const orderedGrouped: Record<string, Dish[]> = {};
    categoryOrder.forEach(catName => {
        if (grouped[catName]) {
            orderedGrouped[catName] = grouped[catName];
        }
    });

    return orderedGrouped;
  }, [dishes, availableCategories]);

  const dishesForCategory = useMemo(() => {
    if (isSearching || !selectedCategoryName || selectedCategoryName === '全部菜品') return [];
    return dishes.filter((dish) => dish.category === selectedCategoryName);
  }, [dishes, selectedCategoryName, isSearching]);


  if (dishes.length === 0) {
    return (
      <Card className="shadow-lg rounded-none md:rounded-lg">
        <CardHeader className="p-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Utensils className="h-5 w-5 text-primary" />
            菜单
          </CardTitle>
          <CardDescription>当前菜单为空。</CardDescription>
        </CardHeader>
        <CardContent>
          <p>请稍后再试或联系餐厅管理员。</p>
        </CardContent>
      </Card>
    );
  }

  const DishCard = ({ dish }: { dish: Dish }) => (
    <Card key={dish.id} className="flex flex-col justify-between shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <CardHeader className="p-3">
          <CardTitle className="text-base font-semibold line-clamp-1">{dish.name}</CardTitle>
          <CardDescription className="text-sm font-medium text-primary">
              ￥{dish.price.toFixed(2)}
          </CardDescription>
      </CardHeader>
      <CardFooter className="p-3 pt-0">
          <Button
              size="sm"
              variant="default"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => onAddDish(dish)}
              disabled={!isTableSelected}
              aria-label={`将 ${dish.name} 加入订单`}
          >
              <ShoppingCart className="mr-1 h-4 w-4" />
              <span>加入订单</span>
          </Button>
      </CardFooter>
    </Card>
  );
  
  const GroupedDishList = ({ groupedDishes }: { groupedDishes: Record<string, Dish[]> }) => (
    <div className="space-y-6">
      {Object.entries(groupedDishes).map(([category, dishesInCategory]) => (
        <div key={category}>
          <h2 className="text-lg font-semibold mb-3 pb-2 border-b">{category} ({dishesInCategory.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {dishesInCategory.map((dish) => <DishCard key={dish.id} dish={dish} />)}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Card className="shadow-lg rounded-none md:rounded-lg">
        <CardHeader className="p-2 flex flex-row items-center justify-between gap-4 sticky top-0 z-10 bg-card border-b">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl whitespace-nowrap">
                {isSearching ? '搜索结果' : '菜单'}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="打开搜索">
                    <Search className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          autoFocus
                          type="search"
                          placeholder="搜索所有菜品..."
                          className="w-full pl-9"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          aria-label="搜索菜品"
                      />
                  </div>
                </PopoverContent>
              </Popover>

              <TableSelector
                tables={tables}
                selectedTableId={selectedTableId}
                onSelectTable={onSelectTable}
              />
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={isSearching ? '__search__' : selectedCategoryName || ''} onValueChange={handleCategorySelect} className="w-full">
            <div className="relative flex flex-row w-full min-h-[60vh]">
                <TabsList
                  ref={categoryListRef}
                  className={cn(
                    "h-auto fixed top-20 left-0 bottom-20 flex flex-col items-stretch justify-start p-2 space-y-1 border-y border-r rounded-r-lg border-border bg-card shadow-xl z-40 w-48 overflow-y-auto",
                    "transition-all duration-300 ease-in-out",
                    isCategoryListVisible
                      ? "translate-x-0 opacity-100"
                      : "-translate-x-full opacity-0 pointer-events-none"
                  )}
                >
                  {availableCategories.map((category) => (
                    <TabsTrigger
                      key={category.name}
                      value={category.name}
                      className="inline-flex items-center text-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm w-full justify-start px-3 py-4 text-left rounded-md font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted/50"
                    >
                      {category.name} ({category.count})
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <div className="p-4 overflow-y-auto w-full h-full">
                  {isSearching ? (
                    searchResults && Object.keys(searchResults).length > 0 ? (
                        <GroupedDishList groupedDishes={searchResults} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                          <Search className="h-10 w-10 mb-2" />
                          <p className="font-semibold">未找到匹配的菜品</p>
                          <p className="text-sm mt-1">请尝试其他搜索词。</p>
                        </div>
                    )
                  ) : selectedCategoryName === '全部菜品' ? (
                      <GroupedDishList groupedDishes={allDishesGrouped} />
                  ) : (
                    dishesForCategory.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {dishesForCategory.map((dish) => <DishCard key={dish.id} dish={dish} />)}
                      </div>
                    ) : (
                      <p className="text-muted-foreground p-6">请选择一个分类查看菜品。</p>
                    )
                  )}
                </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      <Button
        ref={categoryButtonRef}
        variant="accent"
        size="icon"
        className="fixed bottom-6 left-4 z-40 shadow-xl rounded-lg"
        onClick={() => setIsCategoryListVisible(!isCategoryListVisible)}
        aria-label={isCategoryListVisible ? "隐藏菜单分类" : "显示菜单分类"}
      >
        {isCategoryListVisible ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </Button>
    </>
  );
}
