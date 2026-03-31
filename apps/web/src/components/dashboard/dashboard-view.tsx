'use client';

import { Activity, ArrowUpRight, CalendarClock, CircleAlert, Coins, DoorOpen } from 'lucide-react';
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
      expiringMemberships: number;
      todayAccesses: number;
      dayIncome: number;
      monthIncome: number;
      todayExpenses: number;
      monthExpenses: number;
      netBalance: number;
      monthIncomeDelta: number;
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
        description="Resumen operativo con foco en cobros, riesgo de mora, accesos y membresias proximas a vencer."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Ingresos del dia" value={formatCurrency(data.indicators.dayIncome)} helper="Cobranza ya registrada hoy" icon={Coins} />
        <StatCard label="Ingresos del mes" value={formatCurrency(data.indicators.monthIncome)} helper={`${data.indicators.monthIncomeDelta}% vs mes anterior`} icon={ArrowUpRight} />
        <StatCard label="Clientes activos" value={String(data.indicators.activeClients)} helper="Con estado operativo activo" icon={Activity} />
        <StatCard label="Por vencer" value={String(data.indicators.expiringMemberships)} helper="En los proximos 7 dias" icon={CalendarClock} />
        <StatCard label="Accesos hoy" value={String(data.indicators.todayAccesses)} helper="Ingresos permitidos hoy" icon={DoorOpen} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
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
                    <p className="font-semibold text-ink-900">
                      {membership.client.firstName} {membership.client.lastName}
                    </p>
                    <p className="mt-1 text-sm text-ink-600">
                      {membership.client.memberNumber} · {membership.plan.name}
                    </p>
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
                    <p className="font-semibold text-ink-900">
                      {access.client ? `${access.client.firstName} ${access.client.lastName}` : 'Intento sin cliente'}
                    </p>
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
    </div>
  );
}
