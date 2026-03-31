import { clsx, type ClassValue } from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);

export const formatDateTime = (value?: string | Date | null) => {
  if (!value) return '-';
  return format(new Date(value), 'dd MMM yyyy, HH:mm', { locale: es });
};

export const formatDateOnly = (value?: string | Date | null) => {
  if (!value) return '-';
  return format(new Date(value), 'dd MMM yyyy', { locale: es });
};
