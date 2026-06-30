# Spec 07 — Crear y editar feature flag

## 1. Objetivo

Construir en `apps/web` (Next.js + Tailwind) los **formularios para crear y editar** una feature flag, además del **control de cambio de `status`** siguiendo el ciclo de vida `draft → active → deprecated → archived`. Incluye validación en cliente y manejo del error **409** por `key` duplicada.

Cubre **RF-16** (crear/editar desde formulario), **RF-01** (crear con todos los campos), **RF-03** (editar name/description/default_value/fail_mode/status), **RF-18** (cambiar status) y **CA-01** (crear `checkout_v2` con default `false` y status `draft`).

> Esta spec **NO** incluye reglas de targeting (spec 08) ni el listado (spec 06).

## 2. Contexto y dependencias

### Specs previas requeridas (deben estar implementadas)

- **06 — Dashboard list**: existe el listado en `/flags`, el helper `apiFetch`/`getFlags` en `apps/web/src/lib/api.ts`, y el tipo `Flag`. Esta spec extiende ese helper con create/update y enlaza desde el listado/detalle.
- Transitivamente (vía 06): **01** (monorepo + Next + Tailwind), **02** (Vitest + testing de componentes), **03** (seed con `checkout_v2`), **04** (API CRUD de flags), **05** (login + sesión por cookie; páginas admin protegidas).

### Modelo de datos

```ts
type FlagStatus = 'draft' | 'active' | 'deprecated' | 'archived';

interface Flag {
  id: string;
  key: string;
  name: string;
  description: string;
  type: 'release';
  status: FlagStatus;
  default_value: boolean;
  fail_mode: 'fail_closed' | 'fail_open';
  created_at: string;
  updated_at: string;
}
```

### Endpoints que consume (base `/api/v1`)

- **Crear**: `POST /api/v1/flags`
  - Body: `{ key, name, description, type: 'release', default_value: boolean, fail_mode: 'fail_closed' | 'fail_open' }`.
  - Respuesta `201` → `Flag` creada (status inicial `draft`).
  - **`409 Conflict`** si `key` ya existe (duplicada).
  - `400` si la validación del servidor falla (p. ej. key no alfanumérica).
- **Obtener** (para precargar edición): `GET /api/v1/flags/:key` → `Flag`.
- **Editar**: `PATCH /api/v1/flags/:key`
  - Body parcial: cualquiera de `{ name?, description?, default_value?, fail_mode?, status? }`.
  - Respuesta `200` → `Flag` actualizada.
  - La `key` y el `type` **no** se editan tras la creación.

### Reglas de negocio relevantes (del PRD)

- `key`: único, **alfanumérico con guiones bajos** (`^[a-z0-9_]+$` recomendado), requerido. No editable tras crear.
- No se elimina una flag; solo se **archiva** (transición de `status` a `archived`). No hay botón de borrar.
- Ciclo de vida del `status`: `draft → active → deprecated → archived` (avance secuencial). Una flag `archived` no se evalúa (siempre `false`), por lo que archivar es una acción terminal.
- `default_value`: booleano, requerido (CA-01 lo crea en `false`).
- `fail_mode`: `fail_closed` (default) o `fail_open`.

### Autenticación

Páginas admin: requieren sesión por cookie (spec 05). Propagar cookie en server components y usar `credentials: 'include'` en cliente. Un 401 redirige a `/login`.

## 3. Alcance

### In scope

- **Formulario de creación** (`/flags/new`): campos `key`, `name`, `description`, `type` (fijo en `release`, mostrado como solo lectura o selector con única opción), `default_value` (toggle/booleano), `fail_mode` (selector). Envía `POST /flags`.
- **Formulario de edición** (`/flags/[key]/edit` o panel en el detalle): precarga la flag con `GET /flags/:key`; permite editar `name`, `description`, `default_value`, `fail_mode`. `key` y `type` se muestran pero deshabilitados. Envía `PATCH /flags/:key`.
- **Control de `status`**: UI para avanzar el estado en el orden permitido (`draft → active → deprecated → archived`), idealmente mostrando solo la(s) transición(es) válida(s) desde el estado actual. Cada cambio envía `PATCH /flags/:key` con `{ status }`. Archivar pide confirmación.
- **Validación en cliente**: `key` requerida y con formato `^[a-z0-9_]+$`; `name` requerido; `default_value` y `fail_mode` con valores válidos. Mostrar errores por campo y bloquear submit inválido.
- **Manejo de errores del servidor**: mostrar mensaje claro ante `409` (key duplicada, asociado al campo `key`) y ante `400`/otros.
- Tras éxito, redirigir al detalle/listado y reflejar el cambio.
- Estados de envío (loading/disabled en submit) para evitar doble envío.

### Out of scope

- Reglas de targeting (spec 08).
- Eliminar flags (no existe; solo archivar).
- Editar `key` o `type` tras la creación.
- Listado de flags (spec 06) — solo se enlaza hacia/desde él.
- Audit log (spec 11) — las escrituras ya las registra la API (spec 04).

## 4. Tareas en orden

