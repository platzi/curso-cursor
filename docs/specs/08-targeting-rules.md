# Spec 08 — Reglas de targeting (UI)

## 1. Objetivo

Construir, dentro del **detalle de una flag** en `apps/web` (Next.js + Tailwind), la UI para **listar, crear y eliminar reglas de targeting** de tipo `environment`, `company` y `percentage` (cada una con su `value` booleano y su `priority`), conectada a los endpoints de reglas de la API. Incluye validación de `percentage` en el rango 0–100.

Cubre **RF-17** (gestionar reglas en la UI) y **RF-06..RF-10** (añadir environment/company/percentage, eliminar y listar reglas).

> Esta spec **NO** implementa la lógica de evaluación (eso es la spec 09); solo CRUD visual de reglas.

## 2. Contexto y dependencias

### Specs previas requeridas (deben estar implementadas)

- **07 — Crear/editar flag**: existe el detalle/edición de una flag (`/flags/[key]`), el helper `apiFetch` en `apps/web/lib/api.ts`, los tipos `Flag`, `ApiError`, y `getFlag(key)`. Esta spec añade la sección de reglas en esa página de detalle.
- Transitivamente: **01** (monorepo + Next + Tailwind), **02** (Vitest + testing de componentes), **03** (seed con `checkout_v2` y reglas de ejemplo), **04** (API de reglas), **05** (login + sesión por cookie; admin protegido), **06** (listado + helper de API base).

### Multitask y paralelización

| Campo | Valor |
|-------|-------|
| **Wave** | **3** — tras completar **07** (no puede empezar antes) |
| **Paralelo con** | **11** (si 11 sigue en curso o ya terminó en wave 2) |
| **Requiere antes** | 06, 07 |
| **No paralelizar con** | **06** (solo transitivo), **07** (prerequisito directo) |

```
Wave 1:  [06]
Wave 2:  [07] ║ [11]
Wave 3:  [08] ║ [11]   ← 08 solo tras 07; 11 puede solaparse
```

**Conflictos probables al correr en paralelo con 11:**

| Archivo | Riesgo | Mitigación |
|---------|--------|------------|
| `apps/web/lib/api.ts` | Medio — `getRules`/`createRule`/`deleteRule` vs `getAuditLog` | Funciones independientes; merge por bloques |
| Navegación admin | Bajo–medio | Combinar enlaces en el merge |
| `apps/web/app/flags/[key]/` | Ninguno con 11 | 11 no toca el detalle de flag |

**Archivos exclusivos de esta spec:** componentes `RulesList`, `RuleForm`; sección de reglas dentro de `/flags/[key]`.

### Modelos de datos

```ts
interface Flag {
  id: string;
  key: string;
  name: string;
  // ...resto del contrato de Flag (ver spec 06/07)
}

type RuleType = 'environment' | 'company' | 'percentage';
type Environment = 'development' | 'staging' | 'production';

interface TargetingRule {
  id: string;
  flag_id: string;
  type: RuleType;
  environment?: Environment; // solo si type === 'environment'
  company_id?: string;       // solo si type === 'company'
  percentage?: number;       // 0-100, solo si type === 'percentage'
  value: boolean;            // valor que aplica la regla
  priority: number;          // entero, orden de prioridad
  created_at: string;
}
```

### Endpoints que consume (base `/api/v1`)

> Importante: las rutas de reglas usan `:flagId` (el `id` de la flag), **no** la `key`. El `id` se obtiene de `GET /api/v1/flags/:key` (campo `Flag.id`).

- **Listar reglas**: `GET /api/v1/flags/:flagId/rules` → `TargetingRule[]`.
- **Crear regla**: `POST /api/v1/flags/:flagId/rules`
  - Body según tipo:
    - environment: `{ type: 'environment', environment, value: boolean, priority: number }`
    - company: `{ type: 'company', company_id: string, value: boolean, priority: number }`
    - percentage: `{ type: 'percentage', percentage: number /*0-100*/, value: boolean, priority: number }`
  - Respuesta `201` → `TargetingRule` creada.
  - `400` si la validación del servidor falla (p. ej. percentage fuera de rango).
