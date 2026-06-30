# Spec 03 — Esquema de base de datos y seed (Drizzle + libSQL/SQLite)

## 1. Objetivo

Implementar la capa de persistencia del proyecto en `packages/db`: definir el esquema de las **3 tablas** (`flags`, `targeting_rules`, `audit_log`) con Drizzle ORM sobre SQLite/libSQL (archivo `.db` local), configurar `drizzle-kit` para migraciones, exponer un **helper de conexión reutilizable** que `apps/api` importará, escribir un `seed.ts` que cree la flag de ejemplo `checkout_v2` con sus reglas, y añadir un **test de integración** (Vitest) que lea y escriba una flag.

Al finalizar, las migraciones crean las tablas, `pnpm db:seed` inserta los datos de ejemplo y el test de integración pasa.

## 2. Contexto y dependencias

- **Specs previas requeridas:**
  - **Spec 01 (monorepo-setup):** existe `packages/db` como workspace `@ff/db` (`type: "module"`, `tsconfig.json` que extiende `../../tsconfig.base.json`, `src/index.ts`). Existe `apps/api` (`@ff/api`) que en el futuro importará el helper de conexión. Node 20+, pnpm 9+, sin Turborepo.
  - **Spec 02 (testing-setup):** Vitest está instalado y configurado; la convención de tests es `src/**/*.test.ts`; existen scripts `test`/`test:watch`. Esta spec añade un test en `packages/db`, por lo que `packages/db` debe tener (o se le añade aquí) su `vitest.config.ts` con `include: ["src/**/*.{test,spec}.ts"]` y `environment: "node"`, más los scripts `test`/`test:watch`.
- **Motor de datos:** SQLite local a través del cliente **libSQL** (`@libsql/client`), accedido mediante **Drizzle ORM** (`drizzle-orm`) y **`drizzle-kit`** para generar/aplicar migraciones. El archivo de base de datos es local (p. ej. `packages/db/local.db`).
- **Nombre del paquete:** `@ff/db` (scope `@ff/*`). `apps/api` lo consumirá como `"@ff/db": "workspace:*"`.

### Contratos de datos canónicos (fuente de verdad para esta spec)

Convenciones: **booleanos como `integer` 0/1**; **timestamps en milisegundos epoch o ISO** (usar un criterio consistente; se recomienda ms epoch como `integer`, ver Notas técnicas). IDs como `text` con UUID.

**Tabla `flags`:**

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | text | PK, UUID |
| `key` | text | UNIQUE, alfanumérico + guion bajo |
| `name` | text | NOT NULL |
| `description` | text | |
| `type` | text | enum: `release` |
| `status` | text | enum: `draft` \| `active` \| `deprecated` \| `archived` |
| `default_value` | integer | boolean (0/1) |
| `fail_mode` | text | enum: `fail_closed` \| `fail_open` |
| `created_at` | integer/text | timestamp |
| `updated_at` | integer/text | timestamp |

**Tabla `targeting_rules`:**

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | text | PK |
| `flag_id` | text | FK → `flags.id` |
| `type` | text | enum: `environment` \| `company` \| `percentage` |
| `environment` | text | nullable, enum: `development` \| `staging` \| `production` |
| `company_id` | text | nullable |
| `percentage` | integer | nullable, 0–100 |
| `value` | integer | boolean (0/1) |
| `priority` | integer | |
| `created_at` | integer/text | timestamp |

**Tabla `audit_log` (append-only):**

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | text | PK |
| `entity_type` | text | `flag` \| `rule` |
| `entity_id` | text | |
| `action` | text | `create` \| `update` \| `archive` \| `delete` |
| `field` | text | nullable |
| `old_value` | text | nullable |
| `new_value` | text | nullable |
| `timestamp` | integer/text | timestamp |

## 3. Alcance

