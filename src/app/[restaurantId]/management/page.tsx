
import type { Metadata } from 'next';
import { getCachedRestaurant } from '@/lib/settings';
import { notFound } from 'next/navigation';
import LoginForm from '@/components/login-form';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ restaurantId: string }> }): Promise<Metadata> {
  const { restaurantId } = await params;
  const restaurant = await getCachedRestaurant(restaurantId);
  const title = restaurant ? `${restaurant.name} - 管理后台登录` : '管理后台登录';

  return {
    title: title,
    description: `登录到 ${restaurant?.name || '餐馆'} 的管理后台。`,
  };
}

export default async function LoginPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;
  
  // Redirect to dashboard if already logged in
  const session = await getSession(restaurantId);
  if (session) {
    redirect(`/${restaurantId}/management/dashboard`);
  }

  return <LoginForm restaurantId={restaurantId} />;
}
