
'use server';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession, getSuperAdminSession, getKitchenSession } from '@/lib/session';
import { getSettings } from './lib/settings';

// In-memory store for rate limiting
const ipRequestCounts = new Map<string, { count: number; expires: number }>();

async function checkRateLimit(request: NextRequest) {
  const isEnabled = process.env.RATE_LIMIT_ENABLED === 'true';
  if (!isEnabled) {
    return NextResponse.next();
  }

  const limit = parseInt(process.env.RATE_LIMIT_REQUESTS || '20', 10);
  // console.log(`process.env.RATE_LIMIT_REQUESTS -> ${process.env.RATE_LIMIT_REQUESTS}`)
  // console.log(`limit-----> ${limit}`)
  const windowSeconds = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10);
  // console.log(`windowSeconds----> ${windowSeconds}`)
  // console.log(`process.env.RATE_LIMIT_WINDOW_SECONDS -> ${process.env.RATE_LIMIT_WINDOW_SECONDS}`)
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const now = Date.now();

  let ipData = ipRequestCounts.get(ip);
  
  // If record has expired, reset it
  if (ipData && ipData.expires < now) {
    ipRequestCounts.delete(ip);
  }
  ipData = ipRequestCounts.get(ip);
  const currentCount = (ipRequestCounts.get(ip)?.count || 0) + 1;
  const expires = ipData?.expires || now + windowSeconds * 1000;

  if (currentCount > limit) {
    console.log(`-------->Too Many Requests ip: ${ip} / currentCount: ${currentCount} / limit: ${limit} / windowSeconds:${windowSeconds}`)
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  ipRequestCounts.set(ip, {
    count: currentCount,
    expires: expires,
  });

  // Clean up expired entries periodically to prevent memory leaks
  if (ipRequestCounts.size % 100 === 0) {
    for (const [key, value] of ipRequestCounts.entries()) {
      if (value.expires < now) {
        ipRequestCounts.delete(key);
      }
    }
  }
  
  return NextResponse.next();
}


export async function middleware(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request);
  if (rateLimitResponse.status === 429) {
    return rateLimitResponse;
  }

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
    const isVerifyPage = pathname.endsWith('/verify');
    
    if (passwordRequired) {
        const kitchenSession = await getKitchenSession(restaurantId);
        // If password is required but no session, and user is NOT on verify page, redirect to verify
        if (!kitchenSession && !isVerifyPage) {
            return NextResponse.redirect(new URL(`/${restaurantId}/orders/verify`, request.url));
        }
        // If password is required and session EXISTS, but user is ON verify page, redirect to orders
        if (kitchenSession && isVerifyPage) {
            return NextResponse.redirect(new URL(`/${restaurantId}/orders`, request.url));
        }
    } else {
        // If password is NOT required and user is ON verify page, redirect to orders
        if (isVerifyPage) {
            return NextResponse.redirect(new URL(`/${restaurantId}/orders`, request.url));
        }
    }
  }


  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
