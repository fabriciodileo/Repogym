import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/70 p-6 backdrop-blur lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="gradient-line mb-4 h-1.5 w-20 rounded-full" />
        <h1 className="text-3xl font-bold text-ink-900">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-600">{description}</p>
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
