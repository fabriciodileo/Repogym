'use client';

import Link from 'next/link';
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

const emptyForm = {
  branchId: '',
  firstName: '',
  lastName: '',
  dni: '',
  phone: '',
  email: '',
  status: 'ACTIVE',
  internalNotes: '',
  credentialType: 'RFID_TAG',
  credentialValue: '',
};

type Branch = { id: string; code: string; name: string };
type ClientItem = {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone?: string;
  email?: string;
  status: string;
  pendingReceivables: number;
  activeMembership?: { planName: string; endsAt: string; status: string } | null;
};

export function ClientsView() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm({ defaultValues: emptyForm });

  const loadData = async () => {
    const [clientsResponse, branchesResponse] = await Promise.all([
      apiRequest<{ data: ClientItem[] }>(`clients?q=${encodeURIComponent(query)}${statusFilter ? `&status=${statusFilter}` : ''}`),
      apiRequest<{ data: Branch[] }>('branches'),
    ]);

    setClients(clientsResponse.data);
    setBranches(branchesResponse.data);
    if (!watch('branchId') && branchesResponse.data[0]) {
      setValue('branchId', branchesResponse.data[0].id);
    }
  };

  useEffect(() => {
    loadData().catch((currentError) => setError(currentError.message));
  }, [query, statusFilter]);

  const openCreate = () => {
    setEditingId(null);
    reset({
      ...emptyForm,
      branchId: branches[0]?.id ?? '',
    });
    setModalOpen(true);
  };

  const openEdit = async (clientId: string) => {
    const response = await apiRequest<{ data: any }>(`clients/${clientId}/profile`);
    setEditingId(clientId);
    reset({
      branchId: response.data.branchId,
      firstName: response.data.firstName,
      lastName: response.data.lastName,
      dni: response.data.dni,
      phone: response.data.phone ?? '',
      email: response.data.email ?? '',
      status: response.data.status,
      internalNotes: response.data.internalNotes ?? '',
      credentialType: response.data.accessCredentials?.[0]?.type ?? 'RFID_TAG',
      credentialValue: response.data.accessCredentials?.[0]?.value ?? '',
    });
    setModalOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      branchId: values.branchId,
      firstName: values.firstName,
      lastName: values.lastName,
      dni: values.dni,
      phone: values.phone,
      email: values.email || undefined,
      status: values.status,
      internalNotes: values.internalNotes || undefined,
      credentials: values.credentialValue
        ? [
            {
              type: values.credentialType,
              value: values.credentialValue,
              isPrimary: true,
            },
          ]
        : [],
    };

    await apiRequest(`clients${editingId ? `/${editingId}` : ''}`, {
      method: editingId ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    });

    setModalOpen(false);
    reset(emptyForm);
    await loadData();
  });

  const removeClient = async (clientId: string) => {
    if (!window.confirm('Se dara de baja logicamente el cliente. Continuar?')) return;
    await apiRequest(`clients/${clientId}`, { method: 'DELETE' });
    await loadData();
  };

  const selectedBranchName = useMemo(
    () => branches.find((branch) => branch.id === watch('branchId'))?.name,
    [branches, watch('branchId')],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        description="Alta, seguimiento, alertas operativas y acceso rapido al perfil completo del socio."
        actions={<Button onClick={openCreate}>Nuevo cliente</Button>}
      />

      <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 md:grid-cols-2 lg:w-2/3">
          <Input placeholder="Buscar por nombre, DNI o numero de socio" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="SUSPENDED">Suspendido</option>
            <option value="OVERDUE">Moroso</option>
          </Select>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : <p className="text-sm text-ink-600">{clients.length} clientes cargados</p>}
      </Card>

      <DataTable columns={['Cliente', 'Documento', 'Estado', 'Membresia', 'Deuda', 'Acciones']}>
        {clients.map((client) => (
          <tr key={client.id} className="hover:bg-ink-50/60">
            <td className="px-5 py-4">
              <p className="font-semibold text-ink-900">{client.firstName} {client.lastName}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">{client.memberNumber}</p>
            </td>
            <td className="px-5 py-4 text-sm text-ink-600">{client.dni}</td>
            <td className="px-5 py-4"><StatusBadge value={client.status} /></td>
            <td className="px-5 py-4 text-sm text-ink-600">{client.activeMembership ? `${client.activeMembership.planName}` : 'Sin membresia activa'}</td>
            <td className="px-5 py-4 text-sm font-semibold text-ink-900">{client.pendingReceivables}</td>
            <td className="px-5 py-4">
              <div className="flex flex-wrap gap-2">
                <Link className="rounded-xl bg-ink-900 px-3 py-2 text-xs font-semibold text-white" href={`/clientes/${client.id}`}>Perfil</Link>
                <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => openEdit(client.id)}>Editar</Button>
                <Button variant="ghost" className="px-3 py-2 text-xs text-danger" onClick={() => removeClient(client.id)}>Baja</Button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      <Modal open={modalOpen} title={editingId ? 'Editar cliente' : 'Nuevo cliente'} description={selectedBranchName ? `Sucursal asignada: ${selectedBranchName}` : 'Completa la ficha basica del cliente.'}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label>
            <Select {...register('branchId')}>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Estado</label>
            <Select {...register('status')}>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
              <option value="SUSPENDED">Suspendido</option>
              <option value="OVERDUE">Moroso</option>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Nombre</label>
            <Input {...register('firstName')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Apellido</label>
            <Input {...register('lastName')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">DNI</label>
            <Input {...register('dni')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Telefono</label>
            <Input {...register('phone')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Email</label>
            <Input type="email" {...register('email')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Credencial</label>
            <div className="grid grid-cols-[0.42fr_0.58fr] gap-2">
              <Select {...register('credentialType')}>
                <option value="RFID_TAG">RFID</option>
                <option value="QR_TOKEN">QR</option>
                <option value="EXTERNAL_CARD">Tarjeta</option>
              </Select>
              <Input placeholder="Codigo o token" {...register('credentialValue')} />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-ink-700">Notas internas</label>
            <Textarea {...register('internalNotes')} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">{editingId ? 'Guardar cambios' : 'Crear cliente'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
