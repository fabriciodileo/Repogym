import { cookies } from 'next/headers';

import { AUTH_COOKIE_KEYS, API_BASE_URL } from './auth';

export async function serverApiFetch<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_KEYS.accessToken)?.value;

  if (!token) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}
