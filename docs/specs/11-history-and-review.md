# Spec 11 — Historial y revisión (audit log)

## 1. Objetivo

Construir en `apps/web` (Next.js + Tailwind) la **vista del audit log**: una lista de las entradas de auditoría (timestamp, entidad, acción, campo, valor anterior y valor nuevo), con **filtro por flag**, presentada como **append-only** en la UI (solo lectura: sin editar ni eliminar).

Cubre **RF-19** (mostrar audit log), **RNF-07** (append-only, no editable ni eliminable desde la UI) y **CA-09** (editar `default_value` genera una entrada con old/new value visible).

## 2. Contexto y dependencias

### Specs previas requeridas (deben estar implementadas)

- **04 — API feature flags**: las operaciones de escritura (crear/editar/archivar flag, crear/eliminar regla) ya **registran entradas en el audit log**, y existe el endpoint `GET /api/v1/audit-log`. Esta spec **depende de la 04**.
- **05 — Basic login**: sesión por cookie; páginas admin protegidas. (El audit log es admin.)
- Para que existan entradas reales que mostrar, conviene que estén implementadas las specs que generan escrituras: **07** (editar flag → CA-09) y **08** (crear/eliminar reglas). No son estrictamente necesarias para construir la vista, pero sí para verla con datos.
- Reutiliza el helper `apiFetch` de `apps/web/src/lib/api.ts` (introducido en spec 06).
- Transitivamente: **01** (monorepo + Next + Tailwind), **02** (Vitest + testing de componentes), **03** (DB/seed).

### Modelo de datos

```ts
interface AuditLogEntry {
  id: string;
  entity_type: 'flag' | 'rule';
  entity_id: string;
  action: 'create' | 'update' | 'archive' | 'delete';
  field?: string;       // campo afectado (en updates)
  old_value?: string;   // valor anterior
  new_value?: string;   // valor nuevo
  timestamp: string;    // ISO
}
```

### Endpoint que consume (base `/api/v1`)

- **Listar audit log**: `GET /api/v1/audit-log` → `AuditLogEntry[]`.
- **Filtrar por flag**: `GET /api/v1/audit-log?flag=<key>` → `AuditLogEntry[]` de esa flag.

> El parámetro de filtro es `flag` (por `key`). Si la API resolviera por `entity_id`, documentar el mapeo; el contrato indica `?flag=` por key.

### Autenticación

Página admin: requiere sesión por cookie (spec 05). Reenviar cookie en server components y `credentials: 'include'` en cliente. 401 → redirigir a `/login`.

## 3. Alcance

### In scope

- Ruta `/history` (o `/audit-log`) que consume `GET /api/v1/audit-log` y muestra las entradas en una tabla/lista.
- Columnas: `timestamp` (formateado legible), `entity_type`, `action`, `field`, `old_value`, `new_value` (y opcionalmente `entity_id`).
- **Filtro por flag**: selector/input que aplica `?flag=<key>` y re-consulta. Opción "Todas".
- Orden cronológico (más reciente primero por defecto).
- Presentación **append-only**: la UI es estrictamente de **solo lectura**; no hay controles para editar ni eliminar entradas.
- Estados de carga, vacío ("sin entradas") y error.
- Estilado Tailwind (lectura clara de old → new).

### Out of scope

- Generar entradas de auditoría (lo hace la API en cada escritura, spec 04).
- Editar o eliminar entradas (prohibido por RNF-07; ni siquiera debe existir el control).
- Exportar el log / paginación avanzada (no requerido en MVP).
- Detalle inline navegable a la flag (opcional; se puede enlazar pero no es requisito).

## 4. Tareas en orden

