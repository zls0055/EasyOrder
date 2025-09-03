
'use server';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession, getSuperAdminSession, getKitchenSession } from '@/lib/session';
import { getSettings } from './lib/settings';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Super Admin routes
  if (pathname.startsWith('/admin')) {
    const superAdminSession = await getSuperAdminSession();
    if (!superAdminSession && pathname !== '/admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (superAdminSession && pathname === '/admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.next();
  }
  
  const restaurantIdMatch = pathname.match(/^\/([^/]+)/);
  if (!restaurantIdMatch) {
    return NextResponse.next();
  }
  const restaurantId = restaurantIdMatch[1];
  
  // Exclude non-restaurant routes that might match the dynamic segment
  if (['api', '_next', 'favicon.ico', 'images'].includes(restaurantId)) {
    return NextResponse.next();
  }

  // Restaurant-specific routes
  const session = await getSession(restaurantId);

  // Redirect to dashboard if trying to access login page while logged in
  if (session && pathname.endsWith('/management')) {
      return NextResponse.redirect(new URL(`/${restaurantId}/management/dashboard`, request.url));
  }
  
  // Protect dashboard and redirect to login if not authenticated
  if (!session && pathname.includes('/management/dashboard')) {
      return NextResponse.redirect(new URL(`/${restaurantId}/management`, request.url));
  }


  // Kitchen display routes
  if (pathname.startsWith(`/${restaurantId}/orders`)) {
    // Fetch settings to check if password is required
    const settings = await getSettings(restaurantId);
    const passwordRequired = !!settings.kitchenDisplayPassword;

    // If password is NOT required, and user tries to access verify page, redirect them to orders.
    // This MUST come first to prevent redirect loops.
    if (!passwordRequired && pathname.endsWith('/verify')) {
        return NextResponse.redirect(new URL(`/${restaurantId}/orders`, request.url));
    }

    if (passwordRequired) {
        const kitchenSession = await getKitchenSession(restaurantId);
        if (!kitchenSession && !pathname.endsWith('/verify')) {
            return NextResponse.redirect(new URL(`/${restaurantId}/orders/verify`, request.url));
        }
        if (kitchenSession && pathname.endsWith('/verify')) {
            return NextResponse.redirect(new URL(`/${restaurantId}/orders`, request.url));
        }
    }
  }


  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
