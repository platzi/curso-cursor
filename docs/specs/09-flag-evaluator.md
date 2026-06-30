# Spec 09 — Flag Evaluator (función pura + endpoints evaluate)

## 1. Objetivo

Implementar el **evaluador de flags** como una **función pura** en `packages/domain` que, dado el estado de una flag (con sus reglas) y un contexto de evaluación, devuelve un booleano siguiendo la **cascada del PRD**. Sobre esa función, exponer en `apps/api` los endpoints:

- `GET /api/v1/flags/:key/evaluate`
- `POST /api/v1/flags/evaluate-batch`

Ambos endpoints son **públicos** (la spec 05 los excluye del middleware de auth). El evaluador debe respetar **stickiness** por `user_id` y aplicar `fail_mode` cuando el store falla.

Cubre: **RF-11, RF-12, RF-13, RF-14, RNF-05, CA-02, CA-03, CA-04, CA-05, CA-06, CA-10**.

---

## 2. Contexto y dependencias

### Specs previas requeridas (deben estar implementadas)

- **Spec 01 (monorepo-setup):** monorepo pnpm con `apps/api` (Hono), `packages/domain` (lógica pura), `packages/db`, TypeScript.
- **Spec 02 (testing-setup):** Vitest en `packages/domain` y `apps/api` con scripts `test`/`test:watch`.
- **Spec 03 (database-schema-and-seed):** `packages/db` con schema de `flags` y `targeting_rules`, cliente Drizzle/libSQL y helper de conexión. Seed con `checkout_v2` y reglas de ejemplo disponible.
- **Spec 04 (api-feature-flags):** CRUD de flags/reglas operativo; la lectura de una flag por `key` y de sus reglas usa el mismo modelo de datos. El evaluador lee de la DB (vía repos/helpers existentes o queries propias).

### Stack

- pnpm workspaces (sin Turborepo).
- `packages/domain`: función pura de evaluación (sin I/O, sin acceso a DB). 100% testeable de forma aislada.
- `apps/api`: Hono; endpoints que cargan datos de `packages/db` y delegan en la función pura.
- Vitest para tests.
- Sin SDK en esta iteración.

### Modelo de datos relevante (contrato canónico — definido en spec 03)

Flag:

```ts
type Flag = {
  id: string;
  key: string;          // alfanumérico + guion bajo
  name: string;
  description: string;
  type: 'release';
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  default_value: boolean;
  fail_mode: 'fail_closed' | 'fail_open';
  created_at: string;
  updated_at: string;
};
```

Regla de targeting:

```ts
type TargetingRule = {
  id: string;
  flag_id: string;
  type: 'environment' | 'company' | 'percentage';
  environment: 'development' | 'staging' | 'production' | null;
  company_id: string | null;
  percentage: number | null; // 0..100
  value: boolean;
  priority: number;
  created_at: string;
};
```

Contexto de evaluación:

```ts
type EvalContext = {
  environment?: 'development' | 'staging' | 'production';
  company_id?: string;
  user_id?: string;
};
```

### Algoritmo de cascada (del PRD, sección 5)

Dada una flag y sus reglas, en orden:

1. Si la flag está `archived` → `false`.
2. Si existe una regla `environment` que **coincide** con `context.environment` → usar su `value`.
3. Si existe una regla `company` que **coincide** con `context.company_id` → usar su `value`.
4. Si existe una regla `percentage` → `hash(user_id + flag_key) % 100 < percentage` ? `value` aplicado : continuar/según diseño (ver Notas). El mismo `user_id` cae siempre en el mismo bucket (stickiness).
5. Si ninguna regla aplica → `default_value`.
6. Si el **store falla** (no se puede leer la flag/reglas) → aplicar `fail_mode` de la flag (`fail_closed` → `false`, `fail_open` → `true`).
7. Si la **flag no existe** → `false`.

> Desempate entre reglas del mismo tipo: usar `priority` (menor primero) y, a igualdad, `created_at`. Documentar la elección. La cascada por **tipo** (environment → company → percentage) es la del PRD y tiene prioridad sobre el orden interno.

### Contrato de endpoints (canónico)

- `GET /api/v1/flags/:key/evaluate?environment=&company_id=&user_id=`
  → 200 `{ "key": "checkout_v2", "value": true }`
- `POST /api/v1/flags/evaluate-batch`
  body `{ "keys": ["checkout_v2","search_v2"], "context": { "environment":"production", "company_id":"acme", "user_id":"u1" } }`
  → 200 mapa `{ "checkout_v2": true, "search_v2": false }`

---

## 3. Alcance

### In scope

