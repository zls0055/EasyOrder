
import type { Metadata } from 'next';
import { getCachedRestaurant } from '@/lib/settings';
import VerifyKitchenForm from '@/components/verify-kitchen-form';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ restaurantId: string }> }): Promise<Metadata> {
  const { restaurantId } = await params;
  const restaurant = await getCachedRestaurant(restaurantId);
  const title = restaurant ? `${restaurant.name} - 厨房看板访问` : '厨房看板访问';

  return {
    title: title,
    description: `输入密码以访问 ${restaurant?.name || '餐馆'} 的厨房看板。`,
  };
}


export default async function VerifyKitchenPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;
  
  // Ensure the restaurant exists before rendering
  const restaurant = await getCachedRestaurant(restaurantId);
  if (!restaurant) {
    notFound();
  }

  return <VerifyKitchenForm restaurantId={restaurantId} />;
}