### In scope
- Dependencias en `packages/db`: `drizzle-orm`, `@libsql/client`, y devDependency `drizzle-kit`.
- `packages/db/src/schema.ts`: definición de las 3 tablas con Drizzle (`sqliteTable`), incluyendo enums vía `text(...).$type<...>()`, FK de `targeting_rules.flag_id` → `flags.id`, y restricción UNIQUE en `flags.key`.
- `packages/db/drizzle.config.ts`: configuración de `drizzle-kit` (dialect SQLite/libSQL, ruta del schema, carpeta de migraciones, URL del archivo `.db`).
- `packages/db/src/client.ts`: helper de conexión reutilizable que crea el cliente libSQL y el objeto Drizzle (`db`), reexportado para `apps/api`.
- Migraciones generadas en `packages/db/drizzle/` y mecanismo para aplicarlas.
- `packages/db/src/seed.ts`: inserta la flag `checkout_v2` (default_value false, status draft) con 3 reglas de ejemplo.
- Scripts en `packages/db/package.json`: `db:generate`, `db:migrate`, `db:seed`.
- Test de integración en `packages/db/src/db.test.ts` que escribe y lee una flag.

### Out of scope
- Endpoints HTTP / API (spec 04).
- Lógica del evaluador (spec 09).
- UI (specs 06+).
- Autenticación (spec 05).

## 4. Tareas en orden

1. **Instalar dependencias en `packages/db`:**
   ```bash
   pnpm --filter @ff/db add drizzle-orm @libsql/client
   pnpm --filter @ff/db add -D drizzle-kit
   ```
2. **Definir el esquema** en `packages/db/src/schema.ts` con los contratos canónicos:
   ```ts
   import { sql } from "drizzle-orm";
   import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

   export type FlagType = "release";
   export type FlagStatus = "draft" | "active" | "deprecated" | "archived";
   export type FailMode = "fail_closed" | "fail_open";
   export type RuleType = "environment" | "company" | "percentage";
   export type Environment = "development" | "staging" | "production";

   export const flags = sqliteTable(
     "flags",
     {
       id: text("id").primaryKey(),
       key: text("key").notNull().unique(),
       name: text("name").notNull(),
       description: text("description"),
       type: text("type").$type<FlagType>().notNull().default("release"),
       status: text("status").$type<FlagStatus>().notNull().default("draft"),
       defaultValue: integer("default_value").notNull().default(0),
       failMode: text("fail_mode").$type<FailMode>().notNull().default("fail_closed"),
       createdAt: integer("created_at").notNull().default(sql`(unixepoch() * 1000)`),
       updatedAt: integer("updated_at").notNull().default(sql`(unixepoch() * 1000)`),
     },
     (t) => ({ keyIdx: uniqueIndex("flags_key_idx").on(t.key) }),
   );

   export const targetingRules = sqliteTable("targeting_rules", {
     id: text("id").primaryKey(),
     flagId: text("flag_id")
       .notNull()
       .references(() => flags.id),
     type: text("type").$type<RuleType>().notNull(),
     environment: text("environment").$type<Environment>(),
     companyId: text("company_id"),
     percentage: integer("percentage"),
     value: integer("value").notNull(),
     priority: integer("priority").notNull().default(0),
     createdAt: integer("created_at").notNull().default(sql`(unixepoch() * 1000)`),
   });

   export const auditLog = sqliteTable("audit_log", {
     id: text("id").primaryKey(),
     entityType: text("entity_type").$type<"flag" | "rule">().notNull(),
     entityId: text("entity_id").notNull(),
     action: text("action").$type<"create" | "update" | "archive" | "delete">().notNull(),
     field: text("field"),
     oldValue: text("old_value"),
     newValue: text("new_value"),
     timestamp: integer("timestamp").notNull().default(sql`(unixepoch() * 1000)`),
   });
   ```
   - Reexportar el schema desde `packages/db/src/index.ts`.
3. **Crear el helper de conexión** en `packages/db/src/client.ts`:
   ```ts
   import { createClient } from "@libsql/client";
   import { drizzle } from "drizzle-orm/libsql";
   import * as schema from "./schema";

   const url = process.env.DATABASE_URL ?? "file:./local.db";

   export const libsql = createClient({ url });
   export const db = drizzle(libsql, { schema });
   export type DB = typeof db;
   export { schema };
   ```
   - Reexportar `db`, `schema` (y tipos) desde `packages/db/src/index.ts` para que `apps/api` haga `import { db, schema } from "@ff/db"`.
4. **Configurar drizzle-kit** en `packages/db/drizzle.config.ts`:
   ```ts
   import { defineConfig } from "drizzle-kit";

   export default defineConfig({
     dialect: "sqlite",
     driver: "libsql",
     schema: "./src/schema.ts",
     out: "./drizzle",
     dbCredentials: { url: process.env.DATABASE_URL ?? "file:./local.db" },
   });
   ```
