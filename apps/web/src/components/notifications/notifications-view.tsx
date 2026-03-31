'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiRequest } from '@/lib/api-client';
import { buildQueryString } from '@/lib/query';
import { formatDateTime } from '@/lib/utils';

type Branch = { id: string; name: string };
type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  channel: string;
  status: string;
  createdAt: string;
  scheduledAt?: string | null;
  branch?: { name: string } | null;
  client?: { firstName: string; lastName: string; memberNumber: string } | null;
};

export function NotificationsView() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const [branchesResponse, notificationsResponse] = await Promise.all([
      apiRequest<{ data: Branch[] }>('branches'),
      apiRequest<{ data: NotificationItem[] }>(`notifications${buildQueryString({ branchId, status, type })}`),
    ]);

    setBranches(branchesResponse.data);
    setNotifications(notificationsResponse.data);
  };

  useEffect(() => {
    loadData().catch((currentError) => setError(currentError.message));
  }, [branchId, status, type]);

  const markRead = async (id: string) => {
    await apiRequest(`notifications/${id}/read`, { method: 'POST' });
    await loadData();
  };

  const processPending = async () => {
    await apiRequest('notifications/process', {
      method: 'POST',
      body: JSON.stringify({ limit: 25 }),
    });
    await loadData();
  };

  const syncAlerts = async () => {
    await apiRequest('notifications/sync', {
      method: 'POST',
      body: JSON.stringify({ branchId: branchId || undefined }),
    });
    await loadData();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notificaciones"
        description="Cola interna de alertas operativas y provider simulado listo para futuros canales externos."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={syncAlerts}>
              Sincronizar alertas
            </Button>
            <Button onClick={processPending}>Procesar pendientes</Button>
          </div>
        }
      />

      <Card className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
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
          <label className="mb-2 block text-sm font-medium text-ink-700">Estado</label>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="SENT">Enviada</option>
            <option value="FAILED">Fallida</option>
            <option value="READ">Leida</option>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-700">Tipo</label>
          <Select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Todos</option>
            <option value="MEMBERSHIP_EXPIRING">Membresia por vencer</option>
            <option value="MEMBERSHIP_EXPIRED">Membresia vencida</option>
            <option value="OVERDUE_DEBT">Mora</option>
            <option value="STOCK_LOW">Stock bajo</option>
            <option value="ACCESS_DENIED">Acceso denegado</option>
            <option value="CLASS_REMINDER">Recordatorio de clase</option>
            <option value="CLASS_CANCELLED">Clase cancelada</option>
          </Select>
        </div>
        <div className="flex items-end">
          <p className="text-sm text-ink-600">{error ?? `${notifications.length} notificaciones cargadas`}</p>
        </div>
      </Card>

      <DataTable columns={['Titulo', 'Tipo', 'Sucursal', 'Cliente', 'Estado', 'Programada', 'Acciones']}>
        {notifications.length ? (
          notifications.map((notification) => (
            <tr key={notification.id}>
              <td className="px-5 py-4">
                <p className="font-semibold text-ink-900">{notification.title}</p>
                <p className="mt-1 text-sm text-ink-600">{notification.body}</p>
              </td>
              <td className="px-5 py-4 text-sm text-ink-600">{notification.type}</td>
              <td className="px-5 py-4 text-sm text-ink-600">{notification.branch?.name ?? '-'}</td>
              <td className="px-5 py-4 text-sm text-ink-600">
                {notification.client ? `${notification.client.firstName} ${notification.client.lastName}` : '-'}
              </td>
              <td className="px-5 py-4"><StatusBadge value={notification.status} /></td>
              <td className="px-5 py-4 text-sm text-ink-600">{formatDateTime(notification.scheduledAt ?? notification.createdAt)}</td>
              <td className="px-5 py-4">
                {notification.status !== 'READ' ? (
                  <Button variant="ghost" className="px-3 py-2 text-xs" onClick={() => markRead(notification.id)}>
                    Marcar leida
                  </Button>
                ) : (
                  <span className="text-xs text-ink-500">Leida</span>
                )}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td className="px-5 py-6 text-sm text-ink-500" colSpan={7}>
              No hay notificaciones para los filtros actuales.
            </td>
          </tr>
        )}
      </DataTable>
    </div>
  );
}
