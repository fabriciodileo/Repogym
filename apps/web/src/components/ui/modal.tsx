import type { ReactNode } from 'react';

export function Modal({
  open,
  title,
  description,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 p-4 backdrop-blur-sm">
      <div className="panel max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-ink-900">{title}</h2>
          {description ? <p className="mt-2 text-sm text-ink-600">{description}</p> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
