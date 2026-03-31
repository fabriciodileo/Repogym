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