5. **Añadir scripts** en `packages/db/package.json`:
   ```json
   {
     "scripts": {
       "db:generate": "drizzle-kit generate",
       "db:migrate": "drizzle-kit migrate",
       "db:seed": "tsx src/seed.ts",
       "test": "vitest run",
       "test:watch": "vitest"
     }
   }
   ```
   - Añadir `tsx` como devDependency si no está disponible (`pnpm --filter @ff/db add -D tsx`).
6. **Generar y aplicar la migración inicial:**
   ```bash
   pnpm --filter @ff/db db:generate
   pnpm --filter @ff/db db:migrate
   ```
   Esto crea archivos SQL en `packages/db/drizzle/` y materializa las 3 tablas en `local.db`.
7. **Escribir el seed** en `packages/db/src/seed.ts`:
   - Usar `crypto.randomUUID()` para los IDs.
   - Insertar la flag `checkout_v2`: `default_value = 0` (false), `status = "draft"`, `type = "release"`, `fail_mode = "fail_closed"`, `name = "Checkout v2"`, `description` descriptiva.
   - Insertar 3 reglas asociadas a esa flag:
     1. `type = "environment"`, `environment = "staging"`, `value = 1`, `priority = 1`.
     2. `type = "company"`, `company_id = "acme"`, `value = 1`, `priority = 2`.
     3. `type = "percentage"`, `percentage = 50`, `value = 1`, `priority = 3`.
   - El seed debe ser **idempotente** o al menos seguro de re-ejecutar (p. ej. borrar/insertar `checkout_v2` por `key`, o comprobar existencia antes de insertar).
   ```ts
   import { db, schema } from "./client";
   import { eq } from "drizzle-orm";

   async function seed() {
     const existing = await db.query.flags.findFirst({
       where: eq(schema.flags.key, "checkout_v2"),
     });
     if (existing) {
       // limpiar reglas y flag previas para idempotencia
       await db.delete(schema.targetingRules).where(eq(schema.targetingRules.flagId, existing.id));
       await db.delete(schema.flags).where(eq(schema.flags.id, existing.id));
     }

     const flagId = crypto.randomUUID();
     await db.insert(schema.flags).values({
       id: flagId,
       key: "checkout_v2",
       name: "Checkout v2",
       description: "Nuevo flujo de checkout (ejemplo de seed)",
       type: "release",
       status: "draft",
       defaultValue: 0,
       failMode: "fail_closed",
     });

     await db.insert(schema.targetingRules).values([
       { id: crypto.randomUUID(), flagId, type: "environment", environment: "staging", value: 1, priority: 1 },
       { id: crypto.randomUUID(), flagId, type: "company", companyId: "acme", value: 1, priority: 2 },
       { id: crypto.randomUUID(), flagId, type: "percentage", percentage: 50, value: 1, priority: 3 },
     ]);

     console.log("Seed completado: checkout_v2 + 3 reglas");
   }

   seed().then(() => process.exit(0)).catch((e) => {
     console.error(e);
     process.exit(1);
   });
   ```
8. **Escribir el test de integración** en `packages/db/src/db.test.ts`:
   - Usar una base de datos efímera (`file::memory:?cache=shared` o `:memory:` vía libSQL, o un archivo temporal) para no contaminar `local.db`.
   - Crear las tablas en el setup (aplicando el SQL de migración o usando `drizzle-orm/libsql/migrator`) y luego escribir y leer una flag.
   ```ts
   import { afterAll, beforeAll, describe, expect, it } from "vitest";
   import { createClient } from "@libsql/client";
   import { drizzle } from "drizzle-orm/libsql";
   import { migrate } from "drizzle-orm/libsql/migrator";
   import { eq } from "drizzle-orm";
   import * as schema from "./schema";

   const client = createClient({ url: "file::memory:?cache=shared" });
   const db = drizzle(client, { schema });

   beforeAll(async () => {
     await migrate(db, { migrationsFolder: "./drizzle" });
   });
   afterAll(() => client.close());

   describe("db: flags", () => {
     it("escribe y lee una flag", async () => {
       const id = crypto.randomUUID();
       await db.insert(schema.flags).values({
         id,
         key: "test_flag",
         name: "Test Flag",
         type: "release",
         status: "draft",
         defaultValue: 0,
         failMode: "fail_closed",
       });
       const found = await db.query.flags.findFirst({ where: eq(schema.flags.key, "test_flag") });
       expect(found?.key).toBe("test_flag");
       expect(found?.defaultValue).toBe(0);
     });
   });
   ```
