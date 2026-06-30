# Spec 06 — Dashboard: listado de flags

## 1. Objetivo

Construir la página de **listado de feature flags** en `apps/web` (Next.js + Tailwind). Debe consumir `GET /api/v1/flags`, mostrar una tabla con `key`, `name`, `status` y `default_value`, permitir filtrar por `status` y manejar correctamente los estados de carga, error y vacío.

Cubre **RF-15** (listado con key/name/status/default_value), **RF-04** (listar con filtro opcional por status) y **CA-01** en su parte de "aparece en el listado".

> Esta spec **NO** incluye crear ni editar flags (eso es la spec 07), ni reglas de targeting (spec 08).

## 2. Contexto y dependencias

### Specs previas requeridas (deben estar implementadas)

- **01 — Monorepo setup**: existe `apps/web` con Next.js (App Router), Tailwind configurado y TypeScript. Scripts `pnpm --filter web dev` y `pnpm --filter web build` funcionan.
- **02 — Testing setup**: Vitest configurado en `apps/web` con testing de componentes (React Testing Library o equivalente) y `pnpm --filter web test` corre.
- **03 — DB schema + seed**: existe la flag de ejemplo `checkout_v2` en el seed, así que el listado tendrá al menos un registro real.
- **04 — API feature flags**: el endpoint `GET /api/v1/flags?status=` está disponible y devuelve la lista.
- **05 — Basic login**: existe sesión por cookie; las páginas admin (incluida esta) requieren sesión. El acceso sin sesión debe redirigir a login.

### Modelo de datos que consume esta spec

La web recibe objetos `Flag` con esta forma exacta:

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

### Endpoint que consume

- `GET /api/v1/flags` → `Flag[]` (todas las flags).
- `GET /api/v1/flags?status=<draft|active|deprecated|archived>` → `Flag[]` filtradas por estado.

Base URL de la API: `/api/v1` (configurable vía variable de entorno, p. ej. `NEXT_PUBLIC_API_BASE_URL` o un proxy de Next; usar un único helper `apiFetch` para centralizar la base y el envío de la cookie de sesión con `credentials: 'include'` cuando se llame desde el cliente).

### Autenticación

Es una página admin: requiere sesión por cookie (definida en spec 05). Si no hay sesión, la API responderá 401 y/o el middleware de la web redirigirá a `/login`. Esta spec debe asumir que la cookie de sesión se reenvía en las llamadas a la API (en server components, propagar la cookie entrante; en cliente, usar `credentials: 'include'`).

## 3. Alcance

### In scope

- Ruta `/flags` (o la home admin `/`) que renderiza el listado.
- Llamada a `GET /api/v1/flags` con propagación de la cookie de sesión.
- Tabla con columnas: `key`, `name`, `status`, `default_value`.
- Filtro por `status` (selector con opciones: Todos, draft, active, deprecated, archived) que vuelve a consultar (o filtra vía query param) y refleja el resultado.
- Estado de **carga** (mientras se obtienen datos).
- Estado **vacío** (la respuesta es una lista vacía o el filtro no arroja resultados): mensaje claro.
- Estado de **error** (la API falla / 4xx-5xx): mensaje de error legible y opción de reintentar.
- Cada fila enlaza al detalle de la flag (`/flags/[key]`) para que specs posteriores (07/08) tengan punto de entrada; el destino puede ser un placeholder si aún no existe.
- Estilado con Tailwind (tabla legible, badge de status con color por estado).

### Out of scope

- Crear / editar flags (spec 07).
- Gestión de reglas de targeting (spec 08).
- Simulador (spec 10) e historial / audit log (spec 11).
- Paginación / búsqueda por texto (no requerida en MVP; volumen < 100 flags).
- Implementación del login en sí (spec 05).

## 4. Tareas en orden

