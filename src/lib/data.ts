import type { Dish, Table } from '@/types';

export const initialDishes: Dish[] = [
  { id: 'dish-1', name: '宫保鸡丁', price: 15.99, imageHint: 'kungpao chicken', imagePath: '/images/kungpao-chicken.jpg' },
  { id: 'dish-2', name: '麻婆豆腐 (素)', price: 12.50, imageHint: 'mapo tofu', imagePath: '/images/mapo-tofu.jpg' },
  { id: 'dish-3', name: '咕噜肉', price: 16.00, imageHint: 'sweet pork', imagePath: '/images/sweet-pork.jpg' },
  { id: 'dish-4', name: '春卷 (4件)', price: 6.50, imageHint: 'spring rolls', imagePath: '/images/spring-rolls.jpg' },
  { id: 'dish-5', name: '白饭', price: 2.00, imageHint: 'white rice', imagePath: '/images/white-rice.jpg' },
  { id: 'dish-6', name: '云吞汤', price: 7.00, imageHint: 'wonton soup', imagePath: '/images/wonton-soup.jpg' },
  { id: 'dish-7', name: '西兰花牛肉', price: 17.50, imageHint: 'broccoli beef', imagePath: '/images/broccoli-beef.jpg' },
  { id: 'dish-8', name: '炒时蔬', price: 11.00, imageHint: 'fried vegetables', imagePath: '/images/fried-vegetables.jpg' },
];

export const initialTables: Table[] = [
  { id: 'table-1', number: '1', order: [] },
  { id: 'table-2', number: '2', order: [] },
  { id: 'table-3', number: '3', order: [] },
  { id: 'table-4', number: '4', order: [] },
  { id: 'table-5', number: '5', order: [] },
  { id: 'table-6', number: '6', order: [] },
];
