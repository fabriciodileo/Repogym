import { ArrowUpRight, type LucideIcon } from 'lucide-react';

import { Card } from './card';

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-ember/10 blur-2xl" />
      <div className="mb-6 flex items-center justify-between">
        <div className="rounded-2xl bg-ink-900 p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-mint" />
      </div>
      <p className="text-xs uppercase tracking-[0.18em] text-ink-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink-900">{value}</p>
      <p className="mt-2 text-sm text-ink-600">{helper}</p>
    </Card>
  );
}
