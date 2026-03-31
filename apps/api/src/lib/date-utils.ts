import type { PlanDurationUnit } from '@prisma/client';

const addMonths = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + amount);
  return result;
};

export const calculateMembershipEndDate = (
  startsAt: Date,
  durationUnit: PlanDurationUnit,
  durationCount: number,
) => {
  const baseDate = new Date(startsAt);

  switch (durationUnit) {
    case 'DAY':
      baseDate.setDate(baseDate.getDate() + durationCount);
      return baseDate;
    case 'WEEK':
      baseDate.setDate(baseDate.getDate() + durationCount * 7);
      return baseDate;
    case 'MONTH':
      return addMonths(baseDate, durationCount);
    case 'QUARTER':
      return addMonths(baseDate, durationCount * 3);
    case 'SEMESTER':
      return addMonths(baseDate, durationCount * 6);
    case 'YEAR':
      return addMonths(baseDate, durationCount * 12);
    case 'CUSTOM':
      baseDate.setDate(baseDate.getDate() + durationCount);
      return baseDate;
    default:
      return baseDate;
  }
};

export const isCurrentRange = (startsAt: Date, endsAt: Date, reference = new Date()) =>
  startsAt <= reference && endsAt >= reference;

export const getDayOfWeek = (date: Date) => date.getDay();
export const getHourMinute = (date: Date) => date.toISOString().slice(11, 16);

export const startOfDay = (date = new Date()) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

export const endOfDay = (date = new Date()) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

export const startOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);

export const endOfMonth = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

export const addDays = (date: Date, amount: number) => {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
};

export const resolveDateRange = (input?: { dateFrom?: Date; dateTo?: Date }) => ({
  dateFrom: input?.dateFrom ? startOfDay(input.dateFrom) : undefined,
  dateTo: input?.dateTo ? endOfDay(input.dateTo) : undefined,
});
