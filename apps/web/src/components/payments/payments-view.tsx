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
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function PaymentsView() {
  const [payments, setPayments] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      branchId: '',
      clientId: '',
      debtId: '',
      concept: '',
      grossAmount: 0,
      method: 'CASH',
      notes: '',
    },
  });

  const loadData = async () => {
    const [paymentsResponse, debtsResponse, branchesResponse] = await Promise.all([
      apiRequest<{ data: any[] }>('payments'),
      apiRequest<{ data: any[] }>('payments/debts'),
      apiRequest<{ data: any[] }>('branches'),
    ]);
    setPayments(paymentsResponse.data);
    setDebts(debtsResponse.data);
    setBranches(branchesResponse.data);
    if (!watch('branchId') && branchesResponse.data[0]) {
      setValue('branchId', branchesResponse.data[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedDebt = useMemo(() => debts.find((debt) => debt.id === watch('debtId')), [debts, watch('debtId')]);

  useEffect(() => {
    if (!selectedDebt) return;
    setValue('clientId', selectedDebt.client.id);
    setValue('branchId', selectedDebt.branchId);
    setValue('concept', selectedDebt.description);
    setValue('grossAmount', Number(selectedDebt.balanceAmount));
  }, [selectedDebt]);

  const onSubmit = handleSubmit(async (values) => {
    await apiRequest('payments', {
      method: 'POST',
      body: JSON.stringify({
        clientId: values.clientId,
        branchId: values.branchId,
        concept: values.concept,
        grossAmount: Number(values.grossAmount),
        method: values.method,
        notes: values.notes || undefined,
        allocations: values.debtId
          ? [
              {
                receivableId: values.debtId,
                amount: Number(values.grossAmount),
              },
            ]
          : [],
      }),
    });
    setModalOpen(false);
    reset();
    await loadData();
  });

  const voidPayment = async (paymentId: string) => {
    if (!window.confirm('Se anulara el pago seleccionado. Continuar?')) return;
    await apiRequest(`payments/${paymentId}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Anulado desde el panel administrativo' }),
    });
    await loadData();
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Pagos y cobranzas" description="Registro de cobros, aplicacion a deuda pendiente y anulacion con trazabilidad." actions={<Button onClick={() => setModalOpen(true)}>Registrar pago</Button>} />
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <DataTable columns={['Concepto', 'Cliente', 'Monto', 'Metodo', 'Estado', 'Acciones']}>
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td className="px-5 py-4 text-sm text-ink-900">{payment.concept}</td>
              <td className="px-5 py-4 text-sm text-ink-600">{payment.client ? `${payment.client.firstName} ${payment.client.lastName}` : '-'}</td>
              <td className="px-5 py-4 text-sm font-semibold text-ink-900">{formatCurrency(Number(payment.finalAmount))}</td>
              <td className="px-5 py-4 text-sm text-ink-600">{payment.method}</td>
              <td className="px-5 py-4"><StatusBadge value={payment.status} /></td>
              <td className="px-5 py-4"><Button variant="ghost" className="px-3 py-2 text-xs text-danger" onClick={() => voidPayment(payment.id)}>Anular</Button></td>
            </tr>
          ))}
        </DataTable>

        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Deudas abiertas</h3>
          <div className="mt-6 space-y-3">
            {debts.map((debt) => (
              <div key={debt.id} className="panel-muted p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">{debt.client.firstName} {debt.client.lastName}</p>
                    <p className="mt-1 text-sm text-ink-600">{debt.description}</p>
                  </div>
                  <StatusBadge value={debt.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-ink-600">
                  <span>{formatDateTime(debt.dueDate)}</span>
                  <span className="font-semibold text-ink-900">{formatCurrency(Number(debt.balanceAmount))}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={modalOpen} title="Registrar pago">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium text-ink-700">Aplicar a deuda</label><Select {...register('debtId')}><option value="">Pago manual sin deuda seleccionada</option>{debts.map((debt) => <option key={debt.id} value={debt.id}>{debt.client.memberNumber} · {debt.client.firstName} {debt.client.lastName} · {formatCurrency(Number(debt.balanceAmount))}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label><Select {...register('branchId')}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Cliente</label><Input {...register('clientId')} placeholder="ID cliente" /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium text-ink-700">Concepto</label><Input {...register('concept')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Monto bruto</label><Input type="number" {...register('grossAmount')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Metodo</label><Select {...register('method')}><option value="CASH">Efectivo</option><option value="BANK_TRANSFER">Transferencia</option><option value="DEBIT_CARD">Debito</option><option value="CREDIT_CARD">Credito</option><option value="DIGITAL_WALLET">Billetera virtual</option><option value="OTHER">Otro</option></Select></div>
          <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium text-ink-700">Notas</label><Textarea {...register('notes')} /></div>
          <div className="md:col-span-2 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit">Registrar pago</Button></div>
        </form>
      </Modal>
    </div>
  );
}
