import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';

const prisma = new PrismaClient();

const permissions = [
  { code: 'users.read', name: 'Ver usuarios' },
  { code: 'users.write', name: 'Gestionar usuarios' },
  { code: 'clients.read', name: 'Ver clientes' },
  { code: 'clients.write', name: 'Gestionar clientes' },
  { code: 'plans.read', name: 'Ver planes' },
  { code: 'plans.write', name: 'Gestionar planes' },
  { code: 'memberships.read', name: 'Ver membresias' },
  { code: 'memberships.write', name: 'Gestionar membresias' },
  { code: 'payments.read', name: 'Ver pagos' },
  { code: 'payments.write', name: 'Registrar pagos' },
  { code: 'access.validate', name: 'Validar accesos' },
  { code: 'audit.read', name: 'Ver auditoria' },
  { code: 'settings.write', name: 'Modificar configuracion' },
];

const rolePermissionsMap: Record<string, string[]> = {
  ADMIN: permissions.map((permission) => permission.code),
  MANAGER: [
    'users.read',
    'clients.read',
    'clients.write',
    'plans.read',
    'plans.write',
    'memberships.read',
    'memberships.write',
    'payments.read',
    'payments.write',
    'access.validate',
    'audit.read',
    'settings.write',
  ],
  RECEPTIONIST: ['clients.read', 'clients.write', 'plans.read', 'memberships.read', 'memberships.write', 'payments.read', 'payments.write', 'access.validate'],
  COLLECTIONS: ['clients.read', 'payments.read', 'payments.write', 'memberships.read', 'access.validate'],
};

const branchHours = [
  { dayOfWeek: 1, opensAt: '06:00', closesAt: '22:00', isClosed: false },
  { dayOfWeek: 2, opensAt: '06:00', closesAt: '22:00', isClosed: false },
  { dayOfWeek: 3, opensAt: '06:00', closesAt: '22:00', isClosed: false },
  { dayOfWeek: 4, opensAt: '06:00', closesAt: '22:00', isClosed: false },
  { dayOfWeek: 5, opensAt: '06:00', closesAt: '22:00', isClosed: false },
  { dayOfWeek: 6, opensAt: '08:00', closesAt: '18:00', isClosed: false },
  { dayOfWeek: 0, opensAt: '09:00', closesAt: '13:00', isClosed: false },
];

