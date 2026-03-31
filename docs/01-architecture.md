# Plataforma Integral de Gestion para Gimnasio

## 1. Analisis funcional y resumen de requerimientos

El sistema debe cubrir la operacion diaria real de un gimnasio con foco en administracion, cobranza y control de acceso. El dominio se divide en cuatro ejes centrales:

1. Operacion comercial
- clientes
- planes y membresias
- cobros, descuentos, mora y deudas
- venta interna de productos y actividades

2. Operacion presencial
- validacion de acceso por RFID, QR, DNI o numero de socio
- reglas por sucursal, horario, mora y limite de accesos
- historial de intentos permitidos y denegados
- preparacion para hardware real

3. Operacion financiera
- ingresos
- gastos
- caja diaria
- conciliacion basica
- reportes financieros y operativos

4. Gobierno del sistema
- autenticacion y autorizacion
- usuarios internos
- auditoria
- configuracion del negocio
- notificaciones internas y preparacion para canales externos

## 2. Funcionalidades faltantes detectadas y agregadas

Para que la base sea realmente util en un gimnasio y no un CRUD superficial, agrego estos componentes de dominio:

### 2.1 Motor de cuentas a cobrar
Los pagos parciales, deudas y mora no deberian modelarse solo con una tabla de pagos. Se agrega `Receivable` y `PaymentAllocation` para registrar:
- cargos emitidos por membresias, productos, clases o ajustes manuales
- saldo pendiente real
- vencimiento
- estado abierto, parcial, pagado o vencido
- aplicacion de un pago a una o varias deudas

### 2.2 Credenciales de acceso desacopladas
Se agrega `AccessCredential` para no atar el control de acceso al DNI. Esto permite emitir y revocar:
- tarjetas RFID
- tokens QR
- tarjetas externas

### 2.3 Incidencias e historial operativo del cliente
Se agrega `ClientIncident` para registrar incidentes, observaciones administrativas, bloqueos y seguimientos internos.

### 2.4 Rotacion de refresh tokens
Se agrega `RefreshToken` persistido y revocable para una sesion mas segura y auditable.

### 2.5 Reglas horarias por plan
Se agrega `PlanTimeRule` para controlar accesos por dia y franja horaria sin dejarlo como texto libre.

### 2.6 Base de sesiones de caja y movimientos
Se modelan `CashSession` y `CashMovement` para caja diaria con diferencias y trazabilidad.

### 2.7 Preparacion real para integraciones futuras
Se deja una interfaz de gateway para integraciones de acceso con modo `SIMULATED`, `HTTP`, `SERIAL` y `TCP`.

## 3. Arquitectura recomendada

## 3.1 Vista general
Se propone un monorepo con dos aplicaciones principales:

- `apps/api`: API REST en Node.js + Express + TypeScript + Prisma + PostgreSQL
- `apps/web`: panel administrativo en Next.js App Router + TypeScript + Tailwind CSS

### Decisiones tecnicas clave
- **Monorepo simple con workspaces**: facilita evolucion coordinada entre frontend y backend.
- **Express en backend**: permite una API REST clara, facil de mantener y compatible con integraciones futuras de hardware o servicios intermedios.
- **Prisma + PostgreSQL**: buen balance entre productividad, tipado y robustez relacional.
- **JWT access token + refresh token rotativo**: equilibrio entre seguridad y experiencia operativa.
- **BFF liviano en Next.js**: el frontend usa route handlers para guardar tokens en cookies httpOnly del dominio web y evitar exponerlos al navegador.
- **Arquitectura modular por dominio**: cada modulo tiene rutas, controller, service, repository y validaciones.
- **Servicios de dominio antes que logica en controladores**: evita acoplamiento y facilita pruebas.
- **Audit logging transversal**: acciones sensibles no quedan dispersas.

## 3.2 Capas del backend

1. `routes`
- montaje de rutas por modulo y versionado

2. `controller`
- adaptacion HTTP
- parseo de request validado
- delegacion a services

3. `service`
- reglas de negocio
- coordinacion transaccional
- emision de eventos internos y auditoria

4. `repository`
- consultas Prisma encapsuladas
- acceso a datos desacoplado de la capa HTTP

5. `core`
- errores
- middlewares
- auth
- validaciones
- rate limiting
- logging

## 3.3 Arquitectura del frontend

- App Router con layout autenticado
- `middleware.ts` para proteger secciones privadas
- componentes reutilizables de UI y de negocio
- formularios con `react-hook-form` + `zod`
- tabla reusable con estados de carga y vacio
- cliente HTTP centralizado
- BFF/proxy para hablar con la API y refrescar sesion

## 4. Modelo de dominio

