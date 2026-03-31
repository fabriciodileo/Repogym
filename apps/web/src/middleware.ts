import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { AUTH_COOKIE_KEYS } from '@/lib/auth';

const protectedPrefixes = [
  '/dashboard',
  '/clientes',
  '/planes',
  '/membresias',
  '/pagos',
  '/accesos',
  '/usuarios',
  '/configuracion',
];

export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_KEYS.accessToken)?.value;
  const pathname = request.nextUrl.pathname;

  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/clientes/:path*',
    '/planes/:path*',
    '/membresias/:path*',
    '/pagos/:path*',
    '/accesos/:path*',
    '/usuarios/:path*',
    '/configuracion/:path*',
  ],
};
