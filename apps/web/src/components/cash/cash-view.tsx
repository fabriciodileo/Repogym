'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { apiRequest } from '@/lib/api-client';
import { buildQueryString } from '@/lib/query';
import { formatCurrency, formatDateTime } from '@/lib/utils';

type Branch = { id: string; name: string };
type CashMovement = { id: string; type: string; amount: string | number; description: string; method?: string | null; createdAt: string };
type CashSession = {
  id: string;
  openedAt: string;
  openingAmount: string | number;
  expectedAmount?: number;
  byMethod?: Record<string, { income: number; expense: number; adjustment: number }>;
  movements: CashMovement[];
};

const openDefaults = { branchId: '', openingAmount: 0, notes: '' };
const movementDefaults = { type: 'INCOME', amount: 0, method: 'CASH', description: '', reference: '' };
const closeDefaults = { closingAmount: 0, notes: '' };

export function CashView() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const openForm = useForm({ defaultValues: openDefaults });
  const movementForm = useForm({ defaultValues: movementDefaults });
  const closeForm = useForm({ defaultValues: closeDefaults });

  const loadData = async () => {
    const [branchesResponse, statusResponse, sessionsResponse] = await Promise.all([
      apiRequest<{ data: Branch[] }>('branches'),
      apiRequest<{ data: { currentSession: CashSession | null; isOpen: boolean } }>(`cash-register/status${buildQueryString({ branchId })}`),
      apiRequest<{ data: any[] }>(`cash-register/sessions${buildQueryString({ branchId })}`),
    ]);

    setBranches(branchesResponse.data);
    setStatus(statusResponse.data);
    setSessions(sessionsResponse.data);

    if (!branchId && branchesResponse.data[0]) {
      setBranchId(branchesResponse.data[0].id);
      openForm.setValue('branchId', branchesResponse.data[0].id);
    }
  };

  useEffect(() => {
    loadData().catch((currentError) => setError(currentError.message));
  }, [branchId]);

  const openSession = openForm.handleSubmit(async (values) => {
    await apiRequest('cash-register/open', {
      method: 'POST',
      body: JSON.stringify({
        branchId: values.branchId,
        openingAmount: Number(values.openingAmount),
        notes: values.notes || undefined,
      }),
    });
    setOpenModal(false);
    openForm.reset(openDefaults);
    await loadData();
  });

  const addMovement = movementForm.handleSubmit(async (values) => {
    await apiRequest(`cash-register/sessions/${status.currentSession.id}/movements`, {
      method: 'POST',
      body: JSON.stringify({
        type: values.type,
        amount: Number(values.amount),
        method: values.method || undefined,
        description: values.description,
        reference: values.reference || undefined,
      }),
    });
    setMovementModal(false);
    movementForm.reset(movementDefaults);
    await loadData();
  });

  const closeSession = closeForm.handleSubmit(async (values) => {
    await apiRequest(`cash-register/sessions/${status.currentSession.id}/close`, {
      method: 'POST',
      body: JSON.stringify({
        closingAmount: Number(values.closingAmount),
        notes: values.notes || undefined,
      }),
    });
    setCloseModal(false);
    closeForm.reset(closeDefaults);
    await loadData();
  });

  const methodSummary = useMemo(
    () =>
      Object.entries(
        (status?.currentSession?.byMethod ?? {}) as Record<string, { income: number; expense: number; adjustment: number }>,
      ),
    [status],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Caja"
        description="Apertura, cierre y movimientos manuales con control de saldo esperado por sucursal."
        actions={
          status?.isOpen ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setMovementModal(true)}>Movimiento manual</Button>
              <Button onClick={() => setCloseModal(true)}>Cerrar caja</Button>
            </div>
          ) : (
            <Button onClick={() => setOpenModal(true)}>Abrir caja</Button>
          )
        }
      />

      <Card className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label>
          <Select value={branchId} onChange={(event) => { setBranchId(event.target.value); openForm.setValue('branchId', event.target.value); }}>
            <option value="">Todas las sucursales</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </Select>
        </div>
        <div className="panel-muted flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Estado</p>
            <p className="mt-1 font-semibold text-ink-900">{status?.isOpen ? 'Caja abierta' : 'Caja cerrada'}</p>
          </div>
        </div>
        <div className="panel-muted flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Saldo esperado</p>
            <p className="mt-1 font-semibold text-ink-900">{formatCurrency(status?.currentSession?.expectedAmount ?? 0)}</p>
          </div>
        </div>
        <div className="panel-muted flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Apertura</p>
            <p className="mt-1 font-semibold text-ink-900">{status?.currentSession ? formatDateTime(status.currentSession.openedAt) : '-'}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <DataTable columns={['Fecha', 'Tipo', 'Metodo', 'Descripcion', 'Monto']}>
          {status?.currentSession?.movements?.length ? (
            status.currentSession.movements.map((movement: CashMovement) => (
              <tr key={movement.id}>
                <td className="px-5 py-4 text-sm text-ink-600">{formatDateTime(movement.createdAt)}</td>
                <td className="px-5 py-4 text-sm font-semibold text-ink-900">{movement.type}</td>
                <td className="px-5 py-4 text-sm text-ink-600">{movement.method ?? '-'}</td>
                <td className="px-5 py-4 text-sm text-ink-600">{movement.description}</td>
                <td className="px-5 py-4 text-sm font-semibold text-ink-900">{formatCurrency(Number(movement.amount))}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-5 py-6 text-sm text-ink-500" colSpan={5}>
                {error ?? 'No hay movimientos para la caja actual.'}
              </td>
            </tr>
          )}
        </DataTable>

        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Resumen por metodo</h3>
          <div className="mt-5 space-y-3">
            {methodSummary.length ? (
              methodSummary.map(([method, item]) => (
                <div key={method} className="panel-muted p-4">
                  <p className="font-semibold text-ink-900">{method}</p>
                  <p className="mt-2 text-sm text-ink-600">Ingresos {formatCurrency(item.income)} · Egresos {formatCurrency(item.expense)} · Ajustes {formatCurrency(item.adjustment)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-600">Todavia no hay resumen por metodo.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-2xl font-bold text-ink-900">Sesiones recientes</h3>
        <div className="mt-4 space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="panel-muted flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-ink-900">{session.branch.name}</p>
                <p className="text-sm text-ink-600">{formatDateTime(session.openedAt)} · {session.status}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-ink-600">Apertura {formatCurrency(Number(session.openingAmount))}</p>
                <p className="font-semibold text-ink-900">{session.closingAmount ? formatCurrency(Number(session.closingAmount)) : 'Abierta'}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={openModal} title="Abrir caja">
        <form className="grid gap-4" onSubmit={openSession}>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label>
            <Select {...openForm.register('branchId')}>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Monto de apertura</label>
            <Input type="number" {...openForm.register('openingAmount')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Observaciones</label>
            <Input {...openForm.register('notes')} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button type="submit">Abrir</Button>
          </div>
        </form>
      </Modal>

      <Modal open={movementModal} title="Movimiento manual de caja">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={addMovement}>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Tipo</label>
            <Select {...movementForm.register('type')}>
              <option value="INCOME">Ingreso</option>
              <option value="EXPENSE">Egreso</option>
              <option value="ADJUSTMENT">Ajuste</option>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Monto</label>
            <Input type="number" {...movementForm.register('amount')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Metodo</label>
            <Select {...movementForm.register('method')}>
              <option value="CASH">Efectivo</option>
              <option value="BANK_TRANSFER">Transferencia</option>
              <option value="DEBIT_CARD">Debito</option>
              <option value="CREDIT_CARD">Credito</option>
              <option value="DIGITAL_WALLET">Billetera virtual</option>
              <option value="OTHER">Otro</option>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Referencia</label>
            <Input {...movementForm.register('reference')} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-ink-700">Descripcion</label>
            <Input {...movementForm.register('description')} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setMovementModal(false)}>Cancelar</Button>
            <Button type="submit">Registrar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={closeModal} title="Cerrar caja">
        <form className="grid gap-4" onSubmit={closeSession}>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Monto contado</label>
            <Input type="number" {...closeForm.register('closingAmount')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Observaciones</label>
            <Input {...closeForm.register('notes')} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setCloseModal(false)}>Cancelar</Button>
            <Button type="submit">Cerrar caja</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
