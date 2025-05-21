
"use client";

import type { Dish } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Utensils } from 'lucide-react';
import Image from 'next/image';

interface MenuProps {
  dishes: Dish[];
  onAddDish: (dish: Dish) => void;
  isTableSelected: boolean;
}

export default function Menu({ dishes, onAddDish, isTableSelected }: MenuProps) {
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
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dishes.map((dish) => (
          <Card key={dish.id} className="flex flex-col justify-between shadow-md hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="relative w-full h-40 mb-2 rounded-md overflow-hidden">
                <Image
                  src="https://placehold.co/400x300.png"
                  alt={dish.name}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  data-ai-hint={dish.imageHint}
                  priority={dish.id === 'dish-1' || dish.id === 'dish-2' || dish.id === 'dish-3'} // Prioritize first few images
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
      </CardContent>
    </Card>
  );
}
