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
      membershipReminderDays: 5,
      classReminderHours: 24,
    },
  });

  useEffect(() => {
    apiRequest<{ data: any[] }>('settings').then((response) => {
      const profile = response.data.find((item) => item.group === 'business' && item.key === 'profile');
      const notificationRules = response.data.find((item) => item.group === 'notifications' && item.key === 'operational_rules');

      reset({
        gymName: profile?.value?.name ?? '',
        currency: profile?.value?.currency ?? 'ARS',
        graceDays: profile?.value?.graceDays ?? 3,
        welcomeMessage: profile?.value?.welcomeMessage ?? '',
        membershipReminderDays: notificationRules?.value?.membershipReminderDays ?? 5,
        classReminderHours: notificationRules?.value?.classReminderHours ?? 24,
      });
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
          {
            group: 'notifications',
            key: 'operational_rules',
            value: {
              membershipReminderDays: Number(values.membershipReminderDays),
              classReminderHours: Number(values.classReminderHours),
            },
            description: 'Reglas operativas de alertas y recordatorios',
          },
        ],
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Configuracion general" description="Parametros base del negocio y reglas operativas para alertas de vencimiento y clases." />
      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Nombre del gimnasio</label><Input {...register('gymName')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Moneda</label><Input {...register('currency')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Dias de gracia</label><Input type="number" {...register('graceDays')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Recordar vencimientos con</label><Input type="number" {...register('membershipReminderDays')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Recordatorio de clase (horas)</label><Input type="number" {...register('classReminderHours')} /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium text-ink-700">Mensaje de bienvenida</label><Textarea {...register('welcomeMessage')} /></div>
          <div className="md:col-span-2 flex justify-end gap-3"><Button type="submit">Guardar configuracion</Button></div>
        </form>
        {saved ? <p className="mt-4 text-sm text-mint">Configuracion guardada correctamente.</p> : null}
      </Card>
    </div>
  );
}
