export interface Dish {
  id: string;
  name: string;
  price: number;
  category: string; // 新增分类字段
  imageHint: string; // 用于图片搜索的提示词
  imagePath: string; // 菜品图片路径
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
