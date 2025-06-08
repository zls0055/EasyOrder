
"use client";

import type { Dish } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Utensils } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useEffect, useMemo } from 'react';

interface MenuProps {
  dishes: Dish[];
  onAddDish: (dish: Dish) => void;
  isTableSelected: boolean;
}

export default function Menu({ dishes, onAddDish, isTableSelected }: MenuProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const availableCategories = useMemo(() => {
    const allCats = dishes.map(d => d.category);
    const uniqueCats = Array.from(new Set(allCats));
    // Define the desired order of categories
    const predefinedOrder = ['经济快餐', '煲类', '汤类', '精美小炒', '铁板类', '火锅/鸡煲'];
    // Filter uniqueCats to include only those in predefinedOrder and maintain that order
    // Also include any other categories from uniqueCats that are not in predefinedOrder, adding them at the end.
    const orderedCats = predefinedOrder.filter(cat => uniqueCats.includes(cat));
    const otherCats = uniqueCats.filter(cat => !predefinedOrder.includes(cat));
    return [...orderedCats, ...otherCats];
  }, [dishes]);

  useEffect(() => {
    if (availableCategories.length > 0 && (!selectedCategory || !availableCategories.includes(selectedCategory))) {
      setSelectedCategory(availableCategories[0]);
    }
  }, [availableCategories, selectedCategory]);

  if (dishes.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-6 w-6 text-primary" />
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
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-6 w-6 text-primary" />
          菜单
        </CardTitle>
        {!isTableSelected && (
          <CardDescription className="text-destructive">
            请选择一个餐桌开始点餐。
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {availableCategories.length > 0 && selectedCategory ? (
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="flex flex-wrap gap-2 mb-4 h-auto justify-start">
              {availableCategories.map((category) => (
                <TabsTrigger key={category} value={category}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
            {availableCategories.map((category) => (
              <TabsContent key={category} value={category}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dishes
                    .filter((dish) => dish.category === category)
                    .map((dish) => (
                      <Card key={dish.id} className="flex flex-col justify-between shadow-md hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                          <div className="relative w-full h-40 mb-2 rounded-md overflow-hidden">
                            <Image
                              src={dish.imagePath}
                              alt={dish.name}
                              fill
                              style={{ objectFit: 'cover' }}
                              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                              data-ai-hint={dish.imageHint}
                              priority={['dish-9', 'dish-10', 'dish-11', 'dish-69', 'dish-77', 'dish-95', 'dish-112'].includes(dish.id)} 
                            />
                          </div>
                          <CardTitle className="text-xl">{dish.name}</CardTitle>
                          <CardDescription className="text-lg font-semibold text-primary">
                            ￥{dish.price.toFixed(2)}
                          </CardDescription>
                        </CardHeader>
                        <CardFooter>
                          <Button
                            variant="default"
                            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                            onClick={() => onAddDish(dish)}
                            disabled={!isTableSelected}
                            aria-label={`将 ${dish.name} 加入订单`}
                          >
                            <ShoppingCart className="mr-2 h-5 w-5" />
                            加入订单
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
           <p className="text-muted-foreground">当前没有菜品可供选择。</p>
        )}
      </CardContent>
    </Card>
  );
}

    
