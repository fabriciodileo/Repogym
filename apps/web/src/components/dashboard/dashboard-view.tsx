'use client';

import { Activity, ArrowUpRight, CalendarClock, CircleAlert, Coins, DoorOpen, PackageSearch, ReceiptText, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency, formatDateOnly, formatDateTime } from '@/lib/utils';

type DashboardResponse = {
  data: {
    indicators: {
      activeClients: number;
      overdueReceivables: number;
      overdueClients: number;
      expiringMemberships: number;
      todayAccesses: number;
      dayIncome: number;
      monthIncome: number;
      todayExpenses: number;
      monthExpenses: number;
      netBalance: number;
      dayNetBalance: number;
      monthIncomeDelta: number;
      openCashSessions: number;
      lowStockProducts: number;
      upcomingClasses: number;
    };
    upcomingExpirations: Array<{
      id: string;
      endsAt: string;
      client: { firstName: string; lastName: string; memberNumber: string };
      plan: { name: string };
    }>;
    recentAccesses: Array<{
      id: string;
      attemptedAt: string;
      result: string;
      client?: { firstName: string; lastName: string; memberNumber: string } | null;
      message?: string | null;
    }>;
    lowStockProducts: Array<{
      id: string;
      name: string;
      code: string;
      stock: number;
      minStock: number;
      branch?: { name: string } | null;
    }>;
    openCashSessions: Array<{
      id: string;
      branch: { name: string };
      openedAt: string;
      expectedAmount: number;
    }>;
    upcomingClasses: Array<{
      id: string;
      startsAt: string;
      room?: string | null;
      branch: { name: string };
      instructor?: { firstName: string; lastName: string } | null;
      activity: { name: string };
      enrolledCount: number;
      capacity: number;
    }>;
  };
};

export function DashboardView() {
  const [data, setData] = useState<DashboardResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<DashboardResponse>('dashboard/overview')
      .then((response) => setData(response.data))
      .catch((currentError) => setError(currentError.message));
  }, []);

  if (error) {
    return <Card className="text-danger">{error}</Card>;
  }

  if (!data) {
    return <Card>Cargando tablero...</Card>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard principal"
        description="Resumen operativo diario con foco en cobros, gastos, riesgo de mora, caja, accesos, stock y clases proximas."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Ingresos del dia" value={formatCurrency(data.indicators.dayIncome)} helper={`Balance diario ${formatCurrency(data.indicators.dayNetBalance)}`} icon={Coins} />
        <StatCard label="Ingresos del mes" value={formatCurrency(data.indicators.monthIncome)} helper={`${data.indicators.monthIncomeDelta}% vs mes anterior`} icon={ArrowUpRight} />
        <StatCard label="Gastos del dia" value={formatCurrency(data.indicators.todayExpenses)} helper={`Gastos del mes ${formatCurrency(data.indicators.monthExpenses)}`} icon={ReceiptText} />
        <StatCard label="Clientes activos" value={String(data.indicators.activeClients)} helper={`${data.indicators.overdueClients} clientes morosos`} icon={Activity} />
        <StatCard label="Accesos hoy" value={String(data.indicators.todayAccesses)} helper={`${data.indicators.openCashSessions} cajas abiertas`} icon={DoorOpen} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Por vencer" value={String(data.indicators.expiringMemberships)} helper="En los proximos 7 dias" icon={CalendarClock} />
        <StatCard label="Morosidad" value={String(data.indicators.overdueReceivables)} helper="Deudas vencidas abiertas" icon={Wallet} />
        <StatCard label="Stock bajo" value={String(data.indicators.lowStockProducts)} helper="Productos bajo minimo" icon={PackageSearch} />
        <StatCard label="Clases proximas" value={String(data.indicators.upcomingClasses)} helper="En las proximas 24 horas" icon={CircleAlert} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="mono text-xs uppercase tracking-[0.24em] text-ink-500">Riesgo operativo</p>
              <h3 className="mt-2 text-2xl font-bold text-ink-900">Membresias por vencer</h3>
            </div>
            <div className="rounded-2xl bg-warning/15 px-4 py-3 text-warning">
              <CircleAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {data.upcomingExpirations.length ? (
              data.upcomingExpirations.map((membership) => (
                <div key={membership.id} className="panel-muted flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-ink-900">{membership.client.firstName} {membership.client.lastName}</p>
                    <p className="mt-1 text-sm text-ink-600">{membership.client.memberNumber} · {membership.plan.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Vence</p>
                    <p className="mt-1 font-semibold text-ink-900">{formatDateOnly(membership.endsAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-600">No hay vencimientos cercanos.</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Accesos recientes</h3>
          <div className="mt-6 space-y-3">
            {data.recentAccesses.map((access) => (
              <div key={access.id} className="panel-muted p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">{access.client ? `${access.client.firstName} ${access.client.lastName}` : 'Intento sin cliente'}</p>
                    <p className="mt-1 text-sm text-ink-600">{access.client?.memberNumber ?? access.message ?? '-'}</p>
                  </div>
                  <StatusBadge value={access.result} />
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-ink-500">{formatDateTime(access.attemptedAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Stock bajo</h3>
          <div className="mt-5 space-y-3">
            {data.lowStockProducts.length ? (
              data.lowStockProducts.map((product) => (
                <div key={product.id} className="panel-muted flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-ink-900">{product.name}</p>
                    <p className="text-sm text-ink-600">{product.code} · {product.branch?.name ?? 'Global'}</p>
                  </div>
                  <p className="font-semibold text-ink-900">{product.stock} / {product.minStock}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-600">Sin alertas de stock bajo.</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Cajas abiertas</h3>
          <div className="mt-5 space-y-3">
            {data.openCashSessions.length ? (
              data.openCashSessions.map((session) => (
                <div key={session.id} className="panel-muted p-4">
                  <p className="font-semibold text-ink-900">{session.branch.name}</p>
                  <p className="mt-1 text-sm text-ink-600">{formatDateTime(session.openedAt)}</p>
                  <p className="mt-2 font-semibold text-ink-900">{formatCurrency(session.expectedAmount)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-600">No hay cajas abiertas.</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Proximas clases</h3>
          <div className="mt-5 space-y-3">
            {data.upcomingClasses.length ? (
              data.upcomingClasses.map((schedule) => (
                <div key={schedule.id} className="panel-muted p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink-900">{schedule.activity.name}</p>
                      <p className="text-sm text-ink-600">{schedule.branch.name} · {schedule.room ?? 'Sin sala'}</p>
                    </div>
                    <div className="rounded-2xl bg-ink-900 px-3 py-2 text-xs font-semibold text-white">{schedule.enrolledCount}/{schedule.capacity}</div>
                  </div>
                  <p className="mt-3 text-sm text-ink-600">{formatDateTime(schedule.startsAt)} · {schedule.instructor ? `${schedule.instructor.firstName} ${schedule.instructor.lastName}` : 'Sin instructor'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-600">No hay clases programadas para las proximas horas.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
