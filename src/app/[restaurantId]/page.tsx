
import React, { Suspense } from 'react';
import OrderPageContent from '@/components/order-page-content';
import { Skeleton } from '@/components/ui/skeleton';
import { getCachedDishes, getCachedSettings, getCachedRestaurant } from '@/lib/settings';
import { DoorClosed, Ban } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ restaurantId: string }> }): Promise<Metadata> {
  const { restaurantId } = await params; 
  const restaurant = await getCachedRestaurant(restaurantId);
  const title = restaurant ? `${restaurant.name} - 在线点餐` : '在线点餐';

  return {
    title: title,
    description: `欢迎光临${restaurant?.name || ''}，轻松快捷地在线下单。`,
  };
}


function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="fixed top-3.5 right-3.5 z-50">
          <Skeleton className="h-10 w-32" />
      </div>
      <div className="p-2 border-b">
        <div className="flex items-center gap-1">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-6 w-24" />
        </div>
      </div>
      
      <div className="p-4">
         <div className="dish-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
            <div key={i} className="space-y-2">
                <div className="flex flex-col justify-between overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm h-28">
                    <div className="p-3 pb-2"><Skeleton className="h-5 w-4/5"/></div>
                    <div className="p-3 pt-0 flex justify-between items-center">
                        <Skeleton className="h-5 w-12"/>
                        <Skeleton className="h-8 w-8 rounded-md"/>
                    </div>
                </div>
            </div>
            ))}
         </div>
      </div>
    </div>
  );
}

function RestaurantClosed({ message, subMessage, icon: Icon = DoorClosed }: { message: string, subMessage?: string, icon?: React.ElementType }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center p-4">
            <Icon className="h-24 w-24 text-destructive mb-6" />
            <h1 className="text-3xl font-bold text-destructive">{message}</h1>
            {subMessage && <p className="text-lg text-muted-foreground mt-2">{subMessage}</p>}
            <p className="text-sm text-muted-foreground mt-8">感谢您的理解！</p>
        </div>
    );
}

function isWithinAutoCloseTime(startTime: string, endTime: string): boolean {
  try {
    if (!startTime || !endTime) {
      return false;
    }
    const now = new Date();
    const beijingTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startTimeDate = new Date(beijingTime);
    startTimeDate.setHours(startHours, startMinutes, 0, 0);

    const endTimeDate = new Date(beijingTime);
    endTimeDate.setHours(endHours, endMinutes, 0, 0);

    if (endTimeDate < startTimeDate) {
      return beijingTime >= startTimeDate || beijingTime < endTimeDate;
    }

    return beijingTime >= startTimeDate && beijingTime < endTimeDate;
  } catch (e) {
    console.error("Error in isWithinAutoCloseTime:", e);
    return false;
  }
}

async function PageContent({ restaurantId }: { restaurantId: string }) {
  const restaurant = await getCachedRestaurant(restaurantId);
  const settings = await getCachedSettings(restaurantId);
  const dishes = await getCachedDishes(restaurantId);

  if (restaurant && restaurant.points <= 0) {
    return <RestaurantClosed message="餐馆点数已用完" subMessage="暂时无法点餐，请联系管理员充值" icon={Ban} />;
  }
  
  if (settings.isRestaurantClosed) {
    return <RestaurantClosed message="本店已打烊" subMessage="请在营业时间再来点餐" />;
  }

  if (settings.isOnlineOrderingDisabled) {
    return <RestaurantClosed message="线上点单已关闭" subMessage="仅支持到店点餐或电话预定" />;
  }

  if (isWithinAutoCloseTime(settings.autoCloseStartTime, settings.autoCloseEndTime)) {
      return <RestaurantClosed 
          message="现在是休息时间" 
          subMessage={`每日休息时段: ${settings.autoCloseStartTime} - ${settings.autoCloseEndTime}`} 
      />;
  }

  return <OrderPageContent initialDishes={dishes} initialSettings={settings} restaurantId={restaurantId} />;
}

export default async function Page({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params; 
  if (!restaurantId) {
    notFound();
  }
  
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <PageContent restaurantId={restaurantId} />
    </Suspense>
  );
}

// Revalidate this page every time it's visited to ensure freshest data.
export const revalidate = 0;
