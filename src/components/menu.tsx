"use client";

import type { Dish } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Utensils, Menu as MenuIcon, X as XIcon } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';


interface MenuProps {
  dishes: Dish[];
  onAddDish: (dish: Dish) => void;
  isTableSelected: boolean;
}

interface CategoryInfo {
  name: string;
  count: number;
}

export default function Menu({ dishes, onAddDish, isTableSelected }: MenuProps) {
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [isCategoryListVisible, setIsCategoryListVisible] = useState(false);

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
      
    return [...orderedCatsInfo, ...otherCatsInfo];
  }, [dishes]);

  useEffect(() => {
    if (availableCategories.length > 0) {
      const currentCategoryExists = availableCategories.some(cat => cat.name === selectedCategoryName);
      if (!selectedCategoryName || !currentCategoryExists) {
        setSelectedCategoryName(availableCategories[0].name);
      }
    } else {
      setSelectedCategoryName('');
    }
  }, [availableCategories, selectedCategoryName]);

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategoryName(categoryName);
    setIsCategoryListVisible(false); 
  };

  if (dishes.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="p-4">
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

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="p-4">
          <div className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">菜单{selectedCategoryName && ` - ${selectedCategoryName}`}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {availableCategories.length > 0 ? (
            <Tabs
              value={selectedCategoryName}
              onValueChange={handleCategorySelect}
              className="relative flex flex-row w-full min-h-[60vh]"
            >
              <TabsList
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
                {selectedCategoryName ? (
                  <TabsContent value={selectedCategoryName} className="mt-0 w-full h-full">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {dishes
                        .filter((dish) => dish.category === selectedCategoryName)
                        .map((dish) => (
                          <Card key={dish.id} className="flex flex-col justify-between shadow-md hover:shadow-xl transition-shadow duration-300">
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
                        ))}
                    </div>
                  </TabsContent>
                ) : (
                  <p className="text-muted-foreground">请选择一个分类查看菜品。</p>
                )}
              </div>
            </Tabs>
          ) : (
             <p className="text-muted-foreground p-6">当前没有菜品可供选择。</p>
          )}
        </CardContent>
      </Card>

      <Button
        variant="secondary"
        size="icon"
        className="fixed bottom-6 left-6 z-40 shadow-xl rounded-lg"
        onClick={() => setIsCategoryListVisible(!isCategoryListVisible)}
        aria-label={isCategoryListVisible ? "隐藏菜单分类" : "显示菜单分类"}
      >
        {isCategoryListVisible ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </Button>
    </>
  );
}
