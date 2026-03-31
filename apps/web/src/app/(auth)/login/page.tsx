'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Dumbbell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const schema = z.object({
  email: z.string().email('Ingresa un email valido'),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'admin@gym.local',
      password: 'Admin1234!',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    setError(null);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.error?.message ?? 'No se pudo iniciar sesion.');
      setLoading(false);
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="relative overflow-hidden border-none bg-ink-900 p-8 text-white lg:p-12">
          <div className="absolute -right-20 top-0 h-60 w-60 rounded-full bg-ember/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-60 w-60 rounded-full bg-mint/20 blur-3xl" />
          <div className="relative z-10 max-w-xl">
            <div className="mb-6 inline-flex rounded-2xl bg-white/10 p-3 text-white">
              <Dumbbell className="h-7 w-7" />
            </div>
            <p className="mono text-xs uppercase tracking-[0.34em] text-white/70">Gym Management Platform</p>
            <h1 className="mt-5 text-5xl font-bold leading-tight">Opera clientes, cobranzas y accesos fisicos desde un mismo tablero.</h1>
            <p className="mt-6 text-lg text-white/75">
              Base profesional para recepcion, gerencia y cobranzas con arquitectura modular lista para crecer a sucursales, caja, stock y molinetes.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold">Acceso validado</p>
                <p className="mt-2 text-sm text-white/70">RFID, QR, DNI o numero de socio con reglas de mora, horario y sucursal.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold">Cobranza real</p>
                <p className="mt-2 text-sm text-white/70">Pagos parciales, anulaciones y cuentas a cobrar enlazadas a membresias.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-8 lg:p-10">
          <p className="mono text-xs uppercase tracking-[0.34em] text-ember">Acceso interno</p>
          <h2 className="mt-4 text-3xl font-bold text-ink-900">Iniciar sesion</h2>
          <p className="mt-3 text-sm text-ink-600">Usa el usuario seed `admin@gym.local` con la clave `Admin1234!` para entrar por primera vez.</p>

          <form className="mt-8 space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Email</label>
              <Input {...register('email')} placeholder="admin@gym.local" />
              {errors.email ? <p className="mt-2 text-xs text-danger">{errors.email.message}</p> : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Contrasena</label>
              <Input type="password" {...register('password')} placeholder="********" />
              {errors.password ? <p className="mt-2 text-xs text-danger">{errors.password.message}</p> : null}
            </div>
            {error ? <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
            <Button className="w-full py-3" type="submit" disabled={loading}>
              {loading ? 'Validando sesion...' : 'Entrar al panel'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