### Entidades principales del MVP real
- `User`
- `Role`
- `Permission`
- `RefreshToken`
- `Branch`
- `BranchOperatingHour`
- `SystemSetting`
- `Client`
- `ClientIncident`
- `AccessCredential`
- `MembershipPlan`
- `PlanBranch`
- `PlanTimeRule`
- `ClientMembership`
- `Receivable`
- `Payment`
- `PaymentAllocation`
- `AccessDevice`
- `AccessLog`
- `AuditLog`

### Entidades ya preparadas para la siguiente fase
- `ExpenseCategory`
- `Expense`
- `CashSession`
- `CashMovement`
- `NotificationTemplate`
- `Notification`
- `ProductCategory`
- `Product`
- `StockMovement`
- `ProductSale`
- `ProductSaleItem`
- `Activity`
- `ClassSchedule`
- `ClassEnrollment`
- `PlanActivityAccess`

## 5. Reglas de negocio clave

### Acceso
Un acceso solo se aprueba si:
- el cliente existe
- esta activo
- no tiene bloqueo administrativo
- posee membresia vigente
- la sucursal esta habilitada para ese plan
- el horario cumple las reglas del plan
- no esta bloqueado por mora segun configuracion
- no agoto los accesos si el plan tiene limite

### Cobranzas
- un pago puede cancelar una o varias cuentas a cobrar
- una deuda puede pagarse parcialmente
- anular un pago reabre los saldos asociados
- la mora se calcula sobre cuentas vencidas abiertas o parciales

### Membresias
- el alta de membresia genera un cargo inicial en cuentas a cobrar
- la renovacion genera nueva membresia enlazada con la anterior
- congelar o pausar requiere motivo
- el limite de accesos se snapshottea en la membresia para no depender de cambios futuros del plan

## 6. Esquema de base de datos

El esquema inicial queda implementado en `apps/api/prisma/schema.prisma` y contempla:
- claves foraneas explicitas
- indices por busqueda frecuente
- restricciones de unicidad
- soft delete por `deletedAt` cuando corresponde
- timestamps `createdAt` y `updatedAt`
- enums para estados operativos
- soporte multi sucursal desde el inicio

## 7. Estructura de carpetas propuesta

```text
.
|-- apps
|   |-- api
|   |   |-- prisma
|   |   |   |-- schema.prisma
|   |   |   `-- seed.ts
|   |   `-- src
|   |       |-- app.ts
|   |       |-- server.ts
|   |       |-- config
|   |       |-- core
|   |       |-- lib
|   |       |-- modules
|   |       |   |-- auth
|   |       |   |-- users
|   |       |   |-- branches
|   |       |   |-- settings
|   |       |   |-- clients
|   |       |   |-- plans
|   |       |   |-- memberships
|   |       |   |-- payments
|   |       |   |-- access-control
|   |       |   |-- dashboard
|   |       |   `-- audit
|   |       `-- routes
|   `-- web
|       `-- src
|           |-- app
|           |   |-- (auth)
|           |   |-- (dashboard)
|           |   `-- api
|           |-- components
|           |-- lib
|           `-- middleware.ts
|-- docs
|   `-- 01-architecture.md
|-- package.json
`-- tsconfig.base.json
```

## 8. Modulos prioritarios del MVP real

### Backend prioritario
1. auth
2. users
3. branches
4. settings
5. clients
6. plans
7. memberships
8. payments
9. access-control
10. dashboard
11. audit

### Frontend prioritario
1. login
2. layout administrativo
3. dashboard operativo
4. clientes
5. planes
6. membresias
7. pagos
8. accesos
9. usuarios internos basicos
10. configuracion basica

## 9. Roadmap de implementacion

### Fase 1
- arquitectura
- dominio
- esquema Prisma
- estructura de carpetas

### Fase 2
- backend base y modulos core
- autenticacion JWT + refresh
- RBAC
- clientes, planes, membresias, pagos, acceso

### Fase 3
- frontend admin y BFF
- dashboard
- CRUDs operativos del MVP

### Fase 4
- gastos, caja, finanzas, reportes, productos, clases, notificaciones, auditoria extendida

### Fase 5
- seeds completos
- documentacion operativa
- despliegue
- integraciones externas

## 10. Criterio del MVP entregado en esta base

El MVP de esta base no sera una demo visual. Va a quedar preparado para operar:
- alta y administracion de clientes
- configuracion de planes
- asignacion de membresias
- registro de deudas y pagos
- validacion de acceso con respuesta desacoplada para hardware
- sesion interna con roles
- tablero inicial de operacion

Lo que quede simulado se indicara explicitamente, sobre todo la apertura fisica de barrera o molinete.
