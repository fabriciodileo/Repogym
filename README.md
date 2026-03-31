# GYM Control Pro

Base full stack para gestion integral de gimnasio con backend modular, frontend administrativo en Next.js y modelo de datos preparado para operacion real y crecimiento a produccion.

## Incluye en esta base

- API REST en Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- JWT con refresh token rotativo
- Roles iniciales: administrador, gerente, recepcionista, cobranzas
- Clientes, planes, membresias, pagos y control de acceso
- Dashboard administrativo moderno en Next.js App Router + Tailwind CSS
- BFF liviano en Next.js para resguardar tokens en cookies httpOnly
- Auditoria base, sucursales y configuracion general
- Seed inicial con usuarios, sucursal, planes y clientes de prueba

## Estructura

```text
apps/
  api/
  web/
docs/
```

## Requisitos

- Node.js 24+
- PostgreSQL 15+
- npm 11+

## Instalacion

1. Copiar `apps/api/.env.example` a `apps/api/.env`
2. Copiar `apps/web/.env.example` a `apps/web/.env.local`
3. Crear la base PostgreSQL definida en `DATABASE_URL`
4. Instalar dependencias:
   - `npm install`
5. Generar Prisma Client:
   - `npm run prisma:generate`
6. Ejecutar migraciones:
   - `npm run prisma:migrate`
7. Cargar datos iniciales:
   - `npm run prisma:seed`
8. Levantar frontend y backend:
   - `npm run dev`

## Credenciales iniciales

- Admin: `admin@gym.local` / `Admin1234!`
- Gerencia: `gerencia@gym.local` / `Manager1234!`
- Recepcion: `recepcion@gym.local` / `Recepcion1234!`

## Endpoints principales del backend

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `GET /api/v1/clients`
- `GET /api/v1/plans`
- `GET /api/v1/memberships`
- `GET /api/v1/payments`
- `GET /api/v1/access-control/logs`
- `POST /api/v1/access-control/validate`
- `GET /api/v1/dashboard/overview`

## Alcance de esta entrega

### Implementado
- arquitectura de monorepo
- schema Prisma amplio
- auth y usuarios internos
- clientes
- planes
- membresias
- pagos con asignacion a deudas
- control de acceso desacoplado con gateway simulado
- dashboard
- auditoria basica
- frontend administrativo para operacion inicial

### Preparado para fase siguiente
- gastos
- caja diaria
- finanzas avanzadas
- reportes exportables
- productos y stock
- agenda y clases
- notificaciones multi canal
- integracion con hardware real

## Notas de arquitectura

- La deuda no se modela solo con pagos; se usa `Receivable` + `PaymentAllocation`.
- El acceso fisico queda desacoplado por `AccessGateway` y `AccessDevice`.
- El frontend usa cookies httpOnly del dominio web y un proxy interno para no exponer tokens al navegador.
- Lo fisico se simula por software en esta fase; no se implementa apertura real de molinete o barrera.

## Siguiente paso recomendado

1. Instalar dependencias y validar compilacion.
2. Crear la primera migracion Prisma real.
3. Ajustar branding, sucursal y politicas del negocio desde configuracion.
4. Continuar con caja, gastos, reportes y stock.
