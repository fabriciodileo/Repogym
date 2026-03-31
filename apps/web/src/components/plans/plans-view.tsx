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
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';

const emptyPlan = {
  code: '',
  name: '',
  description: '',
  durationUnit: 'MONTH',
  durationCount: 1,
  price: 0,
  accessLimit: '',
  graceDays: 0,
  branchId: '',
};

export function PlansView() {
  const [plans, setPlans] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm({ defaultValues: emptyPlan });

  const loadData = async () => {
    const [plansResponse, branchesResponse] = await Promise.all([
      apiRequest<{ data: any[] }>('plans'),
      apiRequest<{ data: any[] }>('branches'),
    ]);
    setPlans(plansResponse.data);
    setBranches(branchesResponse.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    reset({ ...emptyPlan, branchId: branches[0]?.id ?? '' });
    setModalOpen(true);
  };

  const openEdit = (plan: any) => {
    setEditingId(plan.id);
    reset({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? '',
      durationUnit: plan.durationUnit,
      durationCount: plan.durationCount,
      price: Number(plan.price),
      accessLimit: plan.accessLimit ?? '',
      graceDays: plan.graceDays,
      branchId: plan.branches?.[0]?.id ?? '',
    });
    setModalOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    await apiRequest(`plans${editingId ? `/${editingId}` : ''}`, {
      method: editingId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        code: values.code,
        name: values.name,
        description: values.description || undefined,
        durationUnit: values.durationUnit,
        durationCount: Number(values.durationCount),
        price: Number(values.price),
        accessLimit: values.accessLimit ? Number(values.accessLimit) : null,
        graceDays: Number(values.graceDays),
        branchIds: values.branchId ? [values.branchId] : [],
      }),
    });

    setModalOpen(false);
    await loadData();
  });

  const removePlan = async (planId: string) => {
    if (!window.confirm('Se dara de baja logica el plan. Continuar?')) return;
    await apiRequest(`plans/${planId}`, { method: 'DELETE' });
    await loadData();
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Planes de membresia" description="Configuracion comercial reusable por sucursal, duracion, tope de accesos y reglas de vigencia." actions={<Button onClick={openCreate}>Nuevo plan</Button>} />
      <DataTable columns={['Plan', 'Duracion', 'Precio', 'Estado', 'Acciones']}>
        {plans.map((plan) => (
          <tr key={plan.id}>
            <td className="px-5 py-4"><p className="font-semibold text-ink-900">{plan.name}</p><p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">{plan.code}</p></td>
            <td className="px-5 py-4 text-sm text-ink-600">{plan.durationCount} {plan.durationUnit}</td>
            <td className="px-5 py-4 text-sm text-ink-900">{formatCurrency(Number(plan.price))}</td>
            <td className="px-5 py-4"><StatusBadge value={plan.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
            <td className="px-5 py-4"><div className="flex gap-2"><Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => openEdit(plan)}>Editar</Button><Button variant="ghost" className="px-3 py-2 text-xs text-danger" onClick={() => removePlan(plan.id)}>Baja</Button></div></td>
          </tr>
        ))}
      </DataTable>

      <Modal open={modalOpen} title={editingId ? 'Editar plan' : 'Nuevo plan'}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Codigo</label><Input {...register('code')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Nombre</label><Input {...register('name')} /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium text-ink-700">Descripcion</label><Textarea {...register('description')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Unidad</label><Select {...register('durationUnit')}><option value="DAY">Diaria</option><option value="WEEK">Semanal</option><option value="MONTH">Mensual</option><option value="QUARTER">Trimestral</option><option value="SEMESTER">Semestral</option><option value="YEAR">Anual</option><option value="CUSTOM">Personalizada</option></Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Cantidad</label><Input type="number" {...register('durationCount')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Precio</label><Input type="number" {...register('price')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Accesos limite</label><Input type="number" {...register('accessLimit')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Dias de gracia</label><Input type="number" {...register('graceDays')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label><Select {...register('branchId')}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
          <div className="md:col-span-2 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit">Guardar plan</Button></div>
        </form>
      </Modal>
    </div>
  );
}
