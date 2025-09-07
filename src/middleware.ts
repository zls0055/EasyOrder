
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPER_ADMIN_COOKIE = 'super_admin_session';
const KITCHEN_COOKIE_PREFIX = 'kitchen-session-';

// In-memory store for rate limiting
const ipRequestCounts = new Map<string, { count: number; expires: number }>();

async function checkRateLimit(request: NextRequest) {
  const isEnabled = process.env.RATE_LIMIT_ENABLED === 'true';
  if (!isEnabled) {
    return NextResponse.next();
  }

  const limit = parseInt(process.env.RATE_LIMIT_REQUESTS || '20', 10);
  const windowSeconds = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10);
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const now = Date.now();

  let ipData = ipRequestCounts.get(ip);
  
  if (ipData && ipData.expires < now) {
    ipRequestCounts.delete(ip);
    ipData = undefined;
  }

  const currentCount = (ipData?.count || 0) + 1;
  const expires = ipData?.expires || now + windowSeconds * 1000;

  if (currentCount > limit) {
    console.log(`-------->Too Many Requests ip: ${ip} / currentCount: ${currentCount} / limit: ${limit} / windowSeconds:${windowSeconds}`)
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  ipRequestCounts.set(ip, {
    count: currentCount,
    expires: expires,
  });

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
  const cookies = request.cookies;

  // Super Admin routes
  if (pathname.startsWith('/admin')) {
    const hasSuperAdminSession = cookies.has(SUPER_ADMIN_COOKIE);
    if (!hasSuperAdminSession && pathname.startsWith('/admin/dashboard')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (hasSuperAdminSession && pathname === '/admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.next();
  }
  
  const restaurantIdMatch = pathname.match(/^\/([^/]+)/);
  if (!restaurantIdMatch) {
    return NextResponse.next();
  }
  const restaurantId = restaurantIdMatch[1];
  
  if (['api', '_next', 'favicon.ico', 'images'].includes(restaurantId)) {
    return NextResponse.next();
  }

  // Restaurant management routes
  if (pathname.includes('/management')) {
    const hasSession = cookies.has(`session-${restaurantId}`);
    
    if (hasSession && pathname.endsWith('/management')) {
        return NextResponse.redirect(new URL(`/${restaurantId}/management/dashboard`, request.url));
    }
    
    if (!hasSession && pathname.includes('/management/dashboard')) {
        return NextResponse.redirect(new URL(`/${restaurantId}/management`, request.url));
    }
  }

  // Kitchen display routes
  if (pathname.startsWith(`/${restaurantId}/orders`)) {
    const hasKitchenSession = cookies.has(`${KITCHEN_COOKIE_PREFIX}${restaurantId}`);
    const isVerifyPage = pathname.endsWith('/verify');

    // This logic is now simplified and relies on page-level checks for password requirement.
    // If a user has a session but lands on verify, redirect them.
    if (hasKitchenSession && isVerifyPage) {
        return NextResponse.redirect(new URL(`/${restaurantId}/orders`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
