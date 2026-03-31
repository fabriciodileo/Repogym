import { NextResponse } from 'next/server';

import { API_BASE_URL, AUTH_COOKIE_KEYS, AUTH_COOKIE_MAX_AGE } from '@/lib/auth';

const secure = process.env.NODE_ENV === 'production';

function setAuthCookies(response: NextResponse, payload: any) {
  response.cookies.set(AUTH_COOKIE_KEYS.accessToken, payload.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE.accessToken,
  });
  response.cookies.set(AUTH_COOKIE_KEYS.refreshToken, payload.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE.refreshToken,
  });
  response.cookies.set(AUTH_COOKIE_KEYS.user, JSON.stringify(payload.user), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE.user,
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = await response.json();

  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status });
  }

  const nextResponse = NextResponse.json({ user: payload.user }, { status: 200 });
  setAuthCookies(nextResponse, payload);
  return nextResponse;
}
