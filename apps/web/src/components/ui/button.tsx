'use client';

import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const variants = {
  primary: 'bg-ink-900 text-white hover:bg-ink-800',
  secondary: 'bg-white text-ink-900 border border-ink-200 hover:bg-ink-50',
  danger: 'bg-danger text-white hover:bg-danger/90',
  ghost: 'bg-transparent text-ink-700 hover:bg-ink-50',
};

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
