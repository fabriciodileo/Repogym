import Link from 'next/link';
import {
  BarChart3,
  BellRing,
  Boxes,
  CreditCard,
  DoorOpen,
  LayoutDashboard,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
  CalendarRange,
  Landmark,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/planes', label: 'Planes', icon: Settings2 },
  { href: '/membresias', label: 'Membresias', icon: Wallet },
  { href: '/pagos', label: 'Pagos', icon: CreditCard },
  { href: '/gastos', label: 'Gastos', icon: ReceiptText },
  { href: '/caja', label: 'Caja', icon: Landmark },
  { href: '/finanzas', label: 'Finanzas', icon: BarChart3 },
  { href: '/reportes', label: 'Reportes', icon: Settings2 },
  { href: '/productos', label: 'Productos', icon: Boxes },
  { href: '/clases', label: 'Clases', icon: CalendarRange },
  { href: '/notificaciones', label: 'Notificaciones', icon: BellRing },
  { href: '/accesos', label: 'Accesos', icon: DoorOpen },
  { href: '/usuarios', label: 'Usuarios', icon: ShieldCheck },
  { href: '/configuracion', label: 'Configuracion', icon: Wrench },
];

export function Sidebar({ currentPath }: { currentPath: string }) {
  return (
    <aside className="panel flex h-full flex-col gap-8 p-5 lg:w-[280px]">
      <div>
        <p className="mono text-xs uppercase tracking-[0.3em] text-ember">GYM OPS</p>
        <h1 className="mt-3 text-2xl font-bold text-ink-900">Control Pro</h1>
        <p className="mt-2 text-sm text-ink-600">Administracion operativa y acceso fisico en una sola consola.</p>
      </div>
      <nav className="flex flex-1 flex-col gap-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = currentPath === href || currentPath.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                active
                  ? 'bg-ink-900 text-white shadow-lg shadow-ink-900/15'
                  : 'text-ink-700 hover:bg-ink-50',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="panel-muted p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-ember/15 p-3 text-ember">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">Base productiva</p>
            <p className="text-xs text-ink-600">Ahora cubre caja, stock, clases y notificaciones.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
