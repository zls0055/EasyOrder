export interface Dish {
  id: string;
  name: string;
  price: number;
  imageHint: string; // 用于图片搜索的提示词
}

export interface OrderItem {
  dish: Dish;
  quantity: number;
}

export interface Table {
  id: string;
  number: string;
  order: OrderItem[];
}
