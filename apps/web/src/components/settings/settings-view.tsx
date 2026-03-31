'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api-client';

export function SettingsView() {
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      gymName: '',
      currency: 'ARS',
      graceDays: 3,
      welcomeMessage: '',
    },
  });

  useEffect(() => {
    apiRequest<{ data: any[] }>('settings').then((response) => {
      const profile = response.data.find((item) => item.group === 'business' && item.key === 'profile');
      if (profile?.value) {
        reset({
          gymName: profile.value.name ?? '',
          currency: profile.value.currency ?? 'ARS',
          graceDays: profile.value.graceDays ?? 3,
          welcomeMessage: profile.value.welcomeMessage ?? '',
        });
      }
    });
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    await apiRequest('settings/bulk', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            group: 'business',
            key: 'profile',
            value: {
              name: values.gymName,
              currency: values.currency,
              graceDays: Number(values.graceDays),
              welcomeMessage: values.welcomeMessage,
            },
            description: 'Configuracion general del gimnasio',
          },
        ],
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Configuracion general" description="Parametros base del negocio para nombre comercial, moneda y politicas operativas iniciales." />
      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Nombre del gimnasio</label><Input {...register('gymName')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Moneda</label><Input {...register('currency')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Dias de gracia</label><Input type="number" {...register('graceDays')} /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium text-ink-700">Mensaje de bienvenida</label><Textarea {...register('welcomeMessage')} /></div>
          <div className="md:col-span-2 flex justify-end gap-3"><Button type="submit">Guardar configuracion</Button></div>
        </form>
        {saved ? <p className="mt-4 text-sm text-mint">Configuracion guardada correctamente.</p> : null}
      </Card>
    </div>
  );
}