1. **Extender el helper de API** (`apps/web/src/lib/api.ts`): `getAuditLog(flagKey?)` → `GET /audit-log` (añadiendo `?flag=<key>` solo si se pasa) → `AuditLogEntry[]` tipado.
2. **Tipos**: definir `AuditLogEntry` con la forma exacta del contrato.
3. **Página** `/history`: server component preferido que carga el log (reenviando cookie) y lo pasa a la tabla; el filtro vía `searchParams` (`?flag=`).
4. **Componente** `AuditLogTable`: renderiza columnas timestamp/entity_type/action/field/old_value/new_value; formatea `timestamp`; muestra old/new de forma legible (p. ej. `old → new`).
5. **Filtro por flag** `FlagFilter`: selector con las keys disponibles (obtenidas de `getFlags()` de spec 06) + opción "Todas"; al cambiar, navega con `?flag=<key>` y re-consulta.
6. **Orden**: mostrar más reciente primero (ordenar por `timestamp` desc si la API no lo garantiza).
7. **Estados y estilado**: carga, vacío, error; Tailwind; sin ningún botón mutador.
8. **Enlace**: entrada de navegación al historial desde el área admin.
9. **Tests (Vitest)**: ver criterios de aceptación. Mockear el helper de API.
10. **Verificación**: `pnpm --filter web test` en verde y `pnpm --filter web build` compila.

## 5. Criterios de aceptación verificables

- **CA-11.1 (render del log)**: dado un mock de `getAuditLog` con una entrada `{ entity_type:'flag', action:'update', field:'default_value', old_value:'false', new_value:'true', timestamp }`, la tabla muestra una fila con acción `update`, campo `default_value`, old `false` y new `true`. Test de componente. (Corresponde a CA-09.)
- **CA-11.2 (columnas)**: la tabla renderiza encabezados para timestamp, entidad, acción, campo, valor anterior y valor nuevo. Test de componente.
- **CA-11.3 (filtro por flag)**: seleccionar una flag en el filtro invoca `getAuditLog('checkout_v2')` (o navega con `?flag=checkout_v2`) y solo muestra entradas de esa flag. Test de componente verificando el argumento y el render.
- **CA-11.4 (append-only / RNF-07)**: la UI no contiene ningún control para editar ni eliminar entradas (no hay botones/inputs de mutación en las filas). Test de componente que verifica la ausencia de dichos controles.
- **CA-11.5 (estado vacío)**: si `getAuditLog` devuelve `[]`, se muestra un mensaje de vacío y ninguna fila. Test de componente.
- **CA-11.6 (estado de error)**: si la llamada falla, se muestra mensaje de error. Test de componente.
- **CA-11.7 (orden cronológico)**: dadas varias entradas con distintos `timestamp`, se muestran con la más reciente primero. Test de componente.
- **CA-11.8 (build/tipos)**: `pnpm --filter web build` compila sin `any`; `AuditLogEntry` coincide con el contrato. Verificación CI/manual.

## 6. Notas técnicas

- **Solo lectura estricta**: para cumplir RNF-07, la vista no debe incluir acciones mutadoras. No existe endpoint de edición/borrado del log y la UI tampoco debe sugerirlo. Los tests verifican la ausencia de controles de mutación.
- **Filtro por key**: el query param es `?flag=<key>`. Poblar el selector con las keys reales vía `getFlags()` (spec 06). Mantener opción "Todas" (sin param).
- **Formato de valores**: `old_value`/`new_value` se almacenan como string en el contrato; mostrarlos tal cual, idealmente con un formato `antes → después` para legibilidad. Para acciones `create`/`delete` puede no haber `field`/old/new; manejar campos opcionales sin romper el render.
- **Timestamp**: formatear a formato legible local manteniendo precisión (fecha y hora). Conservar orden por el valor ISO original, no por el string formateado.
- **Cookie de sesión**: reenviar en server components; `credentials: 'include'` en cliente; 401 → `/login`.
- **Dependencia de datos**: para ver entradas reales hay que ejecutar acciones de escritura (editar una flag, crear/eliminar reglas) que la API registra (spec 04/07/08). En tests, mockear `getAuditLog`.
- **Testing**: mockear `lib/api` (`getAuditLog`, y `getFlags` para el filtro). Cubrir render, filtro, vacío, error, orden y ausencia de controles de mutación.
