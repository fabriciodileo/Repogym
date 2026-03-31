import { Bell, Search } from 'lucide-react';

import type { SessionUser } from '@/lib/types';

import { LogoutButton } from './logout-button';

export function Topbar({ user }: { user: SessionUser | null }) {
  return (
    <header className="panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="mono text-xs uppercase tracking-[0.3em] text-ink-500">Operacion diaria</p>
        <h2 className="mt-2 text-xl font-bold text-ink-900">Tablero administrativo</h2>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-500">
          <Search className="h-4 w-4" />
          <span>Busqueda global preparada para siguiente fase</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-white">
          <Bell className="h-4 w-4" />
          <div className="text-sm">
            <p className="font-semibold">{user ? `${user.firstName} ${user.lastName}` : 'Sesion activa'}</p>
            <p className="text-white/70">{user?.role.name ?? 'Sin rol'}</p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
