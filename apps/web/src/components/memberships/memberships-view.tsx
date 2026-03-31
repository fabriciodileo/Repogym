'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency, formatDateOnly } from '@/lib/utils';

export function MembershipsView() {
  const [memberships, setMemberships] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      clientId: '',
      planId: '',
      branchId: '',
      startsAt: new Date().toISOString().slice(0, 10),
      agreedAmount: '',
      discountAmount: 0,
      surchargeAmount: 0,
    },
  });

  const loadData = async () => {
    const [membershipsResponse, clientsResponse, plansResponse, branchesResponse] = await Promise.all([
      apiRequest<{ data: any[] }>('memberships'),
      apiRequest<{ data: any[] }>('clients'),
      apiRequest<{ data: any[] }>('plans?activeOnly=true'),
      apiRequest<{ data: any[] }>('branches'),
    ]);
    setMemberships(membershipsResponse.data);
    setClients(clientsResponse.data);
    setPlans(plansResponse.data);
    setBranches(branchesResponse.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    await apiRequest('memberships', {
      method: 'POST',
      body: JSON.stringify({
        clientId: values.clientId,
        planId: values.planId,
        branchId: values.branchId,
        startsAt: values.startsAt,
        agreedAmount: values.agreedAmount ? Number(values.agreedAmount) : undefined,
        discountAmount: Number(values.discountAmount ?? 0),
        surchargeAmount: Number(values.surchargeAmount ?? 0),
      }),
    });
    setModalOpen(false);
    reset();
    await loadData();
  });

  const renewMembership = async (membership: any) => {
    await apiRequest(`memberships/${membership.id}/renew`, {
      method: 'POST',
      body: JSON.stringify({ startsAt: membership.endsAt }),
    });
    await loadData();
  };

  const cancelMembership = async (membership: any) => {
    await apiRequest(`memberships/${membership.id}/status`, {
      method: 'POST',
      body: JSON.stringify({ action: 'CANCEL', reason: 'Cancelada desde el panel administrativo' }),
    });
    await loadData();
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Membresias" description="Asignacion, renovacion y control de vigencia por cliente, plan y sucursal." actions={<Button onClick={() => setModalOpen(true)}>Asignar membresia</Button>} />
      <DataTable columns={['Cliente', 'Plan', 'Vigencia', 'Monto', 'Estado', 'Acciones']}>
        {memberships.map((membership) => (
          <tr key={membership.id}>
            <td className="px-5 py-4"><p className="font-semibold text-ink-900">{membership.client.firstName} {membership.client.lastName}</p><p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">{membership.client.memberNumber}</p></td>
            <td className="px-5 py-4 text-sm text-ink-600">{membership.plan.name}</td>
            <td className="px-5 py-4 text-sm text-ink-600">{formatDateOnly(membership.startsAt)} - {formatDateOnly(membership.endsAt)}</td>
            <td className="px-5 py-4 text-sm font-semibold text-ink-900">{formatCurrency(Number(membership.agreedAmount) - Number(membership.discountAmount) + Number(membership.surchargeAmount))}</td>
            <td className="px-5 py-4"><StatusBadge value={membership.status} /></td>
            <td className="px-5 py-4"><div className="flex gap-2"><Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => renewMembership(membership)}>Renovar</Button><Button variant="ghost" className="px-3 py-2 text-xs text-danger" onClick={() => cancelMembership(membership)}>Cancelar</Button></div></td>
          </tr>
        ))}
      </DataTable>

      <Modal open={modalOpen} title="Asignar membresia">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Cliente</label><Select {...register('clientId')}>{clients.map((client) => <option key={client.id} value={client.id}>{client.memberNumber} · {client.firstName} {client.lastName}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Plan</label><Select {...register('planId')}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label><Select {...register('branchId')}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Fecha inicio</label><Input type="date" {...register('startsAt')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Monto pactado</label><Input type="number" {...register('agreedAmount')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Descuento</label><Input type="number" {...register('discountAmount')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Recargo</label><Input type="number" {...register('surchargeAmount')} /></div>
          <div className="md:col-span-2 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit">Asignar</Button></div>
        </form>
      </Modal>
    </div>
  );
}
