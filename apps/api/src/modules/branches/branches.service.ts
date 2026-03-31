import { AppError } from '../../core/errors/app-error.js';
import { auditService } from '../audit/audit.service.js';
import { branchesRepository } from './branches.repository.js';

type BranchPayload = {
  code?: string;
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  independentCashRegister?: boolean;
  operatingHours?: Array<{
    dayOfWeek: number;
    opensAt: string;
    closesAt: string;
    isClosed?: boolean;
  }>;
};

export class BranchesService {
  list() {
    return branchesRepository.list();
  }

  async create(input: BranchPayload, actor: { userId: string; branchId?: string | null }) {
    const existing = await branchesRepository.findByCode(input.code!);

    if (existing) {
      throw new AppError('Ya existe una sucursal con ese codigo.', 409, 'BRANCH_CODE_EXISTS');
    }

    const branch = await branchesRepository.create({
      code: input.code!,
      name: input.name!,
      address: input.address,
      phone: input.phone,
      email: input.email,
      timezone: input.timezone ?? 'America/Argentina/Buenos_Aires',
      status: input.status ?? 'ACTIVE',
      independentCashRegister: input.independentCashRegister ?? true,
      operatingHours: {
        create: (input.operatingHours ?? []).map((item) => ({
          dayOfWeek: item.dayOfWeek,
          opensAt: item.opensAt,
          closesAt: item.closesAt,
          isClosed: item.isClosed ?? false,
        })),
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: actor.branchId,
      action: 'CREATE',
      entityName: 'Branch',
      entityId: branch.id,
      description: 'Alta de sucursal',
    });

    return branch;
  }

  async update(id: string, input: BranchPayload, actor: { userId: string; branchId?: string | null }) {
    const existing = await branchesRepository.findById(id);

    if (!existing) {
      throw new AppError('Sucursal no encontrada.', 404, 'BRANCH_NOT_FOUND');
    }

    const branch = await branchesRepository.update(id, {
      code: input.code,
      name: input.name,
      address: input.address,
      phone: input.phone,
      email: input.email,
      timezone: input.timezone,
      status: input.status,
      independentCashRegister: input.independentCashRegister,
      operatingHours: input.operatingHours
        ? {
            deleteMany: {},
            create: input.operatingHours.map((item) => ({
              dayOfWeek: item.dayOfWeek,
              opensAt: item.opensAt,
              closesAt: item.closesAt,
              isClosed: item.isClosed ?? false,
            })),
          }
        : undefined,
    });

    await auditService.record({
      userId: actor.userId,
      branchId: actor.branchId,
      action: 'UPDATE',
      entityName: 'Branch',
      entityId: branch.id,
      description: 'Actualizacion de sucursal',
    });

    return branch;
  }
}

export const branchesService = new BranchesService();
