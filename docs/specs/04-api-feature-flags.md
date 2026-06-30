# Spec 04 — API de Feature Flags (CRUD + Audit Log)

## 1. Objetivo

Implementar la API REST de gestión de feature flags y reglas de targeting en `apps/api` (Hono), más la lectura del audit log. Esta API cubre el **CRUD de flags**, el **CRUD de reglas de targeting** y la **lectura del audit log**, registrando una entrada de auditoría en cada mutación.

**No** incluye evaluación de flags (`/evaluate`, `/evaluate-batch` → spec 09) ni autenticación/middleware (spec 05). En esta iteración los endpoints quedan sin protección; la spec 05 añadirá el middleware de auth por encima.

Cubre: **RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-22**.

---

## 2. Contexto y dependencias

### Specs previas requeridas (deben estar implementadas)

- **Spec 01 (monorepo-setup):** monorepo pnpm workspaces (sin Turborepo) con `apps/api`, `packages/db`, `packages/domain`, TypeScript y tsconfig base. `apps/api` ya levanta un servidor Hono con `GET /health`.
- **Spec 02 (testing-setup):** Vitest configurado en `apps/api` con scripts `test` y `test:watch`.
- **Spec 03 (database-schema-and-seed):** `packages/db` con Drizzle + cliente libSQL/SQLite, schema de las 3 tablas (`flags`, `targeting_rules`, `audit_log`), migraciones aplicadas y un helper de conexión reutilizable exportado (p. ej. `getDb()` o cliente `db`).

### Stack

- pnpm workspaces (sin Turborepo).
- `apps/api`: Hono (TypeScript).
- `packages/db`: Drizzle ORM + SQLite/libSQL (archivo `.db` local).
- `packages/domain`: tipos y lógica pura (aquí se usa solo para tipos compartidos si existen; la lógica de evaluación llega en spec 09).
- Vitest para tests.
- Sin SDK en esta iteración.

### Modelo de datos (contrato canónico — definido en spec 03)

Tabla `flags`:

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | text PK | UUID |
| `key` | text UNIQUE | alfanumérico + guion bajo, p. ej. `checkout_v2` |
| `name` | text | nombre legible |
| `description` | text | propósito |
| `type` | text enum | `'release'` (único valor en MVP) |
| `status` | text enum | `'draft'` \| `'active'` \| `'deprecated'` \| `'archived'` |
| `default_value` | boolean | valor cuando no aplica ninguna regla |
| `fail_mode` | text enum | `'fail_closed'` (default) \| `'fail_open'` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

Tabla `targeting_rules`:

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | text PK | UUID |
| `flag_id` | text FK → flags.id | |
| `type` | text enum | `'environment'` \| `'company'` \| `'percentage'` |
| `environment` | text \| null | `'development'` \| `'staging'` \| `'production'` \| null |
| `company_id` | text \| null | |
| `percentage` | int \| null | 0–100 |
| `value` | boolean | |
| `priority` | int | orden de evaluación |
| `created_at` | timestamp | |

Tabla `audit_log` (append-only):

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | text PK | UUID |
| `entity_type` | text enum | `'flag'` \| `'rule'` |
| `entity_id` | text | id de la flag o regla afectada |
| `action` | text enum | `'create'` \| `'update'` \| `'archive'` \| `'delete'` |
| `field` | text \| null | campo afectado (en updates) |
| `old_value` | text \| null | valor anterior serializado |
| `new_value` | text \| null | valor nuevo serializado |
| `timestamp` | timestamp | |

---

## 3. Alcance

### In scope

- Router Hono montado bajo el prefijo base `/api/v1`.
- CRUD de flags: listar (con filtro `status`), crear, obtener por `key`, editar por `key`.
- Archivado en vez de borrado de flags (no existe `DELETE` de flag).
- CRUD de reglas: listar reglas de una flag, crear regla, eliminar regla.
- Lectura del audit log con filtro opcional por flag.
- Validaciones: `key` única y con formato `^[a-z0-9_]+$` → 409 si duplicada, 400 si formato inválido; `percentage` entre 0 y 100 inclusive.
- Escritura en `audit_log` en cada mutación (create/update/archive de flag, create/delete de regla).
- Tests con Vitest de todos los endpoints.

### Out of scope

