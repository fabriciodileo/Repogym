# Release de Base de Datos

## Objetivo

Esta guia deja el flujo operativo de Prisma alineado con el estado real del proyecto y evita improvisaciones al mover cambios de esquema entre desarrollo, staging y produccion.

## Artefactos que se deben versionar

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/`
- `apps/api/prisma/seed.ts` cuando cambie data base operativa
- `apps/api/.env.example` si aparecen nuevas variables publicas de configuracion

## Estado actual validado

- Base local PostgreSQL: `gym_control_pro`
- Migracion presente y validada: `20260401030410_init`
- Estado verificado con Prisma: schema en sincronizacion
- Seed operativo ejecutado correctamente sobre la base local

## Comandos base

Desde la raiz del monorepo:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Desde `apps/api`:

```bash
npx prisma migrate status
npx prisma migrate deploy
```

## Flujo recomendado para cambios de esquema

1. Actualizar `apps/api/prisma/schema.prisma`.
2. Asegurar que `apps/api/.env` apunte a una base local de desarrollo.
3. Generar cliente:

```bash
npm run prisma:generate
```

4. Crear o actualizar la migracion en desarrollo:

```bash
npm run prisma:migrate
```

5. Revisar el SQL generado en `apps/api/prisma/migrations/<timestamp>_<name>/migration.sql`.
6. Probar la aplicacion con:

```bash
npm run build -w @gym/api
npm run build -w @gym/web
```

7. Si corresponde, adaptar `apps/api/prisma/seed.ts`.
8. Versionar juntos:
- `schema.prisma`
- carpeta `migrations`
- `seed.ts` si tuvo cambios
- documentacion asociada

## Flujo recomendado para staging o produccion

1. Hacer backup de la base antes de aplicar cambios.
2. Desplegar el codigo que contiene `schema.prisma` y la carpeta `migrations`.
3. Ejecutar en el entorno destino:

```bash
cd apps/api
npx prisma migrate deploy
```

4. Validar estado:

```bash
npx prisma migrate status
```

5. Ejecutar seed solo si el ambiente esta preparado para recibir datos base operativos:

```bash
npm run prisma:seed -w @gym/api
```

## Seed y criterio operativo

- El seed actual esta pensado para desarrollo, demo operativa y ambientes internos.
- Crea o actualiza catalogos base, usuarios internos, sucursal central, clientes de ejemplo, caja, gastos, productos, stock, clases y notificaciones.
- En produccion conviene ejecutarlo solo una vez o dividirlo luego en seeds mas especificos por contexto.

## Verificaciones posteriores a la migracion

- login con usuarios internos iniciales
- dashboard cargando KPIs
- clientes y membresias visibles
- pagos y deuda consistentes
- caja abierta o historial disponible
- productos con stock visible
- clases con horarios e inscripciones
- notificaciones listadas

## Rollback

Prisma no genera down migrations automaticas en este flujo. Si una release falla:

1. detener el despliegue
2. evaluar si alcanza con una migracion correctiva
3. si el problema compromete datos, restaurar desde backup
4. generar una nueva migracion explicita en lugar de editar una ya aplicada

## Recomendacion de pipeline

- `npm run prisma:generate`
- `npm run build -w @gym/api`
- `npm run build -w @gym/web`
- `cd apps/api && npx prisma migrate deploy`

## Nota importante

La carpeta `apps/api/prisma/migrations` debe quedar versionada en git. El estado actual del repo muestra la carpeta creada en disco; falta incluirla en el control de versiones para que el deploy sea reproducible.
