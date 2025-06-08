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
  // Added based on OCR - 煲类
  { id: 'dish-9', name: '肉沫茄子煲', price: 22.00, imageHint: 'pork eggplant', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-10', name: '咸鱼茄子煲', price: 22.00, imageHint: 'saltedfish eggplant', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-11', name: '鱼香茄子煲', price: 22.00, imageHint: 'spicy eggplant', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-12', name: '日本豆腐煲', price: 20.00, imageHint: 'japanese tofu', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-13', name: '金针菇豆腐煲', price: 20.00, imageHint: 'enoki tofu', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-14', name: '鱼头豆腐煲', price: 35.00, imageHint: 'fishhead tofu', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-15', name: '冬菇滑鸡煲', price: 35.00, imageHint: 'mushroom chicken', imagePath: 'https://placehold.co/300x200.png' },
  // Added based on OCR - 汤类
  { id: 'dish-16', name: '番茄蛋汤', price: 12.00, imageHint: 'tomato egg', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-17', name: '紫菜蛋汤', price: 12.00, imageHint: 'seaweed egg', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-18', name: '青菜豆腐汤', price: 12.00, imageHint: 'vegetable tofu', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-19', name: '酸菜豆腐汤', price: 12.00, imageHint: 'sour cabbage', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-20', name: '青瓜皮蛋汤', price: 12.00, imageHint: 'cucumber egg', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-21', name: '玉米排骨汤', price: 38.00, imageHint: 'corn rib', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-22', name: '酸菜粉丝汤', price: 12.00, imageHint: 'sour vermicelli', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-23', name: '三鲜汤', price: 15.00, imageHint: 'mixed soup', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-24', name: '平菇肉片汤', price: 15.00, imageHint: 'mushroom pork', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-25', name: '金针菇肉丝汤', price: 15.00, imageHint: 'enoki pork', imagePath: 'https://placehold.co/300x200.png' },
  { id: 'dish-26', name: '鱼头豆腐汤', price: 28.00, imageHint: 'fishhead soup', imagePath: 'https://placehold.co/300x200.png' },
];

export const initialTables: Table[] = [
  { id: 'table-1', number: '1', order: [] },
  { id: 'table-2', number: '2', order: [] },
  { id: 'table-3', number: '3', order: [] },
  { id: 'table-4', number: '4', order: [] },
  { id: 'table-5', number: '5', order: [] },
  { id: 'table-6', number: '6', order: [] },
];

