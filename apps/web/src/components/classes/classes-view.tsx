'use client';

import { useEffect, useState } from 'react';
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
import { buildQueryString } from '@/lib/query';
import { formatCurrency, formatDateTime } from '@/lib/utils';

type Branch = { id: string; name: string };
type User = { id: string; firstName: string; lastName: string };
type Client = { id: string; firstName: string; lastName: string; memberNumber: string };
type Activity = { id: string; code: string; name: string; capacity: number; status: string; branch?: { name: string } | null; extraFee?: string | number | null };
type Schedule = { id: string; startsAt: string; endsAt: string; room?: string | null; status: string; branch: { name: string; id: string }; activity: { name: string; id: string; capacity: number }; instructor?: { firstName: string; lastName: string } | null; capacityOverride?: number | null; enrollments: Array<{ id: string; status: string }> };
type Enrollment = { id: string; status: string; notes?: string | null; client: { firstName: string; lastName: string; memberNumber: string }; schedule: { id: string; startsAt: string; activity: { name: string }; branch: { name: string } }; receivables: Array<{ balanceAmount: string | number }> };

const activityDefaults = { branchId: '', code: '', name: '', description: '', capacity: 10, status: 'ACTIVE', requiresValidMembership: true, extraFee: 0, isIncludedByDefault: false };
const scheduleDefaults = { activityId: '', branchId: '', instructorId: '', startsAt: '', endsAt: '', room: '', capacityOverride: 0 };
const enrollmentDefaults = { clientId: '', scheduleId: '', notes: '' };