- **Eliminar regla**: `DELETE /api/v1/flags/:flagId/rules/:ruleId` → `200`/`204`.

### Autenticación

Página admin: requiere sesión por cookie (spec 05). Reenviar cookie en server components y `credentials: 'include'` en cliente. 401 → redirigir a `/login`.

## 3. Alcance

### In scope

- Sección "Reglas de targeting" dentro del detalle de la flag (`/flags/[key]`).
- **Resolver `flagId`** a partir de la `key` (usando `Flag.id` ya cargado en el detalle).
- **Listar** las reglas existentes (`GET .../rules`) en una tabla/lista mostrando: `type`, parámetro (environment / company_id / percentage), `value`, `priority`.
- **Crear regla**: formulario con selector de `type` que muestra los campos relevantes:
  - environment → selector `environment` ∈ {development, staging, production}.
  - company → input `company_id` (string).
  - percentage → input numérico `percentage` (0–100).
  - Común a todos: `value` (toggle booleano) y `priority` (entero).
  - Envía `POST .../rules` con el body correcto según tipo.
- **Eliminar regla**: botón por fila → `DELETE .../rules/:ruleId`, con confirmación.
- **Validación cliente**: `percentage` entero entre 0 y 100 inclusive; `company_id` no vacío; `environment` seleccionado; `priority` entero. Bloquear submit inválido y mostrar errores.
- Refresco de la lista tras crear/eliminar (re-fetch o actualización de estado) de forma que las reglas queden visibles tras recargar.
- Estados de carga, vacío ("sin reglas") y error.
- Estilado Tailwind.

### Out of scope

- Lógica/algoritmo de evaluación y stickiness (spec 09).
- Edición in-place de una regla (en MVP basta crear + eliminar; editar = eliminar y volver a crear). No es requerido por el PRD.
- Reglas compuestas AND/OR o segmentación avanzada (out of scope del PRD).
- Audit log (spec 11) — las escrituras las registra la API.

## 4. Tareas en orden

1. **Extender el helper de API** (`apps/web/lib/api.ts`):
   - `getRules(flagId)` → `GET /flags/:flagId/rules` → `TargetingRule[]`.
   - `createRule(flagId, input)` → `POST /flags/:flagId/rules`; `input` tipado como unión discriminada por `type` (ver tipos abajo). Propaga `ApiError` (status) en fallo.
   - `deleteRule(flagId, ruleId)` → `DELETE /flags/:flagId/rules/:ruleId`.
2. **Tipos**: definir `TargetingRule`, `RuleType`, `Environment` y `CreateRuleInput` como **unión discriminada** por `type`:
   ```ts
   type CreateRuleInput =
     | { type: 'environment'; environment: Environment; value: boolean; priority: number }
     | { type: 'company'; company_id: string; value: boolean; priority: number }
     | { type: 'percentage'; percentage: number; value: boolean; priority: number };
   ```
3. **Validación cliente**: función pura `validateRuleInput(input)` que devuelva errores por campo (percentage 0–100 entero; company_id no vacío; environment válido; priority entero). Testeable de forma aislada.
4. **Componente de lista** `RulesList`: tabla con `type`, parámetro, `value`, `priority` y botón eliminar por fila. Estado vacío "Sin reglas".
5. **Componente de formulario** `RuleForm`: selector de `type` que condiciona los campos visibles; campos comunes `value` y `priority`; submit → `createRule`.
6. **Integración en el detalle**: montar `RulesList` + `RuleForm` en `/flags/[key]`, resolviendo `flagId` desde la flag cargada; re-fetch tras crear/eliminar.
7. **Eliminar con confirmación**: diálogo/confirm antes de `deleteRule`.
8. **Estados y estilado**: carga, vacío, error; Tailwind.
9. **Tests (Vitest)**: ver criterios de aceptación. Mockear el helper de API.
10. **Verificación**: `pnpm --filter web test` en verde y `pnpm --filter web build` compila.

