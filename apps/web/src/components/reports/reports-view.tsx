'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { apiRequest } from '@/lib/api-client';
import { buildQueryString, openProxyCsv } from '@/lib/query';
import { formatCurrency, formatDateOnly, formatDateTime } from '@/lib/utils';

type Branch = { id: string; name: string };

type ReportResponse = {
  data: {
    report: string;
    data: any[];
    summary: Record<string, any>;
  };
};

const reportOptions = [
  { value: 'clients-status', label: 'Clientes por estado' },
  { value: 'memberships-expiring', label: 'Membresias por vencer' },
  { value: 'income', label: 'Ingresos' },
  { value: 'expenses', label: 'Gastos' },
  { value: 'balance', label: 'Balance' },
  { value: 'accesses', label: 'Accesos' },
  { value: 'top-plans', label: 'Top planes' },
  { value: 'payment-methods', label: 'Medios de pago' },
  { value: 'class-attendance', label: 'Asistencia a clases' },
  { value: 'low-stock', label: 'Stock bajo' },
];

function normalizeRows(report: string, rows: any[], summary?: Record<string, any>): Array<Record<string, string>> {
  switch (report) {
    case 'clients-status':
      return rows.map((client) => ({
        Cliente: `${client.firstName} ${client.lastName}`,
        Socio: client.memberNumber,
        Estado: client.status,
        Sucursal: client.branch?.name ?? '-',
        Plan: client.memberships[0]?.plan?.name ?? '-',
        Vence: client.memberships[0]?.endsAt ? formatDateOnly(client.memberships[0].endsAt) : '-',
      }));
    case 'memberships-expiring':
      return rows.map((membership) => ({
        Cliente: `${membership.client.firstName} ${membership.client.lastName}`,
        Plan: membership.plan.name,
        Sucursal: membership.branch.name,
        Vence: formatDateOnly(membership.endsAt),
      }));
    case 'income':
      return rows.map((payment) => ({
        Fecha: formatDateTime(payment.paidAt),
        Concepto: payment.concept,
        Cliente: payment.client ? `${payment.client.firstName} ${payment.client.lastName}` : '-',
        Metodo: payment.method,
        Monto: formatCurrency(Number(payment.finalAmount)),
      }));
    case 'expenses':
      return rows.map((expense) => ({
        Fecha: formatDateTime(expense.expenseDate),
        Descripcion: expense.description,
        Categoria: expense.category.parent?.name ?? expense.category.name,
        Subcategoria: expense.category.parent ? expense.category.name : expense.subcategory ?? '-',
        Metodo: expense.method,
        Monto: formatCurrency(Number(expense.amount)),
      }));
    case 'balance':
      return [
        {
          Ingresos: formatCurrency(summary?.totals?.income ?? 0),
          Gastos: formatCurrency(summary?.totals?.expenses ?? 0),
          Neto: formatCurrency(summary?.totals?.net ?? 0),
        },
      ];
    case 'accesses':
      return rows.map((access) => ({
        Fecha: formatDateTime(access.attemptedAt),
        Cliente: access.client ? `${access.client.firstName} ${access.client.lastName}` : 'Intento sin cliente',
        Resultado: access.result,
        Motivo: access.denialReason ?? '-',
        Sucursal: access.branch.name,
      }));
    case 'top-plans':
      return rows.map((item) => ({
        Plan: item.planId,
        Ventas: String(item._count.id),
        Monto: formatCurrency(Number(item._sum.agreedAmount ?? 0)),
      }));
    case 'payment-methods':
      return rows.map((item) => ({
        Metodo: item.method,
        Operaciones: String(item._count.id),
        Total: formatCurrency(Number(item._sum.finalAmount ?? 0)),
      }));
    case 'class-attendance':
      return rows.map((schedule) => ({
        Actividad: schedule.activity.name,
        Inicio: formatDateTime(schedule.startsAt),
        Sucursal: schedule.branch.name,
        Estado: schedule.status,
        Inscriptos: String(schedule.enrollments.length),
        Asistieron: String(schedule.enrollments.filter((item: any) => item.status === 'ATTENDED').length),
      }));
    case 'low-stock':
      return rows.map((product) => ({
        Producto: product.name,
        Categoria: product.category.name,
        Sucursal: product.branch?.name ?? '-',
        Stock: String(product.stock),
        Minimo: String(product.minStock),
      }));
    default:
      return [];
  }
}

export function ReportsView() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState('clients-status');
  const [result, setResult] = useState<ReportResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const [branchesResponse, reportResponse] = await Promise.all([
      apiRequest<{ data: Branch[] }>('branches'),
      apiRequest<ReportResponse>(`reports/${report}${buildQueryString({ branchId, dateFrom, dateTo })}`),
    ]);

    setBranches(branchesResponse.data);
    setResult(reportResponse.data);
  };

  useEffect(() => {
    loadData().catch((currentError) => setError(currentError.message));
  }, [branchId, dateFrom, dateTo, report]);

  const rows = useMemo(() => normalizeRows(report, result?.data ?? [], result?.summary), [report, result]);
  const columns = rows[0] ? Object.keys(rows[0]) : ['Sin datos'];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reportes"
        description="Consultas operativas, financieras y comerciales con exportacion CSV inmediata."
        actions={
          <Button
            variant="secondary"
            onClick={() => openProxyCsv(`reports/${report}/export/csv${buildQueryString({ branchId, dateFrom, dateTo })}`)}
          >
            Exportar CSV
          </Button>
        }
      />

      <Card className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-700">Reporte</label>
          <Select value={report} onChange={(event) => setReport(event.target.value)}>
            {reportOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
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

      <Card>
        <h3 className="text-2xl font-bold text-ink-900">Resumen</h3>
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        {result ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {Object.entries(result.summary ?? {}).map(([key, value]) => (
              <div key={key} className="rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-700">
                <span className="font-semibold text-ink-900">{key}</span>: {typeof value === 'number' ? value : JSON.stringify(value)}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-600">Cargando reporte...</p>
        )}
      </Card>

      <DataTable columns={columns}>
        {rows.length ? (
          rows.map((row, index) => (
            <tr key={`${report}-${index}`}>
              {columns.map((column) => (
                <td key={`${report}-${index}-${column}`} className="px-5 py-4 text-sm text-ink-700">
                  {row[column]}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td className="px-5 py-6 text-sm text-ink-500" colSpan={columns.length}>
              No hay datos para los filtros seleccionados.
            </td>
          </tr>
        )}
      </DataTable>
    </div>
  );
}
