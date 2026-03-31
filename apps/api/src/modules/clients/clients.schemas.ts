import { z } from 'zod';

const accessCredentialSchema = z.object({
  type: z.enum(['RFID_TAG', 'QR_TOKEN', 'EXTERNAL_CARD']),
  value: z.string().min(3),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

export const clientsListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().trim().optional(),
  branchId: z.string().cuid().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'OVERDUE']).optional(),
});

export const createClientSchema = z.object({
  branchId: z.string().cuid(),
  memberNumber: z.string().optional(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dni: z.string().min(6).max(20),
  birthDate: z.coerce.date().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  medicalNotes: z.string().optional(),
  photoUrl: z.string().url().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'OVERDUE']).optional(),
  internalNotes: z.string().optional(),
  administrativeBlock: z.boolean().optional(),
  administrativeBlockReason: z.string().optional(),
  credentials: z.array(accessCredentialSchema).optional(),
});

export const updateClientSchema = createClientSchema.partial();
export const clientIdParamSchema = z.object({ id: z.string().cuid() });