async function main() {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name },
      create: permission,
    });
  }

  for (const roleCode of ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'COLLECTIONS'] as const) {
    const role = await prisma.role.upsert({
      where: { code: roleCode },
      update: {
        name:
          roleCode === 'ADMIN'
            ? 'Administrador'
            : roleCode === 'MANAGER'
              ? 'Gerente'
              : roleCode === 'RECEPTIONIST'
                ? 'Recepcionista'
                : 'Cobranzas',
      },
      create: {
        code: roleCode,
        name:
          roleCode === 'ADMIN'
            ? 'Administrador'
            : roleCode === 'MANAGER'
              ? 'Gerente'
              : roleCode === 'RECEPTIONIST'
                ? 'Recepcionista'
                : 'Cobranzas',
      },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const permissionCode of rolePermissionsMap[roleCode]) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permissionCode } });
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const branch = await prisma.branch.upsert({
    where: { code: 'CASA' },
    update: {
      name: 'Sucursal Central',
      operatingHours: {
        deleteMany: {},
        create: branchHours,
      },
    },
    create: {
      code: 'CASA',
      name: 'Sucursal Central',
      address: 'Av. Principal 123',
      phone: '+54 11 5555 0101',
      email: 'central@gym.local',
      operatingHours: {
        create: branchHours,
      },
    },
  });

  await prisma.systemSetting.upsert({
    where: {
      group_key: {
        group: 'business',
        key: 'profile',
      },
    },
    update: {
      value: {
        name: 'GYM Control Pro',
        currency: 'ARS',
        graceDays: 3,
      },
    },
    create: {
      group: 'business',
      key: 'profile',
      value: {
        name: 'GYM Control Pro',
        currency: 'ARS',
        graceDays: 3,
      } as Prisma.InputJsonValue,
    },
  });

  await prisma.systemSetting.upsert({
    where: {
      group_key: {
        group: 'sequence',
        key: 'member_number_casa',
      },
    },
    update: {
      value: { next: 3 },
    },
    create: {
      group: 'sequence',
      key: 'member_number_casa',
      value: { next: 3 } as Prisma.InputJsonValue,
    },
  });

  await prisma.systemSetting.upsert({
    where: {
      group_key: {
        group: 'sequence',
        key: 'receipt_number',
      },
    },
    update: {
      value: { next: 1 },
    },
    create: {
      group: 'sequence',
      key: 'receipt_number',
      value: { next: 1 } as Prisma.InputJsonValue,
    },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
  const managerRole = await prisma.role.findUniqueOrThrow({ where: { code: 'MANAGER' } });
  const receptionistRole = await prisma.role.findUniqueOrThrow({ where: { code: 'RECEPTIONIST' } });

  const adminPasswordHash = await hashPassword('Admin1234!');
  await prisma.user.upsert({
    where: { email: 'admin@gym.local' },
    update: {
      firstName: 'System',
      lastName: 'Admin',
      passwordHash: adminPasswordHash,
      roleId: adminRole.id,
      branchId: branch.id,
    },
    create: {
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@gym.local',
      passwordHash: adminPasswordHash,
      roleId: adminRole.id,
      branchId: branch.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'gerencia@gym.local' },
    update: {
      firstName: 'Paula',
      lastName: 'Rivas',
      passwordHash: await hashPassword('Manager1234!'),
      roleId: managerRole.id,
      branchId: branch.id,
    },
    create: {
      firstName: 'Paula',
      lastName: 'Rivas',
      email: 'gerencia@gym.local',
      passwordHash: await hashPassword('Manager1234!'),
      roleId: managerRole.id,
      branchId: branch.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'recepcion@gym.local' },
    update: {
      firstName: 'Lucia',
      lastName: 'Mendez',
      passwordHash: await hashPassword('Recepcion1234!'),
      roleId: receptionistRole.id,
      branchId: branch.id,
    },
    create: {
      firstName: 'Lucia',
      lastName: 'Mendez',
      email: 'recepcion@gym.local',
      passwordHash: await hashPassword('Recepcion1234!'),
      roleId: receptionistRole.id,
      branchId: branch.id,
    },
  });

  const monthlyPlan = await prisma.membershipPlan.upsert({
    where: { code: 'MENSUAL-LIBRE' },
    update: {
      name: 'Mensual Libre',
      price: new Prisma.Decimal(28000),
    },
    create: {
      code: 'MENSUAL-LIBRE',
      name: 'Mensual Libre',
      description: 'Acceso libre en sucursal central',
      durationUnit: 'MONTH',
      durationCount: 1,
      price: new Prisma.Decimal(28000),
      allowFreeze: true,
      lateFeeEnabled: true,
      lateFeePercent: new Prisma.Decimal(5),
      graceDays: 3,
      branchLinks: {
        create: {
          branchId: branch.id,
        },
      },
    },
  });

  const weeklyPlan = await prisma.membershipPlan.upsert({
    where: { code: 'SEMANAL-3X' },
    update: {
      name: 'Semanal 3 accesos',
      price: new Prisma.Decimal(9500),
    },
    create: {
      code: 'SEMANAL-3X',
      name: 'Semanal 3 accesos',
      description: 'Hasta tres accesos por semana',
      durationUnit: 'WEEK',
      durationCount: 1,
      price: new Prisma.Decimal(9500),
      accessLimit: 3,
      branchLinks: {
        create: {
          branchId: branch.id,
        },
      },
    },
  });

  const juan = await prisma.client.upsert({
    where: { dni: '30111222' },
    update: {
      firstName: 'Juan',
      lastName: 'Perez',
      branchId: branch.id,
      memberNumber: 'CASA-000001',
      phone: '+54 11 4444 1111',
      email: 'juan.perez@example.com',
      status: 'ACTIVE',
    },
    create: {
      branchId: branch.id,
      memberNumber: 'CASA-000001',
      firstName: 'Juan',
      lastName: 'Perez',
      dni: '30111222',
      phone: '+54 11 4444 1111',
      email: 'juan.perez@example.com',
      status: 'ACTIVE',
    },
  });

  const flor = await prisma.client.upsert({
    where: { dni: '28999111' },
    update: {
      firstName: 'Florencia',
      lastName: 'Lopez',
      branchId: branch.id,
      memberNumber: 'CASA-000002',
      phone: '+54 11 4444 2222',
      email: 'flor.lopez@example.com',
      status: 'OVERDUE',
      administrativeBlock: false,
    },
    create: {
      branchId: branch.id,
      memberNumber: 'CASA-000002',
      firstName: 'Florencia',
      lastName: 'Lopez',
      dni: '28999111',
      phone: '+54 11 4444 2222',
      email: 'flor.lopez@example.com',
      status: 'OVERDUE',
    },
  });

  await prisma.accessCredential.upsert({
    where: { value: 'RFID-JUAN-001' },
    update: {
      clientId: juan.id,
      isPrimary: true,
      isActive: true,
    },
    create: {
      clientId: juan.id,
      type: 'RFID_TAG',
      value: 'RFID-JUAN-001',
      isPrimary: true,
      isActive: true,
    },
  });

  await prisma.accessDevice.upsert({
    where: { code: 'TORNIQ-CASA-01' },
    update: {
      name: 'Molinete Recepcion',
      branchId: branch.id,
      type: 'TURNSTILE',
    },
    create: {
      branchId: branch.id,
      code: 'TORNIQ-CASA-01',
      name: 'Molinete Recepcion',
      type: 'TURNSTILE',
      integrationMode: 'SIMULATED',
      locationDescription: 'Ingreso principal',
    },
  });

  const activeMembership = await prisma.clientMembership.findFirst({
    where: {
      clientId: juan.id,
      planId: monthlyPlan.id,
      status: 'ACTIVE',
      deletedAt: null,
    },
  });

  if (!activeMembership) {
    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setMonth(endsAt.getMonth() + 1);

    const membership = await prisma.clientMembership.create({
      data: {
        clientId: juan.id,
        branchId: branch.id,
        planId: monthlyPlan.id,
        status: 'ACTIVE',
        startsAt,
        endsAt,
        activatedAt: new Date(),
        agreedAmount: new Prisma.Decimal(28000),
        discountAmount: new Prisma.Decimal(0),
        surchargeAmount: new Prisma.Decimal(0),
        autoRenew: false,
      },
    });

    await prisma.receivable.create({
      data: {
        clientId: juan.id,
        branchId: branch.id,
        membershipId: membership.id,
        type: 'MEMBERSHIP',
        description: 'Membresia Mensual Libre',
        originalAmount: new Prisma.Decimal(28000),
        discountAmount: new Prisma.Decimal(0),
        surchargeAmount: new Prisma.Decimal(0),
        balanceAmount: new Prisma.Decimal(0),
        dueDate: startsAt,
        status: 'PAID',
        settledAt: new Date(),
      },
    });
  }

  const overdueMembership = await prisma.clientMembership.findFirst({
    where: {
      clientId: flor.id,
      planId: weeklyPlan.id,
      deletedAt: null,
    },
  });

  if (!overdueMembership) {
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() - 10);
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + 7);

    const membership = await prisma.clientMembership.create({
      data: {
        clientId: flor.id,
        branchId: branch.id,
        planId: weeklyPlan.id,
        status: 'EXPIRED',
        startsAt,
        endsAt,
        agreedAmount: new Prisma.Decimal(9500),
        discountAmount: new Prisma.Decimal(0),
        surchargeAmount: new Prisma.Decimal(0),
        autoRenew: false,
        accessLimitSnapshot: 3,
        remainingAccesses: 0,
      },
    });

    await prisma.receivable.create({
      data: {
        clientId: flor.id,
        branchId: branch.id,
        membershipId: membership.id,
        type: 'MEMBERSHIP',
        description: 'Membresia Semanal 3 accesos',
        originalAmount: new Prisma.Decimal(9500),
        discountAmount: new Prisma.Decimal(0),
        surchargeAmount: new Prisma.Decimal(0),
        balanceAmount: new Prisma.Decimal(9500),
        dueDate: startsAt,
        status: 'OVERDUE',
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
