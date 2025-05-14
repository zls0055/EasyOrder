export interface Dish {
  id: string;
  name: string;
  price: number;
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
