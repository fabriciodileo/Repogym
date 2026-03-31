import { cookies } from 'next/headers';
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

function clearAuthCookies(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_KEYS.accessToken, '', { path: '/', maxAge: 0 });
  response.cookies.set(AUTH_COOKIE_KEYS.refreshToken, '', { path: '/', maxAge: 0 });
  response.cookies.set(AUTH_COOKIE_KEYS.user, '', { path: '/', maxAge: 0 });
}

async function performApiCall(path: string, method: string, accessToken: string | undefined, body?: string) {
  return fetch(`${API_BASE_URL}/api/v1/${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body,
    cache: 'no-store',
  });
}

async function buildResponse(source: Response, authPayload?: any, clearAuth = false) {
  const text = await source.text();
  const response = new NextResponse(text, {
    status: source.status,
    headers: {
      'Content-Type': source.headers.get('content-type') ?? 'application/json',
    },
  });

  if (authPayload) {
    setAuthCookies(response, authPayload);
  }

  if (clearAuth) {
    clearAuthCookies(response);
  }

  return response;
}

async function handleProxy(request: Request, path: string[]) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIE_KEYS.accessToken)?.value;
  const refreshToken = cookieStore.get(AUTH_COOKIE_KEYS.refreshToken)?.value;
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  const query = new URL(request.url).searchParams.toString();
  const resourcePath = `${path.join('/')}${query ? `?${query}` : ''}`;

  let apiResponse = await performApiCall(resourcePath, request.method, accessToken, body);

  if (apiResponse.status === 401 && refreshToken) {
    const refreshResponse = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });

    if (refreshResponse.ok) {
      const refreshPayload = await refreshResponse.json();
      apiResponse = await performApiCall(resourcePath, request.method, refreshPayload.accessToken, body);
      return buildResponse(apiResponse, refreshPayload);
    }

    return buildResponse(refreshResponse, undefined, true);
  }

  if (apiResponse.status === 401) {
    return buildResponse(apiResponse, undefined, true);
  }

  return buildResponse(apiResponse);
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

