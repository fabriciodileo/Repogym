import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20',
        props.className,
      )}
    />
  );
}