- Función pura `evaluateFlag(flag, rules, context): boolean` en `packages/domain` (sin I/O). Determinista y sin efectos secundarios.
- Función auxiliar de hash estable para stickiness (`hashToBucket(user_id, flag_key): number` en rango 0–99 o 0–(100) según diseño documentado).
- Manejo de flag inexistente (→ `false`) y de fallo del store (→ `fail_mode`). Para el caso "store falla" debe existir una vía que reciba el `fail_mode` aplicable; si la flag ni siquiera pudo leerse, el comportamiento por defecto es `false` (fail-closed) salvo que se conozca el `fail_mode`.
- Endpoint `GET /api/v1/flags/:key/evaluate` que carga flag+reglas de la DB y devuelve `{ key, value }`.
- Endpoint `POST /api/v1/flags/evaluate-batch` que evalúa varias keys con un contexto común y devuelve un mapa `{ key: value }`.
- Aplicación de `fail_mode` ante error de DB en los endpoints (sin devolver 500 genérico sin valor — RNF-05).
- Tests unitarios de cascada, stickiness y fail-closed (DB simulada que falla).

### Out of scope

- CRUD de flags/reglas (spec 04).
- Autenticación/middleware (spec 05); estos endpoints son públicos.
- UI / simulador (spec 10).
- Cache/TTL del SDK (fase 2, no implementado).
- Reglas compuestas AND/OR o segmentación avanzada.

---

## 4. Tareas en orden

1. **Tipos compartidos.** Asegurar/definir en `packages/domain` los tipos `Flag`, `TargetingRule`, `EvalContext` (alineados al modelo de spec 03).

2. **Hash estable.** Implementar `hashToBucket(input: string): number` determinista (p. ej. FNV-1a o djb2 sobre `user_id + flag_key`) que devuelva un entero en `[0, 100)`. Debe ser puro y estable entre ejecuciones/procesos. Documentar el algoritmo elegido.

3. **Función pura `evaluateFlag`.** Firma `evaluateFlag(flag: Flag | null, rules: TargetingRule[], context: EvalContext): boolean`. Implementar la cascada:
   - `flag === null` → `false`.
   - `flag.status === 'archived'` → `false`.
   - Buscar regla `environment` que coincida con `context.environment` (respetando orden por `priority`); si existe → devolver su `value`.
   - Buscar regla `company` que coincida con `context.company_id`; si existe → devolver su `value`.
   - Buscar regla `percentage`; si existe → calcular `bucket = hashToBucket((context.user_id ?? '') + flag.key)`; si `bucket < rule.percentage` → devolver `rule.value`; (si no, ver Notas para el fall-through).
   - Si nada aplica → `flag.default_value`.

4. **Helper de fail_mode.** `applyFailMode(failMode): boolean` → `fail_open ? true : false`. Usado por los endpoints cuando la lectura de DB lanza error.

5. **Endpoint GET evaluate.** `GET /api/v1/flags/:key/evaluate`. Leer query params `environment`, `company_id`, `user_id`. Cargar la flag por `key` y sus reglas desde la DB. Si la flag no existe → `{ key, value:false }` (200). Llamar `evaluateFlag` y responder `{ key, value }`. Si la lectura de DB falla → intentar aplicar `fail_mode` de la flag si se conoce; si no, `false`. Nunca 500 sin valor.

6. **Endpoint POST evaluate-batch.** `POST /api/v1/flags/evaluate-batch` con body `{ keys, context }`. Para cada key, evaluar (reutilizando la lógica del endpoint individual) y construir el mapa `{ key: value }`. Keys inexistentes → `false`. Responder 200 con el mapa. Aplicar `fail_mode` por flag ante fallo de DB.

7. **Tests Vitest.** En `packages/domain` (función pura) y en `apps/api` (endpoints, incluido fail-closed con DB simulada). Ver sección 5.

---

## 5. Criterios de aceptación verificables

### Tests unitarios de la función pura (`packages/domain`)

