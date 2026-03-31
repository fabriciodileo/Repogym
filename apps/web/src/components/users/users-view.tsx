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

export function UsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      roleCode: 'RECEPTIONIST',
      branchId: '',
      isActive: true,
    },
  });

  const loadData = async () => {
    const [usersResponse, rolesResponse, branchesResponse] = await Promise.all([
      apiRequest<{ data: any[] }>('users'),
      apiRequest<{ data: any[] }>('users/roles'),
      apiRequest<{ data: any[] }>('branches'),
    ]);
    setUsers(usersResponse.data);
    setRoles(rolesResponse.data);
    setBranches(branchesResponse.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    await apiRequest('users', {
      method: 'POST',
      body: JSON.stringify({
        ...values,
        branchId: values.branchId || null,
      }),
    });
    setModalOpen(false);
    reset();
    await loadData();
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Usuarios internos" description="Alta de personal y asignacion de rol inicial para recepcion, gerencia y cobranzas." actions={<Button onClick={() => setModalOpen(true)}>Nuevo usuario</Button>} />
      <DataTable columns={['Usuario', 'Email', 'Rol', 'Estado', 'Ultimo acceso']}>
        {users.map((user) => (
          <tr key={user.id}>
            <td className="px-5 py-4 text-sm font-semibold text-ink-900">{user.firstName} {user.lastName}</td>
            <td className="px-5 py-4 text-sm text-ink-600">{user.email}</td>
            <td className="px-5 py-4 text-sm text-ink-600">{user.role.name}</td>
            <td className="px-5 py-4"><StatusBadge value={user.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
            <td className="px-5 py-4 text-sm text-ink-600">{user.lastAccessAt ?? '-'}</td>
          </tr>
        ))}
      </DataTable>

      <Modal open={modalOpen} title="Nuevo usuario interno">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Nombre</label><Input {...register('firstName')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Apellido</label><Input {...register('lastName')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Email</label><Input type="email" {...register('email')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Contrasena</label><Input type="password" {...register('password')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Rol</label><Select {...register('roleCode')}>{roles.map((role) => <option key={role.code} value={role.code}>{role.name}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label><Select {...register('branchId')}><option value="">Sin sucursal fija</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
          <div className="md:col-span-2 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit">Crear usuario</Button></div>
        </form>
      </Modal>
    </div>
  );
}
