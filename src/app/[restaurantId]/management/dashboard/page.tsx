
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import DashboardClient from './dashboard-client';
import { getCachedDishes, getCachedSettings, getCachedRestaurant } from '@/lib/settings';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';


export async function generateMetadata({ params }: { params: Promise<{ restaurantId: string }> }): Promise<Metadata> {
  const { restaurantId } = await params;
  const restaurant = await getCachedRestaurant(restaurantId);
  const title = restaurant ? `${restaurant.name} - 管理后台` : '管理后台';

  return {
    title: title,
    description: `管理 ${restaurant?.name || '餐馆'} 的菜单、设置和安全信息。`,
  };
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40 p-4 sm:p-6 md:p-8">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 mb-6 -mx-4 -mt-4 sm:-mx-6 md:-mx-8 sm:-mt-6 md:-mt-8">
        <Skeleton className="h-10 w-10 md:hidden" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-10 w-24 ml-4" />
        <div className="ml-auto flex items-center gap-2">
           <Skeleton className="h-9 w-24 hidden sm:block" />
           <Skeleton className="h-9 w-28 hidden sm:block" />
           <Skeleton className="h-9 w-20 hidden sm:block" />
           <Skeleton className="h-10 w-10 sm:hidden" />
        </div>
      </header>
      <main className="grid md:grid-cols-[140px_1fr] lg:grid-cols-[160px_1fr] gap-6">
        <div className="hidden md:flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
        </div>
        <div className="grid gap-6">
            <Skeleton className="h-96 w-full" />
        </div>
      </main>
    </div>
  )
}

async function DashboardDataFetcher({ restaurantId }: { restaurantId: string }) {
  const restaurant = await getCachedRestaurant(restaurantId);
  if (!restaurant) {
    notFound();
  }
  const settings = await getCachedSettings(restaurantId);
  const dishes = await getCachedDishes(restaurantId);

  return <DashboardClient initialRestaurant={restaurant} initialSettings={settings} initialDishes={dishes} restaurantId={restaurantId} />;
}

export default async function DashboardPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;
  const session = await getSession(restaurantId);
  if (!session) {
    redirect(`/${restaurantId}/management`);
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardDataFetcher restaurantId={restaurantId} />
    </Suspense>
  );
}

