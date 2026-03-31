import type { RoleCode } from '@prisma/client';

export type AuthenticatedSession = {
  userId: string;
  email: string;
  role: RoleCode;
  permissions: string[];
  branchId: string | null;
};