## 5. Criterios de aceptación verificables

- **CA-08.1 (listar reglas)**: dado un mock de `getRules` con una regla `environment=staging, value=true, priority=1`, la lista muestra una fila con tipo `environment`, parámetro `staging`, value `true`, priority `1`. Test de componente.
- **CA-08.2 (crear regla environment)**: en el formulario, seleccionar `type=environment`, `environment=staging`, `value=true`, `priority=1` y enviar llama a `createRule(flagId, { type:'environment', environment:'staging', value:true, priority:1 })`. Test de componente verificando el payload.
- **CA-08.3 (crear regla company)**: con `type=company`, `company_id=acme-corp`, `value=true`, `priority=2`, enviar llama a `createRule` con `{ type:'company', company_id:'acme-corp', value:true, priority:2 }`. Test de componente.
- **CA-08.4 (crear regla percentage)**: con `type=percentage`, `percentage=50`, `value=true`, `priority=3`, enviar llama a `createRule` con `{ type:'percentage', percentage:50, value:true, priority:3 }`. Test de componente.
- **CA-08.5 (validación percentage fuera de rango)**: `percentage=150` (o `-1`, o decimal) muestra error y **no** llama a `createRule`. Test de componente o unitario de `validateRuleInput`.
- **CA-08.6 (validación company_id vacío)**: `type=company` con `company_id` vacío muestra error y no envía. Test de componente.
- **CA-08.7 (eliminar regla)**: pulsar eliminar en una fila y confirmar llama a `deleteRule(flagId, ruleId)`; sin confirmar no se llama. Test de componente.
- **CA-08.8 (persistencia visible)**: tras crear una regla con éxito, se re-consulta `getRules` (o se actualiza el estado) y la nueva regla aparece en la lista. Test de componente.
- **CA-08.9 (campos condicionales por tipo)**: al cambiar `type`, solo se muestran los campos del tipo seleccionado (p. ej. `percentage` no aparece para `environment`). Test de componente.
- **CA-08.10 (build/tipos)**: `pnpm --filter web build` compila; `CreateRuleInput` como unión discriminada sin `any`. Verificación CI/manual.

## 6. Notas técnicas

- **flagId vs key**: la página de detalle navega por `key`, pero los endpoints de reglas requieren el `id` numérico/uuid de la flag. Obtener `flag.id` del objeto cargado (`getFlag(key)` de la spec 07) y usarlo como `flagId`. Documentarlo claramente en el componente para evitar confusión.
- **Unión discriminada**: usar `type` como discriminante asegura que TypeScript exija solo los campos del tipo seleccionado y evita enviar parámetros de otros tipos.
- **Validación percentage**: entero `0 ≤ p ≤ 100` inclusive. Rechazar decimales, vacíos, NaN y valores fuera de rango antes de llamar a la API; la API también valida (400), así que manejar ambos.
- **priority**: entero; documentar que un valor menor puede implicar mayor prioridad (o el orden que defina la spec 09), pero la UI solo lo captura y lista; la semántica de orden la aplica el evaluador (spec 09). No imponer aquí reglas de unicidad de priority.
- **value**: booleano que la regla aplica cuando coincide; representarlo como toggle On/Off.
- **Eliminar = limpieza**: como no hay edición in-place, la UI permite eliminar y recrear. Confirmar antes de borrar.
- **Cookie de sesión**: reenviar en server components; `credentials: 'include'` en cliente; 401 → `/login`.
- **Testing**: mockear `lib/api` (`getRules`, `createRule`, `deleteRule`). Cubrir camino feliz, validación y eliminación con confirmación. Probar el cambio de campos según `type`.
- **Datos de ejemplo**: el seed (spec 03) puede incluir reglas para `checkout_v2`; útil para pruebas manuales de listado.
