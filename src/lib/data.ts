import type { Dish, Table } from '@/types';

export const initialDishes: Dish[] = [
  { id: 'dish-1', name: 'Kung Pao Chicken', price: 15.99 },
  { id: 'dish-2', name: 'Mapo Tofu (Vegetarian)', price: 12.50 },
  { id: 'dish-3', name: 'Sweet and Sour Pork', price: 16.00 },
  { id: 'dish-4', name: 'Spring Rolls (4 pcs)', price: 6.50 },
  { id: 'dish-5', name: 'Steamed Rice', price: 2.00 },
  { id: 'dish-6', name: 'Wonton Soup', price: 7.00 },
  { id: 'dish-7', name: 'Beef with Broccoli', price: 17.50 },
  { id: 'dish-8', name: 'Vegetable Stir-fry', price: 11.00 },
];

export const initialTables: Table[] = [
  { id: 'table-1', number: '1', order: [] },
  { id: 'table-2', number: '2', order: [] },
  { id: 'table-3', number: '3', order: [] },
  { id: 'table-4', number: '4', order: [] },
  { id: 'table-5', number: '5', order: [] },
  { id: 'table-6', number: '6', order: [] },
];