1. **Extender el helper de API** (`apps/web/src/lib/api.ts`):
   - `createFlag(input)` → `POST /flags`; tipa `input` como `CreateFlagInput` (`key, name, description, type:'release', default_value, fail_mode`). Debe distinguir y propagar el **409** (p. ej. lanzar un error tipado `ApiError` con `status`).
   - `getFlag(key)` → `GET /flags/:key`.
   - `updateFlag(key, patch)` → `PATCH /flags/:key`; `patch` parcial (`name?, description?, default_value?, fail_mode?, status?`).
2. **Tipos**: definir `CreateFlagInput`, `UpdateFlagPatch` y un `ApiError { status: number; message: string }` reutilizable.
3. **Validación cliente**: función pura `validateFlagInput(input)` que devuelva errores por campo (key requerida + regex `^[a-z0-9_]+$`, name requerido, fail_mode/ default_value válidos). Mantenerla pura para testearla de forma aislada.
4. **Formulario de creación** (`/flags/new`): client component con estado controlado, validación en submit, llamada a `createFlag`, manejo de 409 mostrando error en el campo `key`, y redirección al detalle/listado en éxito.
5. **Formulario de edición** (`/flags/[key]/edit` o panel): precargar con `getFlag(key)`; `key`/`type` deshabilitados; editar campos permitidos; llamar `updateFlag`.
6. **Control de status**: componente `StatusControl` que, dado el `status` actual, ofrece la transición válida siguiente (`draft→active→deprecated→archived`) y, en cada paso, `updateFlag(key, { status })`. Confirmación al archivar.
7. **Estilado Tailwind**: formularios accesibles (labels asociados, mensajes de error visibles), botones con estado de carga.
8. **Enlaces**: botón "Nueva flag" en el listado (spec 06) → `/flags/new`; acceso a edición desde el detalle.
9. **Tests (Vitest)**: ver criterios de aceptación. Mockear las funciones del helper de API.
10. **Verificación**: `pnpm --filter web test` en verde y `pnpm --filter web build` compila.

## 5. Criterios de aceptación verificables

- **CA-07.1 (crear flag — CA-01)**: completando el formulario de creación con `key=checkout_v2`, `name`, `default_value=false`, `fail_mode=fail_closed` y enviando, se llama a `createFlag` con el body exacto (`type:'release'`, `default_value:false`). Test de componente verificando el payload.
- **CA-07.2 (validación key vacía)**: enviar con `key` vacía muestra error en el campo `key` y **no** llama a `createFlag`. Test de componente.
- **CA-07.3 (validación formato key)**: `key` con caracteres inválidos (p. ej. `Checkout V2!`) muestra error de formato y no envía. Test de componente o test unitario de `validateFlagInput`.
- **CA-07.4 (409 key duplicada)**: si `createFlag` rechaza con `ApiError(status=409)`, el formulario muestra un mensaje de "key duplicada" asociado al campo `key` y no redirige. Test de componente.
- **CA-07.5 (editar default_value — base de CA-09)**: en el formulario de edición de una flag existente, cambiar `default_value` y guardar llama a `updateFlag(key, { default_value: <nuevo> })`. Test de componente. (La entrada en audit log la genera la API; la vista es spec 11.)
- **CA-07.6 (key no editable)**: en edición, el campo `key` (y `type`) está deshabilitado y no se envía en el `PATCH`. Test de componente.
- **CA-07.7 (cambio de status válido)**: dado `status=draft`, el control ofrece avanzar a `active` y al confirmarlo llama `updateFlag(key, { status: 'active' })`. Test de componente.
- **CA-07.8 (archivar con confirmación)**: avanzar a `archived` requiere confirmación; sin confirmar no se llama a `updateFlag`. Test de componente.
- **CA-07.9 (build/tipos)**: `pnpm --filter web build` compila sin `any` en los inputs. Verificación CI/manual.

## 6. Notas técnicas

- **Distinguir 409**: el helper debe inspeccionar el `status` de la respuesta y lanzar `ApiError` con `status` y `message`. La UI mapea `409` → mensaje en campo `key`; `400` → mensaje general o por campo si la API detalla; `401` → redirigir a `/login`.
- **Formularios controlados**: client components con `useState` (o un manejador de formularios ligero). Mantener la validación en una función pura separada para poder testearla sin render.
- **`type` fijo**: en el MVP solo existe `release`; mostrarlo como solo lectura o selector con única opción, pero enviarlo siempre como `'release'`.
- **Transiciones de status**: implementar el orden como un mapa `next: { draft:'active', active:'deprecated', deprecated:'archived', archived:null }`. No permitir saltar etapas ni retroceder (alineado con RF-18 y el ciclo del PRD). Archivar es terminal.
- **Evitar doble submit**: deshabilitar el botón mientras la petición está en curso.
- **Cookie de sesión**: en server components (precarga de edición) reenviar cookie con `cookies()`; en cliente usar `credentials: 'include'`.
- **Sin borrado**: no incluir ninguna acción de eliminación (RF-05); la única salida del ciclo de vida es `archived`.
- **Testing**: mockear `lib/api` (`createFlag`, `getFlag`, `updateFlag`). Probar tanto el camino feliz como los errores (409, validación). Si la precarga de edición es server component, extraer el formulario como componente cliente con props para poder testearlo aislado.
