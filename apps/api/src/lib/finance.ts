export const toNumber = (value: unknown) => Number(value ?? 0);

export const calculateNetAmount = (
  grossAmount: number,
  discountAmount = 0,
  surchargeAmount = 0,
) => grossAmount - discountAmount + surchargeAmount;

export const deriveReceivableStatus = (
  balanceAmount: number,
  originalAmount: number,
  dueDate: Date,
) => {
  if (balanceAmount <= 0) {
    return 'PAID' as const;
  }

  if (dueDate < new Date()) {
    return 'OVERDUE' as const;
  }

  if (balanceAmount < originalAmount) {
    return 'PARTIAL' as const;
  }

  return 'OPEN' as const;
};