1. **Helper de fetch**: crear `apps/web/src/lib/api.ts` con `apiFetch(path, init?)` que prefija la base `/api/v1`, setea `credentials: 'include'` en cliente y, en server components, reenvía la cookie de sesión entrante. Exponer `getFlags(status?)` que llama a `GET /flags` (añadiendo `?status=` solo si se pasa) y devuelve `Flag[]` tipado.
2. **Tipos compartidos**: definir/`import` el tipo `Flag` y `FlagStatus` (en `apps/web/src/types/flags.ts` o reutilizando `packages/domain` si lo exporta). Mantener la forma exacta del contrato.
3. **Página de listado**: crear la ruta del listado (App Router, p. ej. `apps/web/src/app/flags/page.tsx`). Obtener las flags (server component preferido) y pasarlas a la tabla.
4. **Componente tabla** `FlagsTable`: renderiza columnas key/name/status/default_value; `status` como badge con color por estado; `default_value` como texto/booleano legible (p. ej. "true"/"false" o un chip On/Off). Cada fila enlaza a `/flags/[key]`.
5. **Filtro por status** `StatusFilter`: selector controlado que actualiza el query param `?status=` (o estado de URL) y re-consulta. Opción "Todos" sin filtro.
6. **Estados de UI**: implementar carga, vacío y error. Para vacío distinguir "no hay flags" vs "ningún resultado para el filtro X".
7. **Estilado Tailwind**: layout contenedor, tabla responsive, badges de status, mensajes de estado.
8. **Tests de componente (Vitest)**: ver criterios de aceptación. Mockear `apiFetch`/`getFlags`.
9. **Verificación**: `pnpm --filter web test` en verde y `pnpm --filter web build` compila sin errores de tipos.

## 5. Criterios de aceptación verificables

- **CA-06.1 (render de lista)**: dado un mock de `getFlags` que devuelve `[checkout_v2 (active, default false)]`, la tabla muestra una fila con `key=checkout_v2`, su `name`, un badge `active` y `default_value` "false". Test de componente.
- **CA-06.2 (columnas)**: la tabla renderiza encabezados para `key`, `name`, `status` y `default_value`. Test de componente.
- **CA-06.3 (filtro por status)**: al seleccionar `status=active` en el filtro, se invoca `getFlags('active')` (o se navega con `?status=active`) y solo se muestran flags activas. Test de componente verificando la llamada con el argumento correcto y el render filtrado.
- **CA-06.4 (estado vacío)**: si `getFlags` devuelve `[]`, se muestra un mensaje de vacío (p. ej. "No hay flags") y no se renderizan filas. Test de componente.
- **CA-06.5 (estado de error)**: si `getFlags` rechaza / la API responde error, se muestra un mensaje de error y (si aplica) un botón de reintento. Test de componente.
- **CA-06.6 (enlace a detalle)**: cada fila contiene un enlace a `/flags/<key>`. Test de componente verificando el `href`.
- **CA-06.7 (build/tipos)**: `pnpm --filter web build` compila; el tipo `Flag` usado coincide con el contrato (sin `any`). Verificación manual/CI.

## 6. Notas técnicas

- **Server vs client**: preferir un **server component** para la carga inicial (evita exponer la base de API y propaga la cookie de sesión de forma natural). El filtro puede resolverse vía navegación con `searchParams` (`/flags?status=active`), re-renderizando el server component; alternativamente un client component con `useState` + `getFlags`. Cualquiera de las dos es válida siempre que los tests cubran el comportamiento.
- **Propagación de cookie**: en server components usar `cookies()` de `next/headers` para reenviar la cookie de sesión al llamar a la API; en cliente usar `fetch(..., { credentials: 'include' })`.
- **Manejo de 401**: si la API responde 401 (sin sesión), redirigir a `/login` (coherente con spec 05 / CA-07). No mostrar la tabla.
- **Badges de status**: mapa de color sugerido — `draft` gris, `active` verde, `deprecated` ámbar, `archived` rojo/neutro. Mantener accesible (texto + color, no solo color).
- **No mutar**: esta página es de solo lectura; no incluye botones de acción que modifiquen flags.
- **Testing**: mockear el módulo `lib/api` (o `getFlags`) en los tests de componente para no depender de la red. Si el listado es server component, extraer la tabla y el filtro como componentes testeables de forma aislada con props.
- **Datos de ejemplo (seed)**: el seed de la spec 03 incluye `checkout_v2`; usarlo como referencia en pruebas manuales para confirmar que el listado refleja datos reales.
