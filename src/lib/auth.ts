
'use server';

import { getSettings } from '@/lib/settings';
import { encrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type LoginState = {
  success?: boolean;
  error?: string;
};

// Updated function signature to explicitly accept restaurantId
export async function login(restaurantId: string, prevState: unknown, formData: FormData): Promise<LoginState> {
  const username = formData.get('username')?.toString();
  const password = formData.get('password')?.toString();
  
  if (!restaurantId) {
    return { error: '缺少餐馆ID，无法登录。' };
  }

  if (!username || !password) {
    return { error: '请输入用户名和密码。' };
  }

  try {
    const settings = await getSettings(restaurantId);
    if (username !== settings.adminUsername || password !== settings.adminPassword) {
      return { error: '用户名或密码无效。' };
    }

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = await encrypt({ user: username, restaurantId, expires });
    
    const cookieName = `session-${restaurantId}`;
    (await cookies()).set(cookieName, session, { 
      expires, 
      httpOnly: true, 
      path: `/${restaurantId}/management`,
      secure: true,
      sameSite: 'none'
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { error: `登录时发生服务器错误: ${errorMessage}` };
  }

  redirect(`/${restaurantId}/management/dashboard`);
}
