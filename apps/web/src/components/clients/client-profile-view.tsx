'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency, formatDateOnly, formatDateTime } from '@/lib/utils';

export function ClientProfileView({ clientId }: { clientId: string }) {
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    apiRequest<{ data: any }>(`clients/${clientId}/profile`).then((response) => setProfile(response.data));
  }, [clientId]);

  if (!profile) {
    return <Card>Cargando perfil...</Card>;
  }

  return (
    <div className="space-y-5">
      <PageHeader title={`${profile.firstName} ${profile.lastName}`} description={`Socio ${profile.memberNumber} · ${profile.branch.name}`} actions={<Link href="/clientes" className="rounded-2xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white">Volver</Link>} />

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Ficha general</h3>
          <div className="mt-6 grid gap-4 text-sm text-ink-700">
            <div><span className="font-semibold text-ink-900">Estado:</span> <StatusBadge value={profile.status} /></div>
            <div><span className="font-semibold text-ink-900">DNI:</span> {profile.dni}</div>
            <div><span className="font-semibold text-ink-900">Telefono:</span> {profile.phone ?? '-'}</div>
            <div><span className="font-semibold text-ink-900">Email:</span> {profile.email ?? '-'}</div>
            <div><span className="font-semibold text-ink-900">Alta:</span> {formatDateOnly(profile.enrollmentDate)}</div>
            <div><span className="font-semibold text-ink-900">Bloqueo administrativo:</span> {profile.administrativeBlock ? profile.administrativeBlockReason ?? 'Si' : 'No'}</div>
          </div>
        </Card>

        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Resumen financiero</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="panel-muted p-4"><p className="text-xs uppercase tracking-[0.16em] text-ink-500">Deuda pendiente</p><p className="mt-2 text-2xl font-bold text-ink-900">{formatCurrency(profile.receivables.filter((item: any) => ['OPEN','PARTIAL','OVERDUE'].includes(item.status)).reduce((sum: number, item: any) => sum + Number(item.balanceAmount), 0))}</p></div>
            <div className="panel-muted p-4"><p className="text-xs uppercase tracking-[0.16em] text-ink-500">Pagos registrados</p><p className="mt-2 text-2xl font-bold text-ink-900">{profile.payments.length}</p></div>
            <div className="panel-muted p-4"><p className="text-xs uppercase tracking-[0.16em] text-ink-500">Credenciales</p><p className="mt-2 text-2xl font-bold text-ink-900">{profile.accessCredentials.length}</p></div>
          </div>
        </Card>
      </div>

      <DataTable columns={['Membresia', 'Plan', 'Vigencia', 'Estado']}>
        {profile.memberships.map((membership: any) => (
          <tr key={membership.id}>
            <td className="px-5 py-4 text-sm text-ink-600">{membership.id.slice(0, 8)}</td>
            <td className="px-5 py-4 text-sm text-ink-900">{membership.plan.name}</td>
            <td className="px-5 py-4 text-sm text-ink-600">{formatDateOnly(membership.startsAt)} - {formatDateOnly(membership.endsAt)}</td>
            <td className="px-5 py-4"><StatusBadge value={membership.status} /></td>
          </tr>
        ))}
      </DataTable>

      <div className="grid gap-5 xl:grid-cols-2">
        <DataTable columns={['Pago', 'Metodo', 'Fecha', 'Estado']}>
          {profile.payments.map((payment: any) => (
            <tr key={payment.id}>
              <td className="px-5 py-4 text-sm text-ink-900">{formatCurrency(Number(payment.finalAmount))}</td>
              <td className="px-5 py-4 text-sm text-ink-600">{payment.method}</td>
              <td className="px-5 py-4 text-sm text-ink-600">{formatDateTime(payment.paidAt)}</td>
              <td className="px-5 py-4"><StatusBadge value={payment.status} /></td>
            </tr>
          ))}
        </DataTable>

        <DataTable columns={['Acceso', 'Fecha', 'Resultado', 'Detalle']}>
          {profile.accessLogs.map((log: any) => (
            <tr key={log.id}>
              <td className="px-5 py-4 text-sm text-ink-600">{log.device?.name ?? log.method}</td>
              <td className="px-5 py-4 text-sm text-ink-600">{formatDateTime(log.attemptedAt)}</td>
              <td className="px-5 py-4"><StatusBadge value={log.result} /></td>
              <td className="px-5 py-4 text-sm text-ink-600">{log.message ?? '-'}</td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
