import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { API_BASE_URL, AUTH_COOKIE_KEYS } from '@/lib/auth';

const clearCookieOptions = {
  path: '/',
  maxAge: 0,
};

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(AUTH_COOKIE_KEYS.refreshToken)?.value;
  const accessToken = cookieStore.get(AUTH_COOKIE_KEYS.accessToken)?.value;

  if (refreshToken && accessToken) {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    }).catch(() => null);
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(AUTH_COOKIE_KEYS.accessToken, '', clearCookieOptions);
  response.cookies.set(AUTH_COOKIE_KEYS.refreshToken, '', clearCookieOptions);
  response.cookies.set(AUTH_COOKIE_KEYS.user, '', clearCookieOptions);
  return response;
}
