import { cn } from '@/lib/utils';

const variants = {
  ACTIVE: 'bg-mint/10 text-mint',
  INACTIVE: 'bg-ink-100 text-ink-700',
  SUSPENDED: 'bg-danger/10 text-danger',
  OVERDUE: 'bg-warning/15 text-warning',
  PENDING: 'bg-ink-100 text-ink-700',
  PAUSED: 'bg-warning/15 text-warning',
  FROZEN: 'bg-ink-200 text-ink-700',
  CANCELLED: 'bg-danger/10 text-danger',
  EXPIRED: 'bg-danger/10 text-danger',
  REGISTERED: 'bg-mint/10 text-mint',
  VOIDED: 'bg-danger/10 text-danger',
  ALLOWED: 'bg-mint/10 text-mint',
  DENIED: 'bg-danger/10 text-danger',
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
        variants[value as keyof typeof variants] ?? 'bg-ink-100 text-ink-700',
      )}
    >
      {value}
    </span>
  );
}
