import { z } from 'zod';

export const RestaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().optional(), // ISO string, optional for backward compatibility
  points: z.number().int().default(1000),
});
export type Restaurant = z.infer<typeof RestaurantSchema>;

export const DishSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  category: z.string(),
  sortOrder: z.number().default(0),
  isRecommended: z.boolean().optional().default(false),
});
export type Dish = z.infer<typeof DishSchema>;

export const OrderItemSchema = z.object({
  dish: DishSchema,
  quantity: z.number(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const TableSchema = z.object({
  id: z.string(),
  number: z.string(),
  order: z.array(OrderItemSchema),
});
export type Table = z.infer<typeof TableSchema>;

export const PlaceOrderInputSchema = z.object({
  restaurantId: z.string(), // Added restaurantId
  tableId: z.string(),
  tableNumber: z.string(),
  order: z.array(OrderItemSchema),
  total: z.number(),
});
export type PlaceOrderInput = z.infer<typeof PlaceOrderInputSchema>;

export const PlacedOrderSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  tableId: z.string(),
  tableNumber: z.string(),
  order: z.array(OrderItemSchema),
  total: z.number(),
  placedAt: z.string(), // ISO string
});
export type PlacedOrder = z.infer<typeof PlacedOrderSchema>;

export const PlaceOrderResultSchema = z.object({
  order: PlacedOrderSchema.nullable(),
  logs: z.array(z.string()),
  error: z.string().nullable(),
});
export type PlaceOrderResult = z.infer<typeof PlaceOrderResultSchema>;

export const GetPlacedOrdersResultSchema = z.object({
    orders: z.array(PlacedOrderSchema),
    error: z.string().nullable(),
});
export type GetPlacedOrdersResult = z.infer<typeof GetPlacedOrdersResultSchema>;

const timeFormat = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "时间格式必须是 HH:MM");

export const FeatureVisibilitySchema = z.object({
  menuManagement: z.boolean().default(true),
  categorySort: z.boolean().default(true),
  generalSettings: z.boolean().default(true),
  pointCardRecharge: z.boolean().default(false),
  securitySettings: z.boolean().default(true),
  dishSalesReport: z.boolean().default(false),
});
export type FeatureVisibility = z.infer<typeof FeatureVisibilitySchema>;

export const AppSettingsSchema = z.object({
  id: z.string().default('app-config'), // a singleton document
  adminUsername: z.string().default('admin'),
  adminPassword: z.string().default('admin123456'),
  placeOrderOpCode: z.string().default('8888'),
  isRestaurantClosed: z.boolean().default(false),
  isOnlineOrderingDisabled: z.boolean().default(false),
  autoCloseStartTime: timeFormat.default('01:00'),
  autoCloseEndTime: timeFormat.default('07:30'),
  syncOrderCount: z.coerce.number().int().min(1, "数量大于0").default(20),
  tableCount: z.coerce.number().int().min(1, "数量必须大于0").default(7),
  categoryOrder: z.array(z.string()).default([]),
  orderFetchMode: z.enum(['push', 'pull']).default('push'),
  orderPullIntervalSeconds: z.coerce.number().int().min(2, "拉取间隔不能少于2秒").default(5),
  kitchenDisplayPassword: z.string().default('123456'),
  showKitchenLayoutSwitch: z.boolean().default(false),
  showKitchenSalesReport: z.boolean().default(false),
  featureVisibility: FeatureVisibilitySchema.default({}),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const PointLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  count: z.number().int().min(0),
});
export type PointLog = z.infer<typeof PointLogSchema>;

export const DishOrderLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  counts: z.record(z.string(), z.number().min(0)), // Allow float, then we can handle it in code if needed.
});
export type DishOrderLog = z.infer<typeof DishOrderLogSchema>;

export const PointCardSchema = z.object({
  id: z.string(),
  points: z.number().int().positive(),
  createdAt: z.string(), // ISO string
  status: z.enum(['new', 'used']),
  usedBy: z.string().nullable(),
  usedAt: z.string().nullable(), // ISO string
});
export type PointCard = z.infer<typeof PointCardSchema>;


export const RechargeLogSchema = z.object({
    id: z.string(),
    cardId: z.string(),
    pointsAdded: z.number().int(),
    rechargedAt: z.string(), // ISO string
    restaurantId: z.string(),
});
export type RechargeLog = z.infer<typeof RechargeLogSchema>;