- **CA-09.1 (archived → false — CA-06):** `evaluateFlag` con `flag.status='archived'` devuelve `false`, **ignorando** cualquier regla y el `default_value`.
- **CA-09.2 (regla environment — CA-02):** flag con regla `{ type:'environment', environment:'staging', value:true }`; evaluar con `context.environment='staging'` → `true`; con `environment='production'` (sin otra regla) → `default_value`.
- **CA-09.3 (regla company — CA-03):** flag con regla `{ type:'company', company_id:'acme', value:true }`; evaluar con `company_id='acme'` → `true`; con `company_id='other'` → `default_value` (asumiendo sin otras reglas).
- **CA-09.4 (cascada de precedencia):** con reglas `environment` (no coincide) y `company` (coincide), devuelve el `value` de la regla `company`. Con `environment` que coincide y `company` que coincide, gana `environment` (orden de cascada del PRD).
- **CA-09.5 (default — CA-05 implícito):** sin reglas que apliquen, devuelve `flag.default_value` (probar `true` y `false`).
- **CA-09.6 (stickiness — RF-13 / CA-04):** para una regla `{ type:'percentage', percentage:50, value:true }`, evaluar el **mismo** `user_id` muchas veces devuelve **siempre** el mismo resultado (determinismo).
- **CA-09.7 (distribución ~50% — CA-04):** evaluar la regla `percentage=50` sobre un conjunto grande de `user_id` distintos (p. ej. 1000) produce una proporción de `true` cercana al 50% dentro de un margen razonable (p. ej. ±5–7 puntos).
- **CA-09.8 (flag inexistente — RF-14):** `evaluateFlag(null, [], ctx)` devuelve `false`.

### Tests de endpoints (`apps/api`) con `app.request(...)`

- **CA-09.9 (GET evaluate — RF-11):** sembrando `checkout_v2` (default `false`) con regla `environment=staging,value=true`, `GET /api/v1/flags/checkout_v2/evaluate?environment=staging&user_id=u1` responde 200 `{ "key":"checkout_v2", "value":true }`; con `environment=production` → `{ value:false }`.
- **CA-09.10 (batch — RF-12):** `POST /api/v1/flags/evaluate-batch` con `{ keys:["checkout_v2","no_existe"], context:{ environment:"staging", user_id:"u1" } }` responde 200 con un mapa que incluye `"checkout_v2":true` y `"no_existe":false`.
- **CA-09.11 (cambio sin redeploy — CA-05):** crear/activar/archivar una flag vía DB y volver a llamar evaluate refleja el nuevo estado sin reiniciar el servicio (el endpoint lee el estado actual en cada llamada).
- **CA-09.12 (fail-closed — RNF-05 / CA-10):** simulando que la lectura de DB **lanza un error** (mock/stub del cliente o helper de `packages/db`), para una flag con `fail_mode='fail_closed'` el endpoint devuelve `value:false` con **200** (no 500). Verificar también que con `fail_mode='fail_open'` devolvería `true`.
- **CA-09.13 (evaluate público — alineado con spec 05):** los endpoints evaluate responden sin requerir cookie de sesión.

---

## 6. Notas técnicas

- **Pureza:** `evaluateFlag` no debe acceder a DB, red, reloj ni aleatoriedad. Todo lo necesario llega por parámetros. Esto la hace 100% testeable y es lo que permite los tests de stickiness sin I/O.
- **Hash y stickiness:** la entrada del hash debe ser `user_id + flag_key` (concatenación documentada, p. ej. `${user_id}:${flag_key}`) para que el mismo usuario tenga buckets distintos por flag pero estable por (usuario, flag). Algoritmo recomendado: FNV-1a 32-bit → `>>> 0` → `% 100`. Sin `Math.random()`.
- **Fall-through de percentage:** decidir y documentar el comportamiento cuando `bucket >= percentage`. Opción recomendada y alineada al PRD: si el bucket **no** entra en el porcentaje, la regla `percentage` **no aplica** y se cae a `default_value` (el paso 5). Mantener la decisión consistente entre función y tests.
- **`user_id` ausente:** si no hay `user_id` y existe regla `percentage`, usar string vacío en el hash (determinista). Documentarlo; el resultado será consistente pero todos los contextos sin `user_id` caen en el mismo bucket.
- **Fail mode en endpoints:** el evaluador puro no conoce fallos de I/O; el manejo de errores de DB vive en los endpoints (`apps/api`). Ante excepción al leer: si ya se cargó la flag, aplicar su `fail_mode`; si no se pudo leer la flag, devolver `false` (fail-closed por defecto). Nunca propagar 500 sin valor (RNF-05).
- **Lectura siempre fresca:** los endpoints leen el estado actual de la DB en cada petición (sin cache en servidor en esta iteración), garantizando propagación < 60 s (RNF-02) y soportando CA-05/CA-09.11.
- **Booleans:** respetar el mapeo de SQLite definido en spec 03; exponer siempre `true`/`false` JSON en las respuestas.
- **Público sin auth:** estos endpoints quedan fuera del middleware `requireAuth` de la spec 05 (`/evaluate` y `/evaluate-batch`). No añadir comprobaciones de sesión aquí.
- **Tests de fallo de DB:** para CA-09.12, inyectar/stubbear el helper de conexión o el repo de lectura para que lance, sin depender de romper físicamente el archivo `.db`.
