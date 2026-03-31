export type RoleCode = 'ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'COLLECTIONS';

export type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  role: {
    id: string;
    code: RoleCode;
    name: string;
  };
  branchId?: string | null;
};
