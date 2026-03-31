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
  { code: 'expenses.read', name: 'Ver gastos' },
  { code: 'expenses.write', name: 'Gestionar gastos' },
  { code: 'cash.read', name: 'Ver caja' },
  { code: 'cash.write', name: 'Gestionar caja' },
  { code: 'finance.read', name: 'Ver finanzas' },
  { code: 'reports.read', name: 'Ver reportes' },
  { code: 'products.read', name: 'Ver productos' },
  { code: 'products.write', name: 'Gestionar productos y stock' },
  { code: 'classes.read', name: 'Ver clases' },
  { code: 'classes.write', name: 'Gestionar clases' },
  { code: 'notifications.read', name: 'Ver notificaciones' },
  { code: 'notifications.write', name: 'Gestionar notificaciones' },
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
    'expenses.read',
    'expenses.write',
    'cash.read',
    'cash.write',
    'finance.read',
    'reports.read',
    'products.read',
    'products.write',
    'classes.read',
    'classes.write',
    'notifications.read',
    'notifications.write',
    'access.validate',
    'audit.read',
    'settings.write',
  ],
  RECEPTIONIST: [
    'clients.read',
    'clients.write',
    'plans.read',
    'memberships.read',
    'memberships.write',
    'payments.read',
    'payments.write',
    'expenses.read',
    'cash.read',
    'cash.write',
    'products.read',
    'products.write',
    'classes.read',
    'classes.write',
    'notifications.read',
    'access.validate',
  ],
  COLLECTIONS: [
    'clients.read',
    'payments.read',
    'payments.write',
    'memberships.read',
    'finance.read',
    'reports.read',
    'notifications.read',
    'access.validate',
  ],
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
      value: { next: 4 },
    },
    create: {
      group: 'sequence',
      key: 'member_number_casa',
      value: { next: 4 } as Prisma.InputJsonValue,
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

  await prisma.systemSetting.upsert({
    where: {
      group_key: {
        group: 'notifications',
        key: 'operational_rules',
      },
    },
    update: {
      value: {
        membershipReminderDays: 5,
        classReminderHours: 24,
      },
    },
    create: {
      group: 'notifications',
      key: 'operational_rules',
      value: {
        membershipReminderDays: 5,
        classReminderHours: 24,
      } as Prisma.InputJsonValue,
    },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
  const managerRole = await prisma.role.findUniqueOrThrow({ where: { code: 'MANAGER' } });
  const receptionistRole = await prisma.role.findUniqueOrThrow({ where: { code: 'RECEPTIONIST' } });
  const collectionsRole = await prisma.role.findUniqueOrThrow({ where: { code: 'COLLECTIONS' } });

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

  await prisma.user.upsert({
    where: { email: 'cobranzas@gym.local' },
    update: {
      firstName: 'Martin',
      lastName: 'Suarez',
      passwordHash: await hashPassword('Cobranzas1234!'),
      roleId: collectionsRole.id,
      branchId: branch.id,
    },
    create: {
      firstName: 'Martin',
      lastName: 'Suarez',
      email: 'cobranzas@gym.local',
      passwordHash: await hashPassword('Cobranzas1234!'),
      roleId: collectionsRole.id,
      branchId: branch.id,
    },
  });

  const monthlyPlan = await prisma.membershipPlan.upsert({
    where: { code: 'MENSUAL-LIBRE' },
    update: {
      name: 'Mensual Libre',
      price: new Prisma.Decimal(28000),
      includesSpecialClasses: true,
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
      includesSpecialClasses: true,
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

  const sofia = await prisma.client.upsert({
    where: { dni: '31888777' },
    update: {
      firstName: 'Sofia',
      lastName: 'Romero',
      branchId: branch.id,
      memberNumber: 'CASA-000003',
      phone: '+54 11 4444 3333',
      email: 'sofia.romero@example.com',
      status: 'ACTIVE',
    },
    create: {
      branchId: branch.id,
      memberNumber: 'CASA-000003',
      firstName: 'Sofia',
      lastName: 'Romero',
      dni: '31888777',
      phone: '+54 11 4444 3333',
      email: 'sofia.romero@example.com',
      status: 'ACTIVE',
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

  let activeMembership = await prisma.clientMembership.findFirst({
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

    activeMembership = membership;

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

  const managerUser = await prisma.user.findUniqueOrThrow({ where: { email: 'gerencia@gym.local' } });
  const receptionistUser = await prisma.user.findUniqueOrThrow({ where: { email: 'recepcion@gym.local' } });

  await prisma.accessCredential.upsert({
    where: { value: 'QR-SOFIA-001' },
    update: {
      clientId: sofia.id,
      isPrimary: true,
      isActive: true,
    },
    create: {
      clientId: sofia.id,
      type: 'QR_TOKEN',
      value: 'QR-SOFIA-001',
      isPrimary: true,
      isActive: true,
    },
  });

  let openCashSession = await prisma.cashSession.findFirst({
    where: {
      branchId: branch.id,
      status: 'OPEN',
    },
    orderBy: { openedAt: 'desc' },
  });

  if (!openCashSession) {
    openCashSession = await prisma.cashSession.create({
      data: {
        branchId: branch.id,
        openedById: receptionistUser.id,
        openingAmount: new Prisma.Decimal(50000),
        notes: 'Caja inicial seed',
      },
    });

    await prisma.cashMovement.create({
      data: {
        cashSessionId: openCashSession.id,
        branchId: branch.id,
        type: 'OPENING',
        amount: new Prisma.Decimal(50000),
        method: 'CASH',
        description: 'Apertura de caja seed',
        createdById: receptionistUser.id,
      },
    });
  }

  const sofiaMembership = await prisma.clientMembership.findFirst({
    where: {
      clientId: sofia.id,
      planId: monthlyPlan.id,
      deletedAt: null,
    },
  });

  let sofiaReceivable = await prisma.receivable.findFirst({
    where: {
      clientId: sofia.id,
      type: 'MEMBERSHIP',
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!sofiaMembership) {
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() - 5);
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 5);

    const membership = await prisma.clientMembership.create({
      data: {
        clientId: sofia.id,
        branchId: branch.id,
        planId: monthlyPlan.id,
        status: 'ACTIVE',
        startsAt,
        endsAt,
        activatedAt: startsAt,
        agreedAmount: new Prisma.Decimal(30000),
        discountAmount: new Prisma.Decimal(0),
        surchargeAmount: new Prisma.Decimal(0),
        autoRenew: false,
      },
    });

    sofiaReceivable = await prisma.receivable.create({
      data: {
        clientId: sofia.id,
        branchId: branch.id,
        membershipId: membership.id,
        type: 'MEMBERSHIP',
        description: 'Membresia Mensual Libre Sofia',
        originalAmount: new Prisma.Decimal(30000),
        discountAmount: new Prisma.Decimal(0),
        surchargeAmount: new Prisma.Decimal(0),
        balanceAmount: new Prisma.Decimal(10000),
        dueDate: startsAt,
        status: 'PARTIAL',
      },
    });
  }

  const sofiaPayment = await prisma.payment.findUnique({
    where: { receiptNumber: 'REC-00000001' },
  });

  if (!sofiaPayment && sofiaReceivable) {
    const payment = await prisma.payment.create({
      data: {
        clientId: sofia.id,
        branchId: branch.id,
        concept: 'Pago parcial membresia Sofia',
        grossAmount: new Prisma.Decimal(20000),
        discountAmount: new Prisma.Decimal(0),
        surchargeAmount: new Prisma.Decimal(0),
        finalAmount: new Prisma.Decimal(20000),
        method: 'BANK_TRANSFER',
        reference: 'TRX-SEED-0001',
        receiptNumber: 'REC-00000001',
        registeredById: managerUser.id,
        allocations: {
          create: sofiaReceivable
            ? {
                receivableId: sofiaReceivable.id,
                amount: new Prisma.Decimal(20000),
              }
            : undefined,
        },
      },
    });

    if (sofiaReceivable) {
      await prisma.receivable.update({
        where: { id: sofiaReceivable.id },
        data: {
          balanceAmount: new Prisma.Decimal(10000),
          status: 'PARTIAL',
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: managerUser.id,
        branchId: branch.id,
        action: 'PAYMENT_REGISTERED',
        entityName: 'Payment',
        entityId: payment.id,
        description: 'Pago seed de membresia Sofia',
      },
    });
  }

  const rentCategory = await prisma.expenseCategory.upsert({
    where: { code: 'ALQUILER' },
    update: { name: 'Alquiler', type: 'RENT' },
    create: {
      code: 'ALQUILER',
      name: 'Alquiler',
      type: 'RENT',
      description: 'Gastos fijos de alquiler',
    },
  });

  const servicesCategory = await prisma.expenseCategory.upsert({
    where: { code: 'SERVICIOS' },
    update: { name: 'Servicios', type: 'SERVICES' },
    create: {
      code: 'SERVICIOS',
      name: 'Servicios',
      type: 'SERVICES',
      description: 'Servicios publicos',
    },
  });

  const suppliesCategory = await prisma.expenseCategory.upsert({
    where: { code: 'INSUMOS' },
    update: { name: 'Insumos', type: 'SUPPLIES' },
    create: {
      code: 'INSUMOS',
      name: 'Insumos',
      type: 'SUPPLIES',
      description: 'Compras operativas de insumos',
    },
  });

  const cleaningCategory = await prisma.expenseCategory.upsert({
    where: { code: 'INSUMOS-LIMPIEZA' },
    update: {
      name: 'Insumos de limpieza',
      type: 'SUPPLIES',
      parentId: suppliesCategory.id,
    },
    create: {
      code: 'INSUMOS-LIMPIEZA',
      name: 'Insumos de limpieza',
      type: 'SUPPLIES',
      parentId: suppliesCategory.id,
    },
  });

  const electricityCategory = await prisma.expenseCategory.upsert({
    where: { code: 'SERV-LUZ' },
    update: {
      name: 'Electricidad',
      type: 'SERVICES',
      parentId: servicesCategory.id,
    },
    create: {
      code: 'SERV-LUZ',
      name: 'Electricidad',
      type: 'SERVICES',
      parentId: servicesCategory.id,
    },
  });

  const cleaningExpense = await prisma.expense.findFirst({
    where: {
      branchId: branch.id,
      description: 'Compra de insumos de limpieza',
      deletedAt: null,
    },
  });

  if (!cleaningExpense) {
    const expenseDate = new Date();
    const expense = await prisma.expense.create({
      data: {
        branchId: branch.id,
        categoryId: cleaningCategory.id,
        description: 'Compra de insumos de limpieza',
        amount: new Prisma.Decimal(8500),
        expenseDate,
        method: 'CASH',
        supplier: 'Distribuidora Delta',
        recordedById: receptionistUser.id,
        notes: 'Reposicion semanal de insumos',
      },
    });

    await prisma.cashMovement.create({
      data: {
        cashSessionId: openCashSession.id,
        branchId: branch.id,
        expenseId: expense.id,
        type: 'EXPENSE',
        amount: new Prisma.Decimal(8500),
        method: 'CASH',
        description: expense.description,
        createdById: receptionistUser.id,
      },
    });
  }

  const electricityExpense = await prisma.expense.findFirst({
    where: {
      branchId: branch.id,
      description: 'Factura de electricidad marzo',
      deletedAt: null,
    },
  });

  if (!electricityExpense) {
    const expenseDate = new Date();
    expenseDate.setDate(expenseDate.getDate() - 2);

    await prisma.expense.create({
      data: {
        branchId: branch.id,
        categoryId: electricityCategory.id,
        description: 'Factura de electricidad marzo',
        amount: new Prisma.Decimal(12400),
        expenseDate,
        method: 'BANK_TRANSFER',
        supplier: 'Energia Centro',
        recordedById: managerUser.id,
        notes: 'Pago de servicio mensual',
      },
    });
  }

  const rentExpense = await prisma.expense.findFirst({
    where: {
      branchId: branch.id,
      description: 'Alquiler sede central marzo',
      deletedAt: null,
    },
  });

  if (!rentExpense) {
    const expenseDate = new Date();
    expenseDate.setDate(1);

    await prisma.expense.create({
      data: {
        branchId: branch.id,
        categoryId: rentCategory.id,
        description: 'Alquiler sede central marzo',
        amount: new Prisma.Decimal(180000),
        expenseDate,
        method: 'BANK_TRANSFER',
        supplier: 'Propiedades Centro',
        recordedById: managerUser.id,
        notes: 'Canon mensual de alquiler',
      },
    });
  }

  const drinksCategory = await prisma.productCategory.upsert({
    where: { code: 'BEBIDAS' },
    update: { name: 'Bebidas' },
    create: {
      code: 'BEBIDAS',
      name: 'Bebidas',
      description: 'Bebidas frias',
    },
  });

  const snacksCategory = await prisma.productCategory.upsert({
    where: { code: 'SNACKS' },
    update: { name: 'Snacks' },
    create: {
      code: 'SNACKS',
      name: 'Snacks',
      description: 'Snacks saludables',
    },
  });

  const supplementsCategory = await prisma.productCategory.upsert({
    where: { code: 'SUPLEMENTOS' },
    update: { name: 'Suplementos' },
    create: {
      code: 'SUPLEMENTOS',
      name: 'Suplementos',
      description: 'Suplementacion deportiva',
    },
  });

  const agua = await prisma.product.upsert({
    where: { code: 'AGUA-500' },
    update: {
      branchId: branch.id,
      categoryId: drinksCategory.id,
      name: 'Agua mineral 500ml',
      stock: 18,
      minStock: 10,
      costPrice: new Prisma.Decimal(700),
      salePrice: new Prisma.Decimal(1500),
      supplier: 'Bebidas Sur',
      status: 'ACTIVE',
    },
    create: {
      branchId: branch.id,
      categoryId: drinksCategory.id,
      code: 'AGUA-500',
      name: 'Agua mineral 500ml',
      stock: 18,
      minStock: 10,
      costPrice: new Prisma.Decimal(700),
      salePrice: new Prisma.Decimal(1500),
      supplier: 'Bebidas Sur',
      status: 'ACTIVE',
    },
  });

  const barrita = await prisma.product.upsert({
    where: { code: 'BARRA-PRO' },
    update: {
      branchId: branch.id,
      categoryId: snacksCategory.id,
      name: 'Barra proteica',
      stock: 6,
      minStock: 8,
      costPrice: new Prisma.Decimal(900),
      salePrice: new Prisma.Decimal(2000),
      supplier: 'Snack Fit',
      status: 'ACTIVE',
    },
    create: {
      branchId: branch.id,
      categoryId: snacksCategory.id,
      code: 'BARRA-PRO',
      name: 'Barra proteica',
      stock: 6,
      minStock: 8,
      costPrice: new Prisma.Decimal(900),
      salePrice: new Prisma.Decimal(2000),
      supplier: 'Snack Fit',
      status: 'ACTIVE',
    },
  });

  const creatina = await prisma.product.upsert({
    where: { code: 'CREATINA-300' },
    update: {
      branchId: branch.id,
      categoryId: supplementsCategory.id,
      name: 'Creatina 300gr',
      stock: 2,
      minStock: 2,
      costPrice: new Prisma.Decimal(18000),
      salePrice: new Prisma.Decimal(25000),
      supplier: 'Nutri Lab',
      status: 'ACTIVE',
    },
    create: {
      branchId: branch.id,
      categoryId: supplementsCategory.id,
      code: 'CREATINA-300',
      name: 'Creatina 300gr',
      stock: 2,
      minStock: 2,
      costPrice: new Prisma.Decimal(18000),
      salePrice: new Prisma.Decimal(25000),
      supplier: 'Nutri Lab',
      status: 'ACTIVE',
    },
  });

  for (const product of [agua, barrita, creatina]) {
    const hasInitialStock = await prisma.stockMovement.findFirst({
      where: {
        productId: product.id,
        type: 'INITIAL',
      },
    });

    if (!hasInitialStock) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          branchId: branch.id,
          type: 'INITIAL',
          quantity: product.stock,
          previousStock: 0,
          newStock: product.stock,
          reason: 'Carga inicial seed',
          createdById: receptionistUser.id,
        },
      });
    }
  }

  const seedSale = await prisma.productSale.findFirst({
    where: {
      branchId: branch.id,
      notes: 'Venta seed de agua',
    },
  });

  if (!seedSale) {
    const sale = await prisma.productSale.create({
      data: {
        branchId: branch.id,
        clientId: juan.id,
        soldById: receptionistUser.id,
        subtotal: new Prisma.Decimal(1500),
        discountAmount: new Prisma.Decimal(0),
        surchargeAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(1500),
        notes: 'Venta seed de agua',
        items: {
          create: {
            productId: agua.id,
            quantity: 1,
            unitPrice: new Prisma.Decimal(1500),
            totalPrice: new Prisma.Decimal(1500),
          },
        },
      },
    });

    await prisma.product.update({
      where: { id: agua.id },
      data: { stock: 17 },
    });

    await prisma.stockMovement.create({
      data: {
        productId: agua.id,
        branchId: branch.id,
        saleId: sale.id,
        type: 'SALE',
        quantity: -1,
        previousStock: 18,
        newStock: 17,
        reason: 'Venta seed de agua',
        createdById: receptionistUser.id,
      },
    });

    const receivable = await prisma.receivable.create({
      data: {
        clientId: juan.id,
        branchId: branch.id,
        saleId: sale.id,
        type: 'PRODUCT_SALE',
        description: 'Venta interna seed de agua',
        originalAmount: new Prisma.Decimal(1500),
        discountAmount: new Prisma.Decimal(0),
        surchargeAmount: new Prisma.Decimal(0),
        balanceAmount: new Prisma.Decimal(0),
        dueDate: new Date(),
        status: 'PAID',
        settledAt: new Date(),
      },
    });

    const payment = await prisma.payment.create({
      data: {
        clientId: juan.id,
        branchId: branch.id,
        concept: 'Venta interna seed de agua',
        grossAmount: new Prisma.Decimal(1500),
        discountAmount: new Prisma.Decimal(0),
        surchargeAmount: new Prisma.Decimal(0),
        finalAmount: new Prisma.Decimal(1500),
        method: 'CASH',
        receiptNumber: 'REC-00000002',
        registeredById: receptionistUser.id,
        allocations: {
          create: {
            receivableId: receivable.id,
            amount: new Prisma.Decimal(1500),
          },
        },
      },
    });

    await prisma.cashMovement.create({
      data: {
        cashSessionId: openCashSession.id,
        branchId: branch.id,
        paymentId: payment.id,
        type: 'INCOME',
        amount: new Prisma.Decimal(1500),
        method: 'CASH',
        description: 'Venta interna seed de agua',
        createdById: receptionistUser.id,
      },
    });
  }

  const funcional = await prisma.activity.upsert({
    where: { code: 'FUNCIONAL' },
    update: {
      name: 'Funcional',
      capacity: 20,
      branchId: branch.id,
      isIncludedByDefault: true,
      status: 'ACTIVE',
    },
    create: {
      branchId: branch.id,
      code: 'FUNCIONAL',
      name: 'Funcional',
      description: 'Clase funcional general',
      capacity: 20,
      status: 'ACTIVE',
      requiresValidMembership: true,
      isIncludedByDefault: true,
    },
  });

  const yoga = await prisma.activity.upsert({
    where: { code: 'YOGA' },
    update: {
      name: 'Yoga',
      capacity: 12,
      branchId: branch.id,
      extraFee: new Prisma.Decimal(2500),
      status: 'ACTIVE',
    },
    create: {
      branchId: branch.id,
      code: 'YOGA',
      name: 'Yoga',
      description: 'Clase de movilidad y respiracion',
      capacity: 12,
      status: 'ACTIVE',
      requiresValidMembership: true,
      extraFee: new Prisma.Decimal(2500),
      isIncludedByDefault: false,
    },
  });

  await prisma.planActivityAccess.upsert({
    where: {
      planId_activityId: {
        planId: monthlyPlan.id,
        activityId: yoga.id,
      },
    },
    update: {},
    create: {
      planId: monthlyPlan.id,
      activityId: yoga.id,
    },
  });

  const funcionalStart = new Date();
  funcionalStart.setHours(18, 0, 0, 0);
  const funcionalEnd = new Date(funcionalStart);
  funcionalEnd.setHours(19, 0, 0, 0);

  const yogaStart = new Date();
  yogaStart.setDate(yogaStart.getDate() + 1);
  yogaStart.setHours(19, 0, 0, 0);
  const yogaEnd = new Date(yogaStart);
  yogaEnd.setHours(20, 0, 0, 0);

  let funcionalSchedule = await prisma.classSchedule.findFirst({
    where: {
      activityId: funcional.id,
      startsAt: funcionalStart,
    },
  });

  if (!funcionalSchedule) {
    funcionalSchedule = await prisma.classSchedule.create({
      data: {
        activityId: funcional.id,
        branchId: branch.id,
        instructorId: managerUser.id,
        startsAt: funcionalStart,
        endsAt: funcionalEnd,
        room: 'Sala 1',
      },
    });
  }

  let yogaSchedule = await prisma.classSchedule.findFirst({
    where: {
      activityId: yoga.id,
      startsAt: yogaStart,
    },
  });

  if (!yogaSchedule) {
    yogaSchedule = await prisma.classSchedule.create({
      data: {
        activityId: yoga.id,
        branchId: branch.id,
        instructorId: managerUser.id,
        startsAt: yogaStart,
        endsAt: yogaEnd,
        room: 'Sala 2',
      },
    });
  }

  const juanYogaEnrollment = await prisma.classEnrollment.findFirst({
    where: {
      clientId: juan.id,
      scheduleId: yogaSchedule.id,
    },
  });

  if (!juanYogaEnrollment) {
    const enrollment = await prisma.classEnrollment.create({
      data: {
        clientId: juan.id,
        scheduleId: yogaSchedule.id,
        notes: 'Inscripto desde seed',
      },
    });

    await prisma.receivable.create({
      data: {
        clientId: juan.id,
        branchId: branch.id,
        classEnrollmentId: enrollment.id,
        type: 'CLASS_ENROLLMENT',
        description: 'Extra de clase Yoga',
        originalAmount: new Prisma.Decimal(2500),
        discountAmount: new Prisma.Decimal(0),
        surchargeAmount: new Prisma.Decimal(0),
        balanceAmount: new Prisma.Decimal(2500),
        dueDate: yogaStart,
        status: 'OPEN',
      },
    });
  }

  const sofiaFuncionalEnrollment = await prisma.classEnrollment.findFirst({
    where: {
      clientId: sofia.id,
      scheduleId: funcionalSchedule.id,
    },
  });

  if (!sofiaFuncionalEnrollment) {
    await prisma.classEnrollment.create({
      data: {
        clientId: sofia.id,
        scheduleId: funcionalSchedule.id,
        status: 'ENROLLED',
        notes: 'Inscripta desde seed',
      },
    });
  }

  const membershipExpiringTemplate = await prisma.notificationTemplate.upsert({
    where: { code: 'membership-expiring-internal' },
    update: {
      name: 'Membresia por vencer',
      type: 'MEMBERSHIP_EXPIRING',
      channel: 'INTERNAL',
      bodyTemplate: 'La membresia de {{clientName}} vence el {{endsAt}}.',
    },
    create: {
      code: 'membership-expiring-internal',
      name: 'Membresia por vencer',
      type: 'MEMBERSHIP_EXPIRING',
      channel: 'INTERNAL',
      subjectTemplate: 'Membresia por vencer',
      bodyTemplate: 'La membresia de {{clientName}} vence el {{endsAt}}.',
    },
  });

  await prisma.notificationTemplate.upsert({
    where: { code: 'stock-low-internal' },
    update: {
      name: 'Stock bajo',
      type: 'STOCK_LOW',
      channel: 'INTERNAL',
      bodyTemplate: 'El producto {{productName}} quedo con stock {{stock}}.',
    },
    create: {
      code: 'stock-low-internal',
      name: 'Stock bajo',
      type: 'STOCK_LOW',
      channel: 'INTERNAL',
      subjectTemplate: 'Stock bajo',
      bodyTemplate: 'El producto {{productName}} quedo con stock {{stock}}.',
    },
  });

  const hasExpiringNotification = await prisma.notification.findFirst({
    where: {
      type: 'MEMBERSHIP_EXPIRING',
      clientId: juan.id,
    },
  });

  if (!hasExpiringNotification) {
    await prisma.notification.create({
      data: {
        branchId: branch.id,
        clientId: juan.id,
        templateId: membershipExpiringTemplate.id,
        type: 'MEMBERSHIP_EXPIRING',
        channel: 'INTERNAL',
        status: 'PENDING',
        title: 'Membresia por vencer: Juan Perez',
        body: 'La membresia de Juan Perez vence pronto.',
        context: {
          membershipId: activeMembership?.id,
        } as Prisma.InputJsonValue,
      },
    });
  }

  const hasStockNotification = await prisma.notification.findFirst({
    where: {
      type: 'STOCK_LOW',
      title: 'Stock bajo: Barra proteica',
    },
  });

  if (!hasStockNotification) {
    await prisma.notification.create({
      data: {
        branchId: branch.id,
        type: 'STOCK_LOW',
        channel: 'INTERNAL',
        status: 'PENDING',
        title: 'Stock bajo: Barra proteica',
        body: 'La barra proteica esta por debajo del minimo operativo.',
        context: {
          productId: barrita.id,
          stock: 6,
          minStock: 8,
        } as Prisma.InputJsonValue,
      },
    });
  }

  const hasAccessDeniedNotification = await prisma.notification.findFirst({
    where: {
      type: 'ACCESS_DENIED',
      clientId: flor.id,
    },
  });

  if (!hasAccessDeniedNotification) {
    await prisma.notification.create({
      data: {
        branchId: branch.id,
        clientId: flor.id,
        type: 'ACCESS_DENIED',
        channel: 'INTERNAL',
        status: 'SENT',
        title: 'Acceso denegado por mora',
        body: 'Florencia Lopez intento ingresar con deuda vencida.',
        sentAt: new Date(),
        context: {
          denialReason: 'DEBT_RESTRICTION',
        } as Prisma.InputJsonValue,
      },
    });
  }

  const branchDevice = await prisma.accessDevice.findUniqueOrThrow({
    where: { code: 'TORNIQ-CASA-01' },
  });

  const hasAllowedAccess = await prisma.accessLog.findFirst({
    where: {
      clientId: juan.id,
      result: 'ALLOWED',
    },
  });

  if (!hasAllowedAccess && activeMembership) {
    await prisma.accessLog.create({
      data: {
        clientId: juan.id,
        branchId: branch.id,
        deviceId: branchDevice.id,
        membershipId: activeMembership.id,
        method: 'RFID',
        result: 'ALLOWED',
        message: 'Ingreso seed permitido',
        openedSimulated: true,
      },
    });
  }

  const hasDeniedAccess = await prisma.accessLog.findFirst({
    where: {
      clientId: flor.id,
      result: 'DENIED',
    },
  });

  if (!hasDeniedAccess) {
    await prisma.accessLog.create({
      data: {
        clientId: flor.id,
        branchId: branch.id,
        deviceId: branchDevice.id,
        method: 'DNI',
        result: 'DENIED',
        denialReason: 'DEBT_RESTRICTION',
        message: 'Ingreso denegado por deuda vencida',
        openedSimulated: false,
      },
    });
  }

  await prisma.systemSetting.upsert({
    where: {
      group_key: {
        group: 'sequence',
        key: 'receipt_number',
      },
    },
    update: {
      value: { next: 3 },
    },
    create: {
      group: 'sequence',
      key: 'receipt_number',
      value: { next: 3 } as Prisma.InputJsonValue,
    },
  });
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
