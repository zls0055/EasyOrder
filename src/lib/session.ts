
'use server';

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSettings } from './settings';
import { adminDb } from '@/lib/firebase-admin';

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error('SESSION_SECRET is not set in the environment variables.');
}
const key = new TextEncoder().encode(sessionSecret);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

async function decrypt(input: string): Promise<any> {
  if (!input) return null;
  try {
    const { payload } = await jwtVerify(input, key, { algorithms: ['HS256'] });
    return payload;
  } catch (error) {
    return null;
  }
}

// --- Restaurant Admin Session ---

export async function getSession(restaurantId: string) {
  const cookieName = `session-${restaurantId}`;
  const sessionCookie = (await cookies()).get(cookieName)?.value;
  if (!sessionCookie) return null;
  return await decrypt(sessionCookie);
}

export async function logout(restaurantId: string) {
    const cookieName = `session-${restaurantId}`;
    (await cookies()).set(cookieName, '', { 
        expires: new Date(0), 
        path: `/${restaurantId}/management`,
        secure: true,
        sameSite: 'none'
    });
    redirect(`/${restaurantId}/management`);
}


// --- Kitchen Display Session ---
const KITCHEN_COOKIE_PREFIX = 'kitchen-session-';

export async function verifyKitchenPassword(restaurantId: string, passwordAttempt?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getSettings(restaurantId);
    // If password is not required (empty string), verification is successful.
    if (!settings.kitchenDisplayPassword) {
        return { success: false, error: '此看板无需密码，请直接访问。' };
    }

    if (passwordAttempt === settings.kitchenDisplayPassword) {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const session = await encrypt({ restaurantId, expires });
      const cookieName = `${KITCHEN_COOKIE_PREFIX}${restaurantId}`;
      (await cookies()).set(cookieName, session, {
        expires,
        httpOnly: true,
        path: `/${restaurantId}/orders`,
        secure: true,
        sameSite: 'none',
      });
      return { success: true };
    } else {
      return { success: false, error: '密码不正确。' };
    }
  } catch (error) {
    console.error("Error during kitchen password verification:", error);
    return { success: false, error: '验证时发生服务器错误。' };
  }
}

export async function getKitchenSession(restaurantId: string) {
  const cookieName = `${KITCHEN_COOKIE_PREFIX}${restaurantId}`;
  const sessionCookie = (await cookies()).get(cookieName)?.value;
  if (!sessionCookie) return null;
  return await decrypt(sessionCookie);
}


// --- Super Admin Session ---

const SUPER_ADMIN_COLLECTION = 'superAdmin';
const SUPER_ADMIN_CONFIG_DOC = 'config';
const SUPER_ADMIN_COOKIE = 'super_admin_session';
const DEFAULT_SUPER_ADMIN_PASSWORD = 'admin123456';

async function getSuperAdminPassword(): Promise<string> {
    const configRef = adminDb.collection(SUPER_ADMIN_COLLECTION).doc(SUPER_ADMIN_CONFIG_DOC);
    const docSnap = await configRef.get();
    if (!docSnap.exists || !docSnap.data()?.password) {
        // If doc or password doesn't exist, create it with a default password
        await configRef.set({ password: DEFAULT_SUPER_ADMIN_PASSWORD }, { merge: true });
        return DEFAULT_SUPER_ADMIN_PASSWORD;
    }
    return docSnap.data()!.password;
}

export async function loginSuperAdmin(password: string): Promise<{error?: string}> {
    const correctPassword = await getSuperAdminPassword();
    if (password !== correctPassword) {
        return { error: '密码无效。' };
    }

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = await encrypt({ superAdmin: true, expires });
    
    (await cookies()).set(SUPER_ADMIN_COOKIE, session, { 
      expires, 
      httpOnly: true, 
      path: '/admin',
      secure: true,
      sameSite: 'none'
    });
    
    redirect('/admin/dashboard');
}

export async function getSuperAdminSession() {
  const sessionCookie = (await cookies()).get(SUPER_ADMIN_COOKIE)?.value;
  if (!sessionCookie) return null;
  return await decrypt(sessionCookie);
}

export async function logoutSuperAdmin() {
    (await cookies()).set(SUPER_ADMIN_COOKIE, '', { 
        expires: new Date(0), 
        path: '/admin',
        secure: true,
        sameSite: 'none'
    });
    redirect('/admin');
}

export async function updateSuperAdminPassword(prevState: any, formData: FormData): Promise<{error?: string, success?: string}> {
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    
    const correctPassword = await getSuperAdminPassword();

    if (currentPassword !== correctPassword) {
        return { error: '当前密码不正确。' };
    }
    if (!newPassword || newPassword.length < 6) {
        return { error: '新密码长度不能少于6位。' };
    }
    if (newPassword !== confirmPassword) {
        return { error: '两次输入的新密码不匹配。' };
    }
    
    try {
        const configRef = adminDb.collection(SUPER_ADMIN_COLLECTION).doc(SUPER_ADMIN_CONFIG_DOC);
        await configRef.update({ password: newPassword });
    } catch (error) {
        console.error("Failed to update super admin password in Firestore:", error);
        return { error: '更新密码时发生服务器错误。' };
    }
    
    await logoutSuperAdmin();
    return { success: "密码已更新，请重新登录。" };
}
