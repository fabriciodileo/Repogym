'use client';

import { ArrowDownRight, ArrowUpRight, Building2, CircleDollarSign, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';
import { apiRequest } from '@/lib/api-client';
import { buildQueryString } from '@/lib/query';
import { formatCurrency, formatDateOnly } from '@/lib/utils';

type Branch = { id: string; name: string };

type FinanceResponse = {
  data: {
    period: {
      dateFrom: string;
      dateTo: string;
    };
    totals: {
      income: number;
      expenses: number;
      net: number;
      overdueReceivables: number;
    };
    comparison: {
      incomeDelta: number;
      expensesDelta: number;
      netDelta: number;
    };
    breakdowns: {
      incomeByMethod: Array<{ method: string; count: number; totalAmount: number }>;
      expensesByCategory: Array<{ categoryName: string; parentCategoryName?: string | null; totalAmount: number; count: number }>;
      byBranch: Array<{ branchId: string; branchName: string; income: number; expense: number; net: number }>;
      openCashSessions: Array<{ id: string; branch: { name: string }; openedAt: string; expectedAmount: number }>;
    };
  };
};

export function FinanceView() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<FinanceResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const [branchesResponse, financeResponse] = await Promise.all([
      apiRequest<{ data: Branch[] }>('branches'),
      apiRequest<FinanceResponse>(`finance/summary${buildQueryString({ branchId, dateFrom, dateTo })}`),
    ]);

    setBranches(branchesResponse.data);
    setData(financeResponse.data);
  };

  useEffect(() => {
    loadData().catch((currentError) => setError(currentError.message));
  }, [branchId, dateFrom, dateTo]);

  if (error) {
    return <Card className="text-danger">{error}</Card>;
  }

  if (!data) {
    return <Card>Cargando resumen financiero...</Card>;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Finanzas" description="Resumen consolidado de ingresos, gastos, caja abierta y comparativa del periodo." />

      <Card className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label>
          <Select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            <option value="">Todas las sucursales</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-700">Desde</label>
          <input className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-ember focus:ring-4 focus:ring-ember/10" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-700">Hasta</label>
          <input className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-ember focus:ring-4 focus:ring-ember/10" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ingresos" value={formatCurrency(data.totals.income)} helper={`${data.comparison.incomeDelta}% vs periodo anterior`} icon={ArrowUpRight} />
        <StatCard label="Gastos" value={formatCurrency(data.totals.expenses)} helper={`${data.comparison.expensesDelta}% vs periodo anterior`} icon={ArrowDownRight} />
        <StatCard label="Balance neto" value={formatCurrency(data.totals.net)} helper={`${data.comparison.netDelta}% vs periodo anterior`} icon={CircleDollarSign} />
        <StatCard label="Morosidad" value={String(data.totals.overdueReceivables)} helper="Deudas vencidas abiertas" icon={Wallet} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Ingresos por metodo</h3>
          <div className="mt-5 space-y-3">
            {data.breakdowns.incomeByMethod.length ? (
              data.breakdowns.incomeByMethod.map((item) => (
                <div key={item.method} className="panel-muted flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-ink-900">{item.method}</p>
                    <p className="text-sm text-ink-600">{item.count} operaciones</p>
                  </div>
                  <p className="font-semibold text-ink-900">{formatCurrency(item.totalAmount)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-600">No hay ingresos registrados en el periodo.</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Gastos por categoria</h3>
          <div className="mt-5 space-y-3">
            {data.breakdowns.expensesByCategory.length ? (
              data.breakdowns.expensesByCategory.map((item) => (
                <div key={`${item.parentCategoryName ?? 'root'}-${item.categoryName}`} className="panel-muted flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-ink-900">{item.parentCategoryName ?? item.categoryName}</p>
                    <p className="text-sm text-ink-600">{item.parentCategoryName ? item.categoryName : `${item.count} gastos`}</p>
                  </div>
                  <p className="font-semibold text-ink-900">{formatCurrency(item.totalAmount)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-600">No hay gastos registrados en el periodo.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Resumen por sucursal</h3>
          <div className="mt-5 space-y-3">
            {data.breakdowns.byBranch.map((branch) => (
              <div key={branch.branchId} className="panel-muted p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">{branch.branchName}</p>
                    <p className="text-sm text-ink-600">Ingresos {formatCurrency(branch.income)} · Gastos {formatCurrency(branch.expense)}</p>
                  </div>
                  <div className="rounded-2xl bg-ink-900 px-3 py-2 text-sm font-semibold text-white">{formatCurrency(branch.net)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-ember/15 p-3 text-ember">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-ink-900">Cajas abiertas</h3>
              <p className="text-sm text-ink-600">Periodo consultado: {formatDateOnly(data.period.dateFrom)} al {formatDateOnly(data.period.dateTo)}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {data.breakdowns.openCashSessions.length ? (
              data.breakdowns.openCashSessions.map((session) => (
                <div key={session.id} className="panel-muted flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-ink-900">{session.branch.name}</p>
                    <p className="text-sm text-ink-600">Abierta el {formatDateOnly(session.openedAt)}</p>
                  </div>
                  <p className="font-semibold text-ink-900">{formatCurrency(session.expectedAmount)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-600">No hay cajas abiertas en este momento.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
