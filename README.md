# GYM Control Pro

Base full stack para gestion integral de gimnasio con backend modular, frontend administrativo en Next.js y modelo de datos preparado para operacion real y crecimiento a produccion.

## Incluye en esta base

- API REST en Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- JWT con refresh token rotativo
- Roles iniciales: administrador, gerente, recepcionista, cobranzas
- Clientes, planes, membresias, pagos y control de acceso
- Gastos, caja, finanzas y reportes CSV
- Productos, stock y venta interna
- Clases, inscripciones y asistencia
- Notificaciones internas con provider simulado
- Dashboard administrativo moderno en Next.js App Router + Tailwind CSS
- BFF liviano en Next.js para resguardar tokens en cookies httpOnly
- Auditoria base, sucursales y configuracion general
- Seed ampliado con usuarios, sucursal, clientes, gastos, caja, productos, stock, clases y notificaciones

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
- Cobranzas: `cobranzas@gym.local` / `Cobranzas1234!`

## Endpoints principales del backend

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `GET /api/v1/clients`
- `GET /api/v1/plans`
- `GET /api/v1/memberships`
- `GET /api/v1/payments`
- `GET /api/v1/expenses`
- `GET /api/v1/cash-register/status`
- `GET /api/v1/finance/summary`
- `GET /api/v1/reports/:report`
- `GET /api/v1/products`
- `GET /api/v1/classes/schedules`
- `GET /api/v1/notifications`
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
- gastos operativos
- caja diaria y movimientos manuales
- resumen financiero y comparativas
- reportes exportables CSV
- productos, stock y venta interna
- actividades, horarios, inscripciones y asistencia
- notificaciones internas y sincronizacion de alertas

### Preparado o simulado
- provider externo de email / WhatsApp / SMS: simulado por provider interno con logs
- exportacion PDF: no implementada aun, CSV listo
- integracion fisica real de molinete / barrera: se mantiene simulada
- job scheduler real para alertas periodicas: reemplazable luego por cron o cola

## Notas de arquitectura

- La deuda no se modela solo con pagos; se usa `Receivable` + `PaymentAllocation`.
- El acceso fisico queda desacoplado por `AccessGateway` y `AccessDevice`.
- El frontend usa cookies httpOnly del dominio web y un proxy interno para no exponer tokens al navegador.
- Lo fisico se simula por software en esta fase; no se implementa apertura real de molinete o barrera.
- Las alertas internas usan `Notification` + `NotificationTemplate` y un provider simulado desacoplado.
- Caja, gastos, pagos en efectivo y ventas internas impactan sobre `CashSession` y `CashMovement`.
- Stock y venta interna se apoyan en `Product`, `StockMovement`, `ProductSale` y `Receivable`.

## Flujos operativos agregados

### Caja
- Abrir caja por sucursal
- Registrar ingresos y egresos manuales
- Impactar pagos en efectivo y gastos en la caja abierta
- Cerrar caja con saldo esperado, contado y diferencia

### Stock
- Alta de productos y categorias
- Registro de movimientos de stock
- Venta interna con impacto de stock y caja
- Alertas de stock bajo

### Clases
- Alta de actividades
- Alta de horarios
- Inscripcion de clientes con validacion de membresia
- Cancelacion de clase o inscripcion
- Registro de asistencia

### Notificaciones
- Sincronizacion manual de alertas operativas
- Procesamiento de pendientes por provider simulado
- Alertas por vencimiento, mora, stock bajo, acceso denegado y clases

## Migracion y seed

1. Configurar `apps/api/.env` con `DATABASE_URL`
2. Ejecutar `npm run prisma:generate`
3. Ejecutar `npm run prisma:migrate`
4. Ejecutar `npm run prisma:seed`
5. Levantar la plataforma con `npm run dev`

## Siguiente paso recomendado

1. Crear la migracion Prisma real contra PostgreSQL.
2. Correr el seed ampliado y validar los nuevos tableros.
3. Integrar un scheduler real para notificaciones periodicas.
4. Avanzar con proveedor real de email / WhatsApp y exportacion PDF.