- Endpoints de evaluación (`/evaluate`, `/evaluate-batch`) → spec 09.
- Autenticación, sesión, cookies y middleware admin → spec 05.
- UI web (specs 06–08, 10, 11).
- Borrado físico de flags (prohibido por RF-05).
- Edición o borrado de entradas del audit log (append-only, RNF-07).

---

## 4. Tareas en orden

1. **Estructura del router.** Crear en `apps/api` un router Hono y montarlo bajo `/api/v1`. Inyectar el cliente Drizzle desde `packages/db` (helper de conexión de spec 03).

2. **Helper de auditoría.** Crear una función interna `writeAudit({ entity_type, entity_id, action, field?, old_value?, new_value? })` que inserte una fila en `audit_log` con `id` UUID y `timestamp` actual. `old_value` y `new_value` se serializan a string (JSON.stringify para valores no string).

3. **Validación de `key`.** Implementar validación: formato `^[a-z0-9_]+$` (alfanumérico minúsculas + guion bajo). Si no cumple → 400. Comprobar unicidad antes de insertar; si ya existe → 409.

4. **GET `/api/v1/flags`.** Listar todas las flags. Aceptar query param opcional `status` (`draft|active|deprecated|archived`); si se pasa, filtrar. Responder 200 con array de flags.

5. **POST `/api/v1/flags`.** Crear flag. Body: `{ key, name, description, type, default_value, fail_mode }`. Validar `key`. Defaults: `status='draft'`, `type='release'`, `fail_mode='fail_closed'` si no se envía. Generar `id` UUID y timestamps. Escribir audit `entity_type='flag', action='create'`. Responder 201 con la flag creada. 409 si `key` duplicada, 400 si formato/payload inválido.

6. **GET `/api/v1/flags/:key`.** Obtener flag por `key`. 200 con la flag o 404 si no existe.

7. **PATCH `/api/v1/flags/:key`.** Editar campos permitidos: `name`, `description`, `default_value`, `fail_mode`, `status`. No permite cambiar `key` ni `type`. Por cada campo modificado, escribir una entrada de audit (`action='update'` con `field`, `old_value`, `new_value`); si el cambio es de `status` a `'archived'`, usar `action='archive'`. Actualizar `updated_at`. Responder 200 con la flag actualizada. 404 si no existe, 400 si payload inválido.

8. **GET `/api/v1/flags/:flagId/rules`.** Listar reglas de una flag (por `flag_id`), ordenadas por `priority` ascendente. 200 con array. 404 si la flag no existe.

9. **POST `/api/v1/flags/:flagId/rules`.** Crear regla. Body según `type`:
   - `environment`: `{ type:'environment', environment, value, priority }`
   - `company`: `{ type:'company', company_id, value, priority }`
   - `percentage`: `{ type:'percentage', percentage, value, priority }`
   Validar: `percentage` entre 0 y 100 inclusive (400 si fuera de rango); `environment` ∈ {development, staging, production}; coherencia de campos según `type` (los no aplicables van `null`). Generar `id` UUID. Escribir audit `entity_type='rule', action='create'`. 201 con la regla creada. 404 si la flag no existe.

10. **DELETE `/api/v1/flags/:flagId/rules/:ruleId`.** Eliminar regla por id. Escribir audit `entity_type='rule', action='delete'` (con `old_value` = snapshot de la regla). 200 (o 204) si se eliminó; 404 si no existe.

11. **GET `/api/v1/audit-log`.** Listar entradas del audit log ordenadas por `timestamp` descendente. Query param opcional `flag` (= `key` o `flag_id`, documentar cuál; recomendado `key` resuelto a `entity_id`) para filtrar. 200 con array. El audit log es solo lectura: no se exponen endpoints de escritura/borrado.

12. **Tests Vitest.** Cubrir todos los endpoints y validaciones (ver sección 5).

---

## 5. Criterios de aceptación verificables

Todos los criterios se verifican con tests Vitest en `apps/api` que arrancan el router Hono contra una DB de test (SQLite en memoria o archivo temporal con migraciones aplicadas), usando `app.request(...)` de Hono.

