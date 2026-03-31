import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AUTH_COOKIE_KEYS } from '@/lib/auth';

export default async function HomePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIE_KEYS.accessToken)?.value;

  redirect(accessToken ? '/dashboard' : '/login');
}
