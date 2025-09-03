
import { getCachedDishes, getCachedSettings, getCachedRestaurant } from '@/lib/settings';
import KitchenDisplay from '@/components/kitchen-display';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getKitchenSession } from '@/lib/session';

export async function generateMetadata({ params}: { params: Promise<{ restaurantId: string }> }): Promise<Metadata> {
  const { restaurantId } = await params;
  const restaurant = await getCachedRestaurant(restaurantId);
  const title = restaurant ? `${restaurant.name} - 厨房看板` : '厨房看板';

  return {
    title: title,
    description: `查看 ${restaurant?.name || '餐馆'} 的实时出餐情况。`,
  };
}


function KitchenLoadingSkeleton() {
    return (
      <div className="p-4 space-y-4 animate-pulse h-screen w-screen bg-background">
        <div className="flex justify-center p-2">
            <Skeleton className="h-10 w-48" />
        </div>
        <div className="p-6 pb-24 space-y-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 rounded-lg border bg-card space-y-3">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                    </div>
                    <Skeleton className="h-px w-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-4/5" />
                    </div>
                </div>
            ))}
        </div>
      </div>
    );
  }

export default async function OrdersPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;
  if (!restaurantId) {
    notFound();
  }

  const settings = await getCachedSettings(restaurantId);
  const passwordRequired = !!settings.kitchenDisplayPassword;

  if (passwordRequired) {
      const session = await getKitchenSession(restaurantId);
      if (!session) {
        redirect(`/${restaurantId}/orders/verify`);
      }
  }

  const allDishes = await getCachedDishes(restaurantId);
  
  return (
    <Suspense fallback={<KitchenLoadingSkeleton />}>
        <KitchenDisplay allDishes={allDishes} settings={settings} restaurantId={restaurantId} />
    </Suspense>
  );
}