- **CA-04.1 (crear flag — RF-01):** `POST /api/v1/flags` con `{ key:'checkout_v2', name:'Checkout v2', description:'...', type:'release', default_value:false, fail_mode:'fail_closed' }` responde 201; el body incluye `id`, `status='draft'`, `created_at`, `updated_at`.
- **CA-04.2 (key duplicada — RF-02):** crear dos flags con la misma `key` → la segunda responde **409**.
- **CA-04.3 (key inválida — RF-02):** crear flag con `key='Checkout V2!'` (mayúsculas/espacios/símbolos) responde **400**.
- **CA-04.4 (listar + filtro — RF-04):** tras crear flags con distintos `status`, `GET /api/v1/flags` devuelve todas; `GET /api/v1/flags?status=draft` devuelve solo las `draft`.
- **CA-04.5 (detalle — RF-01/03):** `GET /api/v1/flags/checkout_v2` responde 200 con la flag; `GET /api/v1/flags/no_existe` responde **404**.
- **CA-04.6 (editar — RF-03):** `PATCH /api/v1/flags/checkout_v2` con `{ default_value:true }` responde 200 y la flag refleja `default_value:true` y `updated_at` actualizado.
- **CA-04.7 (no borrar, solo archivar — RF-05):** no existe ruta `DELETE /api/v1/flags/:key`. `PATCH` con `{ status:'archived' }` responde 200 y deja la flag en `archived`.
- **CA-04.8 (crear reglas — RF-06/07/08):** crear una regla `environment` (staging,true), una `company` (acme,true) y una `percentage` (50,true) responde 201 en cada caso; aparecen en `GET /api/v1/flags/:flagId/rules`.
- **CA-04.9 (percentage fuera de rango — RF-08):** crear regla `percentage` con `percentage=150` o `percentage=-1` responde **400**.
- **CA-04.10 (eliminar regla — RF-09):** `DELETE /api/v1/flags/:flagId/rules/:ruleId` elimina la regla; un `GET` posterior de reglas ya no la incluye.
- **CA-04.11 (listar reglas — RF-10):** `GET /api/v1/flags/:flagId/rules` devuelve las reglas ordenadas por `priority`.
- **CA-04.12 (audit en create — RF-22):** tras crear una flag, `GET /api/v1/audit-log?flag=checkout_v2` incluye una entrada `entity_type='flag', action='create'`.
- **CA-04.13 (audit en update — RF-22 / CA-09):** editar `default_value` genera una entrada `action='update'` con `field='default_value'`, `old_value` y `new_value` correctos.
- **CA-04.14 (audit en archive — RF-22):** cambiar `status` a `archived` genera una entrada con `action='archive'`.
- **CA-04.15 (audit en regla — RF-22):** crear y eliminar una regla generan entradas `entity_type='rule'` con `action='create'` y `action='delete'` respectivamente.

---

## 6. Notas técnicas

- **Prefijo base:** todas las rutas cuelgan de `/api/v1`. Mantener este prefijo exacto; specs 05 y 09 montan rutas hermanas (`/api/v1/auth/*`, `/api/v1/flags/:key/evaluate`).
- **IDs:** usar UUID v4 (`crypto.randomUUID()`) para `flags.id`, `targeting_rules.id` y `audit_log.id`.
- **Booleans en SQLite:** SQLite no tiene boolean nativo; respetar la convención de mapeo definida en spec 03 (típicamente integer 0/1 con `{ mode: 'boolean' }` en Drizzle). En request/response los booleanos se exponen como JSON `true`/`false`.
- **Serialización de audit:** `old_value`/`new_value` se guardan como texto. Para booleanos/números usar `String(v)` o `JSON.stringify(v)` de forma consistente; documentar la elección en el código.
- **Validación:** se recomienda validar payloads con un esquema (p. ej. Zod) y devolver 400 con mensaje claro ante body inválido. La validación de `key` (`^[a-z0-9_]+$`) y de `percentage` (0–100) es obligatoria.
- **Filtro `audit-log?flag=`:** resolver el valor a `entity_id`. Recomendado aceptar la `key` de la flag, traducirla a su `id` y filtrar `entity_id = id` para entradas de flag (y opcionalmente sus reglas vía `flag_id`). Documentar el comportamiento exacto elegido.
- **Códigos de estado:** 200 lectura/edición ok, 201 creación, 400 validación, 404 no encontrado, 409 conflicto de `key`. No devolver 500 sin contexto en errores controlados.
- **Auth diferida:** no añadir middleware de protección aquí; la spec 05 lo introducirá envolviendo estas rutas (excepto `/evaluate*`, que serán públicas).
- **Tests:** aislar la DB por test (memoria o archivo temporal) y aplicar migraciones antes de cada suite para evitar estado compartido.
