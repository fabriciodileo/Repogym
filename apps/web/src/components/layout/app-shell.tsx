'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import type { SessionUser } from '@/lib/types';

import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppShell({ user, children }: { user: SessionUser | null; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col gap-5 px-4 py-4 lg:flex-row lg:px-6 lg:py-6">
      <Sidebar currentPath={pathname} />
      <main className="flex-1 space-y-5">
        <Topbar user={user} />
        {children}
      </main>
    </div>
  );
}