9. **Verificar:** ejecutar las migraciones, el seed y los tests (ver criterios de aceptación).

## 5. Criterios de aceptación verificables

1. **Migración crea tablas:** tras `pnpm --filter @ff/db db:generate` y `pnpm --filter @ff/db db:migrate`, inspeccionar `local.db` confirma las 3 tablas:
   ```bash
   sqlite3 packages/db/local.db ".tables"
   # => audit_log  flags  targeting_rules
   ```
   y `sqlite3 packages/db/local.db ".schema flags"` muestra `key` con índice UNIQUE y `default_value`/`fail_mode` presentes.
2. **Seed inserta datos:** ejecutar `pnpm --filter @ff/db db:seed` termina con código `0` e imprime confirmación. Verificación:
   ```bash
   sqlite3 packages/db/local.db "SELECT key, status, default_value FROM flags WHERE key='checkout_v2';"
   # => checkout_v2|draft|0
   sqlite3 packages/db/local.db "SELECT type, environment, company_id, percentage, value FROM targeting_rules ORDER BY priority;"
   # => environment|staging|||1
   #    company||acme||1
   #    percentage|||50|1
   ```
3. **Seed idempotente:** ejecutar `db:seed` dos veces seguidas no falla por violación de UNIQUE y deja exactamente 1 flag `checkout_v2` con 3 reglas.
4. **Test de integración verde:** ejecutar `pnpm --filter @ff/db test` ejecuta `db.test.ts`, reporta `1 passed` (escritura+lectura de flag) y sale con código `0`.
5. **Helper de conexión reutilizable:** existe `packages/db/src/client.ts` que exporta `db` y `schema`, y están reexportados desde `packages/db/src/index.ts`. Un import `import { db, schema } from "@ff/db"` resuelve (verificable porque la spec 04 lo usará y porque `pnpm --filter @ff/db build` compila sin errores de tipos).
6. **Booleanos como integer:** las columnas `default_value` y `value` son `integer` y almacenan 0/1 (verificable en el `.schema` y en las consultas anteriores).

## 6. Notas técnicas

- **Convención de timestamps:** se usa `integer` con milisegundos epoch (`unixepoch() * 1000`) por defecto a nivel de DB. Es consistente y comparable numéricamente. Si una spec posterior prefiere ISO, debe convertir en la capa de aplicación; el esquema canónico aquí es ms epoch.
- **Booleanos:** SQLite no tiene tipo boolean nativo; se almacenan como `integer` 0/1. Al exponerlos por API (spec 04) se mapearán a `true`/`false`.
- **FK enforcement:** SQLite no aplica claves foráneas por defecto. Si se requiere enforcement, ejecutar `PRAGMA foreign_keys = ON;` por conexión. Para el MVP la FK queda declarada en el schema; el enforcement estricto es opcional.
- **Ruta del `.db`:** por defecto `file:./local.db` relativo al cwd de `packages/db`. Configurable con `DATABASE_URL`. `apps/api` debe apuntar a la misma URL para ver los mismos datos (importante para la propagación < 60 s del PRD: la API lee la DB en cada evaluación, sin caché propio en este MVP).
- **Migraciones en tests:** el test usa una DB en memoria y aplica las migraciones con `drizzle-orm/libsql/migrator` desde `./drizzle`. Esto exige que las migraciones existan antes de correr los tests; documenta que el orden es `db:generate` → `db:migrate` → `test`. Alternativa válida: usar `drizzle-kit push` contra la DB en memoria, o crear tablas con SQL inline en el setup del test.
- **Drizzle query API:** `db.query.flags.findFirst` requiere pasar `{ schema }` al inicializar `drizzle(...)`, ya contemplado en el helper.
- **IDs:** `crypto.randomUUID()` (Node 20+ lo expone globalmente). No hace falta dependencia extra.
- **Reexports:** mantener `packages/db/src/index.ts` como punto de entrada público (`export * from "./schema"; export * from "./client";`) para que `@ff/db` ofrezca una API estable a `apps/api`.
