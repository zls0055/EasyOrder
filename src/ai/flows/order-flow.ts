'use server';
/**
 * @fileOverview Manages restaurant orders.
 *
 * - placeOrder - A function to place a new order.
 * - getPlacedOrders - A function to retrieve all placed orders.
 * - PlaceOrderInput - The input type for the placeOrder function.
 * - PlacedOrder - The full order type, including server-generated fields.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { PlacedOrder as PlacedOrderType } from '@/types';

// In-memory store for prototype purposes. This will reset on server restart.
let serverPlacedOrders: PlacedOrderType[] = [];


// Schemas for validation
const DishSchema = z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    category: z.string(),
    imageHint: z.string(),
    imagePath: z.string(),
});

const OrderItemSchema = z.object({
    dish: DishSchema,
    quantity: z.number(),
});

const PlaceOrderInputSchema = z.object({
  tableId: z.string(),
  tableNumber: z.string(),
  order: z.array(OrderItemSchema),
  total: z.number(),
});
export type PlaceOrderInput = z.infer<typeof PlaceOrderInputSchema>;

const PlacedOrderSchema = PlaceOrderInputSchema.extend({
    id: z.string(),
    placedAt: z.string(),
});
export type PlacedOrder = z.infer<typeof PlacedOrderSchema>;


// Wrapper function for the client to call
export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  return placeOrderFlow(input);
}

// Wrapper function for the client to call
export async function getPlacedOrders(): Promise<PlacedOrder[]> {
    return getPlacedOrdersFlow();
}


const placeOrderFlow = ai.defineFlow(
  {
    name: 'placeOrderFlow',
    inputSchema: PlaceOrderInputSchema,
    outputSchema: PlacedOrderSchema,
  },
  async (input) => {
    const newPlacedOrder: PlacedOrder = {
        ...input,
        id: `server-${new Date().toISOString()}-${input.tableId}`,
        placedAt: new Date().toISOString(),
    };

    serverPlacedOrders.push(newPlacedOrder);
    
    return newPlacedOrder;
  }
);


const getPlacedOrdersFlow = ai.defineFlow(
    {
        name: 'getPlacedOrdersFlow',
        inputSchema: z.void(),
        outputSchema: z.array(PlacedOrderSchema),
    },
    async () => {
        // sort by most recent
        serverPlacedOrders.sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
        return serverPlacedOrders;
    }
);
