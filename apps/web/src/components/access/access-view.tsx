'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiRequest } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';

export function AccessView() {
  const [branches, setBranches] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      branchId: '',
      identifier: '',
      method: 'DNI',
      deviceCode: 'TORNIQ-CASA-01',
    },
  });

  const loadData = async () => {
    const [branchesResponse, logsResponse] = await Promise.all([
      apiRequest<{ data: any[] }>('branches'),
      apiRequest<{ data: any[] }>('access-control/logs'),
    ]);
    setBranches(branchesResponse.data);
    setLogs(logsResponse.data);
    if (!watch('branchId') && branchesResponse.data[0]) {
      setValue('branchId', branchesResponse.data[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    const response = await apiRequest<any>('access-control/validate', {
      method: 'POST',
      body: JSON.stringify(values),
    });
    setResult(response);
    await loadData();
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Control de acceso" description="Validacion manual preparada para lectores, QR, RFID y terminales fisicas desacopladas." />
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Validar ingreso</h3>
          <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
            <div><label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label><Select {...register('branchId')}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
            <div><label className="mb-2 block text-sm font-medium text-ink-700">Metodo</label><Select {...register('method')}><option value="DNI">DNI</option><option value="MEMBER_NUMBER">Numero de socio</option><option value="RFID">RFID</option><option value="QR_CODE">QR</option><option value="MANUAL_OVERRIDE">Manual</option></Select></div>
            <div><label className="mb-2 block text-sm font-medium text-ink-700">Identificador</label><Input {...register('identifier')} placeholder="Documento, RFID o numero de socio" /></div>
            <div><label className="mb-2 block text-sm font-medium text-ink-700">Dispositivo</label><Input {...register('deviceCode')} placeholder="TORNIQ-CASA-01" /></div>
            <Button type="submit">Validar acceso</Button>
          </form>
          {result ? (
            <div className="mt-6 rounded-3xl border border-ink-100 bg-ink-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-900">Resultado</p>
                  <p className="mt-1 text-sm text-ink-600">{result.message}</p>
                </div>
                <StatusBadge value={result.allowed ? 'ALLOWED' : 'DENIED'} />
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-ink-500">{result.action?.detail}</p>
            </div>
          ) : null}
        </Card>

        <DataTable columns={['Fecha', 'Cliente', 'Metodo', 'Resultado', 'Detalle']}>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="px-5 py-4 text-sm text-ink-600">{formatDateTime(log.attemptedAt)}</td>
              <td className="px-5 py-4 text-sm text-ink-900">{log.client ? `${log.client.firstName} ${log.client.lastName}` : '-'}</td>
              <td className="px-5 py-4 text-sm text-ink-600">{log.method}</td>
              <td className="px-5 py-4"><StatusBadge value={log.result} /></td>
              <td className="px-5 py-4 text-sm text-ink-600">{log.message ?? '-'}</td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
