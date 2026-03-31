import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { AUTH_COOKIE_KEYS } from '@/lib/auth';
import type { SessionUser } from '@/lib/types';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIE_KEYS.accessToken)?.value;
  const rawUser = cookieStore.get(AUTH_COOKIE_KEYS.user)?.value;

  if (!accessToken) {
    redirect('/login');
  }

  const user = rawUser ? (JSON.parse(rawUser) as SessionUser) : null;

  return <AppShell user={user}>{children}</AppShell>;
}