export function ClassesView() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [branchId, setBranchId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activityModal, setActivityModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [enrollmentModal, setEnrollmentModal] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const activityForm = useForm({ defaultValues: activityDefaults });
  const scheduleForm = useForm({ defaultValues: scheduleDefaults });
  const enrollmentForm = useForm({ defaultValues: enrollmentDefaults });

  const loadData = async () => {
    const [branchesResponse, usersResponse, clientsResponse, activitiesResponse, schedulesResponse, enrollmentsResponse] = await Promise.all([
      apiRequest<{ data: Branch[] }>('branches'),
      apiRequest<{ data: User[] }>('users?pageSize=100'),
      apiRequest<{ data: Client[] }>('clients?pageSize=100'),
      apiRequest<{ data: Activity[] }>(`classes/activities${buildQueryString({ branchId })}`),
      apiRequest<{ data: Schedule[] }>(`classes/schedules${buildQueryString({ branchId })}`),
      apiRequest<{ data: Enrollment[] }>(`classes/enrollments${buildQueryString({ branchId })}`),
    ]);

    setBranches(branchesResponse.data);
    setUsers(usersResponse.data);
    setClients(clientsResponse.data);
    setActivities(activitiesResponse.data);
    setSchedules(schedulesResponse.data);
    setEnrollments(enrollmentsResponse.data);

    if (!branchId && branchesResponse.data[0]) {
      setBranchId(branchesResponse.data[0].id);
      activityForm.setValue('branchId', branchesResponse.data[0].id);
      scheduleForm.setValue('branchId', branchesResponse.data[0].id);
    }
  };

  useEffect(() => {
    loadData().catch((currentError) => setError(currentError.message));
  }, [branchId]);

  const submitActivity = activityForm.handleSubmit(async (values) => {
    await apiRequest(`classes/activities${editingActivityId ? `/${editingActivityId}` : ''}`, {
      method: editingActivityId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        branchId: values.branchId || undefined,
        code: values.code,
        name: values.name,
        description: values.description || undefined,
        capacity: Number(values.capacity),
        status: values.status,
        requiresValidMembership: Boolean(values.requiresValidMembership),
        extraFee: Number(values.extraFee) || 0,
        isIncludedByDefault: Boolean(values.isIncludedByDefault),
      }),
    });
    setActivityModal(false);
    setEditingActivityId(null);
    activityForm.reset(activityDefaults);
    await loadData();
  });

  const submitSchedule = scheduleForm.handleSubmit(async (values) => {
    await apiRequest(`classes/schedules${editingScheduleId ? `/${editingScheduleId}` : ''}`, {
      method: editingScheduleId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        activityId: values.activityId,
        branchId: values.branchId,
        instructorId: values.instructorId || undefined,
        startsAt: values.startsAt,
        endsAt: values.endsAt,
        room: values.room || undefined,
        capacityOverride: Number(values.capacityOverride) || undefined,
      }),
    });
    setScheduleModal(false);
    setEditingScheduleId(null);
    scheduleForm.reset(scheduleDefaults);
    await loadData();
  });

  const submitEnrollment = enrollmentForm.handleSubmit(async (values) => {
    await apiRequest('classes/enrollments', {
      method: 'POST',
      body: JSON.stringify({
        clientId: values.clientId,
        scheduleId: values.scheduleId,
        notes: values.notes || undefined,
      }),
    });
    setEnrollmentModal(false);
    enrollmentForm.reset(enrollmentDefaults);
    await loadData();
  });

  const cancelSchedule = async (id: string) => {
    const reason = window.prompt('Motivo de cancelacion de la clase');
    if (!reason) return;
    await apiRequest(`classes/schedules/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    await loadData();
  };

  const cancelEnrollment = async (id: string) => {
    const reason = window.prompt('Motivo de cancelacion de la inscripcion');
    if (!reason) return;
    await apiRequest(`classes/enrollments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    await loadData();
  };

  const attendance = async (id: string, status: 'ATTENDED' | 'NO_SHOW') => {
    await apiRequest(`classes/enrollments/${id}/attendance`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    await loadData();
  };

  const openCreateActivity = () => {
    setEditingActivityId(null);
    activityForm.reset({ ...activityDefaults, branchId: branchId || (branches[0]?.id ?? '') });
    setActivityModal(true);
  };

  const openEditActivity = (activity: Activity) => {
    setEditingActivityId(activity.id);
    activityForm.reset({
      branchId: branches.find((branch) => branch.name === activity.branch?.name)?.id ?? branchId,
      code: activity.code,
      name: activity.name,
      description: '',
      capacity: activity.capacity,
      status: activity.status,
      requiresValidMembership: true,
      extraFee: Number(activity.extraFee ?? 0),
      isIncludedByDefault: false,
    });
    setActivityModal(true);
  };

  const openCreateSchedule = () => {
    setEditingScheduleId(null);
    scheduleForm.reset({
      ...scheduleDefaults,
      branchId: branchId || (branches[0]?.id ?? ''),
      activityId: activities[0]?.id ?? '',
    });
    setScheduleModal(true);
  };

  const openEditSchedule = (schedule: Schedule) => {
    setEditingScheduleId(schedule.id);
    scheduleForm.reset({
      activityId: schedule.activity.id,
      branchId: schedule.branch.id,
      instructorId: users.find((user) => `${user.firstName} ${user.lastName}` === `${schedule.instructor?.firstName ?? ''} ${schedule.instructor?.lastName ?? ''}`)?.id ?? '',
      startsAt: schedule.startsAt.slice(0, 16),
      endsAt: schedule.endsAt.slice(0, 16),
      room: schedule.room ?? '',
      capacityOverride: schedule.capacityOverride ?? 0,
    });
    setScheduleModal(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clases"
        description="Agenda inicial de actividades con cupos, inscripciones, asistencia y cancelaciones trazables."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={openCreateSchedule}>Nuevo horario</Button>
            <Button variant="secondary" onClick={() => setEnrollmentModal(true)}>Inscribir cliente</Button>
            <Button onClick={openCreateActivity}>Nueva actividad</Button>
          </div>
        }
      />

      <Card className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label>
          <Select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            <option value="">Todas las sucursales</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </Select>
        </div>
        <div className="panel-muted flex items-center justify-between p-4"><span className="text-sm text-ink-600">Actividades</span><span className="font-semibold text-ink-900">{activities.length}</span></div>
        <div className="panel-muted flex items-center justify-between p-4"><span className="text-sm text-ink-600">Horarios</span><span className="font-semibold text-ink-900">{schedules.length}</span></div>
        <div className="panel-muted flex items-center justify-between p-4"><span className="text-sm text-ink-600">Inscriptos</span><span className="font-semibold text-ink-900">{enrollments.length}</span></div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-ink-900">Actividades</h3>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
          <div className="mt-5 space-y-3">
            {activities.length ? (
              activities.map((activity) => (
                <div key={activity.id} className="panel-muted p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink-900">{activity.name}</p>
                      <p className="text-sm text-ink-600">{activity.code} · cupo base {activity.capacity}</p>
                      <p className="mt-2 text-sm text-ink-600">Extra {formatCurrency(Number(activity.extraFee ?? 0))}</p>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge value={activity.status} />
                      <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => openEditActivity(activity)}>Editar</Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-600">No hay actividades registradas.</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Horarios proximos</h3>
          <DataTable columns={['Inicio', 'Actividad', 'Sucursal', 'Instructor', 'Cupos', 'Estado', 'Acciones']}>
            {schedules.length ? (
              schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td className="px-5 py-4 text-sm text-ink-600">{formatDateTime(schedule.startsAt)}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-ink-900">{schedule.activity.name}</td>
                  <td className="px-5 py-4 text-sm text-ink-600">{schedule.branch.name}</td>
                  <td className="px-5 py-4 text-sm text-ink-600">{schedule.instructor ? `${schedule.instructor.firstName} ${schedule.instructor.lastName}` : '-'}</td>
                  <td className="px-5 py-4 text-sm text-ink-600">{schedule.enrollments.filter((item) => item.status !== 'CANCELLED').length} / {schedule.capacityOverride ?? schedule.activity.capacity}</td>
                  <td className="px-5 py-4"><StatusBadge value={schedule.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => openEditSchedule(schedule)}>Editar</Button>
                      {schedule.status !== 'CANCELLED' ? <Button variant="ghost" className="px-3 py-2 text-xs text-danger" onClick={() => cancelSchedule(schedule.id)}>Cancelar</Button> : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td className="px-5 py-6 text-sm text-ink-500" colSpan={7}>No hay horarios cargados.</td></tr>
            )}
          </DataTable>
        </Card>
      </div>

      <Card>
        <h3 className="text-2xl font-bold text-ink-900">Inscripciones y asistencia</h3>
        <DataTable columns={['Cliente', 'Clase', 'Sucursal', 'Estado', 'Extra pendiente', 'Acciones']}>
          {enrollments.length ? (
            enrollments.map((enrollment) => (
              <tr key={enrollment.id}>
                <td className="px-5 py-4">
                  <p className="font-semibold text-ink-900">{enrollment.client.firstName} {enrollment.client.lastName}</p>
                  <p className="text-sm text-ink-600">{enrollment.client.memberNumber}</p>
                </td>
                <td className="px-5 py-4 text-sm text-ink-600">{enrollment.schedule.activity.name}<br />{formatDateTime(enrollment.schedule.startsAt)}</td>
                <td className="px-5 py-4 text-sm text-ink-600">{enrollment.schedule.branch.name}</td>
                <td className="px-5 py-4"><StatusBadge value={enrollment.status} /></td>
                <td className="px-5 py-4 text-sm text-ink-600">{enrollment.receivables[0] ? formatCurrency(Number(enrollment.receivables[0].balanceAmount)) : '-'}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {enrollment.status === 'ENROLLED' ? <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => attendance(enrollment.id, 'ATTENDED')}>Asistencia</Button> : null}
                    {enrollment.status === 'ENROLLED' ? <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => attendance(enrollment.id, 'NO_SHOW')}>No show</Button> : null}
                    {enrollment.status !== 'CANCELLED' ? <Button variant="ghost" className="px-3 py-2 text-xs text-danger" onClick={() => cancelEnrollment(enrollment.id)}>Cancelar</Button> : null}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr><td className="px-5 py-6 text-sm text-ink-500" colSpan={6}>No hay inscripciones registradas.</td></tr>
          )}
        </DataTable>
      </Card>

      <Modal open={activityModal} title={editingActivityId ? 'Editar actividad' : 'Nueva actividad'}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submitActivity}>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label><Select {...activityForm.register('branchId')}><option value="">Global</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Estado</label><Select {...activityForm.register('status')}><option value="ACTIVE">Activa</option><option value="INACTIVE">Inactiva</option><option value="CANCELLED">Cancelada</option></Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Codigo</label><Input {...activityForm.register('code')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Nombre</label><Input {...activityForm.register('name')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Cupo base</label><Input type="number" {...activityForm.register('capacity')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Extra</label><Input type="number" {...activityForm.register('extraFee')} /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium text-ink-700">Descripcion</label><Textarea {...activityForm.register('description')} /></div>
          <label className="flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" {...activityForm.register('requiresValidMembership')} /> Requiere membresia valida</label>
          <label className="flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" {...activityForm.register('isIncludedByDefault')} /> Incluida por defecto</label>
          <div className="md:col-span-2 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setActivityModal(false)}>Cancelar</Button><Button type="submit">{editingActivityId ? 'Guardar cambios' : 'Crear actividad'}</Button></div>
        </form>
      </Modal>

      <Modal open={scheduleModal} title={editingScheduleId ? 'Editar horario' : 'Nuevo horario'}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submitSchedule}>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Actividad</label><Select {...scheduleForm.register('activityId')}>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.name}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label><Select {...scheduleForm.register('branchId')}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Instructor</label><Select {...scheduleForm.register('instructorId')}><option value="">Sin asignar</option>{users.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Sala</label><Input {...scheduleForm.register('room')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Inicio</label><Input type="datetime-local" {...scheduleForm.register('startsAt')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Fin</label><Input type="datetime-local" {...scheduleForm.register('endsAt')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Cupo override</label><Input type="number" {...scheduleForm.register('capacityOverride')} /></div>
          <div className="md:col-span-2 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setScheduleModal(false)}>Cancelar</Button><Button type="submit">{editingScheduleId ? 'Guardar cambios' : 'Crear horario'}</Button></div>
        </form>
      </Modal>

      <Modal open={enrollmentModal} title="Inscribir cliente">
        <form className="grid gap-4" onSubmit={submitEnrollment}>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Cliente</label><Select {...enrollmentForm.register('clientId')}>{clients.map((client) => <option key={client.id} value={client.id}>{client.memberNumber} · {client.firstName} {client.lastName}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Horario</label><Select {...enrollmentForm.register('scheduleId')}>{schedules.filter((schedule) => schedule.status === 'SCHEDULED').map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.activity.name} · {formatDateTime(schedule.startsAt)}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Notas</label><Textarea {...enrollmentForm.register('notes')} /></div>
          <div className="flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setEnrollmentModal(false)}>Cancelar</Button><Button type="submit">Inscribir</Button></div>
        </form>
      </Modal>
    </div>
  );
}
