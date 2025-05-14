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
          Menu
        </CardTitle>
        {!isTableSelected && (
          <CardDescription className="text-destructive">
            Please select a table to start ordering.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dishes.map((dish) => (
          <Card key={dish.id} className="flex flex-col justify-between shadow-md hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="relative w-full h-40 mb-2 rounded-md overflow-hidden">
                <Image 
                  src={`https://placehold.co/400x300.png?text=${encodeURIComponent(dish.name)}`} 
                  alt={dish.name} 
                  layout="fill" 
                  objectFit="cover"
                  data-ai-hint="food cuisine"
                />
              </div>
              <CardTitle className="text-xl">{dish.name}</CardTitle>
              <CardDescription className="text-lg font-semibold text-primary">
                ${dish.price.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                variant="default"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => onAddDish(dish)}
                disabled={!isTableSelected}
                aria-label={`Add ${dish.name} to order`}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Order
              </Button>
            </CardFooter>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
