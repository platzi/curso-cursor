# Spec 10 — Simulador de evaluación

## 1. Objetivo

Construir en `apps/web` (Next.js + Tailwind) una página de **simulador** que permita introducir un **contexto de evaluación** (`environment`, `company_id`, `user_id`) y consultar el resultado de las flags llamando a los endpoints `GET /flags/:key/evaluate` y/o `POST /flags/evaluate-batch`, mostrando el valor resultante por flag. Si la API expone qué regla aplicó, indicarlo; si no, mostrar solo el valor.

Cubre la **evaluación desde la UI** y los criterios **CA-02..CA-04** (verificar desde la interfaz que las reglas environment/company/percentage producen los resultados esperados).

> Esta spec **NO** modifica el evaluador (eso es la spec 09); solo lo consume desde la UI.

## 2. Contexto y dependencias

### Specs previas requeridas (deben estar implementadas)

- **09 — Flag evaluator**: el evaluador y los endpoints `GET /api/v1/flags/:key/evaluate` y `POST /api/v1/flags/evaluate-batch` ya existen y aplican la cascada (archived → environment → company → percentage → default) con stickiness por `user_id`. Esta spec **depende de la 09**.
- Para listar las flags a simular: **06 — Dashboard list** (helper `apiFetch`/`getFlags` y tipo `Flag`).
- Transitivamente: **01** (monorepo + Next + Tailwind), **02** (Vitest + testing de componentes), **03** (seed con `checkout_v2` y reglas), **05** (login + sesión por cookie para páginas admin).

### Modelo de datos / contexto de evaluación

```ts
type Environment = 'development' | 'staging' | 'production';

interface EvalContext {
  environment: Environment;
  company_id?: string;
  user_id?: string;
}
```

### Endpoints que consume (base `/api/v1`)

- **Evaluación individual**: `GET /api/v1/flags/:key/evaluate?environment=&company_id=&user_id=`
  - Respuesta: `{ key: string, value: boolean }`.
  - Nota: este endpoint **no requiere autenticación** (pensado para SDK en runtime, RF-21), pero la página del simulador sí es admin (requiere sesión).
- **Evaluación en lote**: `POST /api/v1/flags/evaluate-batch`
  - Body: `{ keys: string[], context: { environment, company_id, user_id } }`.
  - Respuesta: `{ [key: string]: boolean }`.
- (Para obtener las keys disponibles) `GET /api/v1/flags` → `Flag[]`.

> El contrato base de `evaluate` devuelve solo `{ key, value }` y el de batch `{ [key]: boolean }` (sin detalle de regla). La indicación de "qué regla aplicó" es **opcional** y solo se mostrará si la API la expone (ver Notas técnicas). El simulador no debe asumir su existencia.

### Autenticación

Página admin: requiere sesión por cookie (spec 05). Aunque el endpoint `evaluate` sea público, la página del simulador se sirve dentro del área admin; reenviar cookie en server components y `credentials: 'include'` en cliente.

## 3. Alcance

### In scope

- Ruta `/simulator` con un formulario de contexto: selector `environment` (development/staging/production), input `company_id` (opcional), input `user_id` (opcional).
- Botón "Simular" que ejecuta la evaluación para las flags y muestra el resultado por flag (`true`/`false`) de forma legible (chip On/Off).
- Estrategia de evaluación: por defecto usar `POST /evaluate-batch` con las `keys` de todas las flags (obtenidas de `GET /flags`) y el contexto introducido, mostrando el mapa resultante. Soportar además evaluación individual de una `key` concreta vía `GET /flags/:key/evaluate` (p. ej. un campo para evaluar una sola flag).
- Mostrar el contexto usado junto a los resultados (para trazabilidad de la simulación).
- Si la API incluye metadatos de regla aplicada, mostrarlos por flag; si no, omitir esa columna.
- Estados de carga, vacío (sin flags) y error.
- Estilado Tailwind.

### Out of scope

- Implementar o modificar el algoritmo de evaluación, la cascada o el stickiness (spec 09).
- Crear/editar flags (spec 07) o reglas (spec 08).
- Persistir simulaciones / historial de simulaciones.
- SDK / cache TTL (fase 2, no aplica en esta iteración: el simulador llama al endpoint directo).

## 4. Tareas en orden

1. **Extender el helper de API** (`apps/web/src/lib/api.ts`):
   - `evaluateFlag(key, context)` → `GET /flags/:key/evaluate` con query `environment`, `company_id`, `user_id` (omitir los vacíos) → `{ key, value }`.
   - `evaluateBatch(keys, context)` → `POST /flags/evaluate-batch` body `{ keys, context }` → `Record<string, boolean>`.
   - Reutilizar `getFlags()` (spec 06) para obtener las keys disponibles.
2. **Tipos**: `EvalContext`, `EvaluateResult = { key: string; value: boolean }`, `BatchResult = Record<string, boolean>`. Si se añade detalle de regla opcional, tiparlo como campo opcional (ver Notas).
3. **Formulario de contexto** `SimulatorForm`: selector `environment` + inputs `company_id`/`user_id` (controlados). Validación mínima: `environment` requerido (los otros opcionales).
4. **Ejecución**: al enviar, llamar `evaluateBatch` con las keys de las flags y el contexto; renderizar resultados. Permitir también evaluar una sola flag con `evaluateFlag`.
5. **Tabla de resultados** `SimulationResults`: por flag, mostrar `key` y `value` (chip On/Off). Columna opcional de "regla aplicada" solo si los datos la incluyen.
6. **Estados y estilado**: carga, vacío, error; Tailwind; mostrar el contexto evaluado.
7. **Enlace**: añadir entrada de navegación al simulador desde el área admin.
8. **Tests (Vitest)**: ver criterios de aceptación. Mockear el helper de API.
9. **Verificación**: `pnpm --filter web test` en verde y `pnpm --filter web build` compila.

## 5. Criterios de aceptación verificables

- **CA-10.1 (envío de contexto en batch)**: completar `environment=staging`, `company_id=acme-corp`, `user_id=user-123` y pulsar Simular llama a `evaluateBatch(keys, { environment:'staging', company_id:'acme-corp', user_id:'user-123' })` con las keys de las flags. Test de componente verificando el payload.
- **CA-10.2 (render de resultados)**: dado un mock de `evaluateBatch` que devuelve `{ checkout_v2: true }`, la tabla muestra la flag `checkout_v2` con resultado On/true. Test de componente.
- **CA-10.3 (environment=staging → true, CA-02 desde UI)**: con una flag que tiene regla `environment=staging, value=true`, simular con `environment=staging` muestra `true` y con `environment=production` (sin otras reglas) muestra el `default_value`. Verificable con mocks que reflejen el comportamiento del evaluador (los valores los produce la API de spec 09).
- **CA-10.4 (company → true/false, CA-03 desde UI)**: simular con `company_id=acme-corp` muestra `true` para la flag con regla company=acme; con otro `company_id` muestra `false`/default. Test de componente con mocks.
- **CA-10.5 (percentage consistente, CA-04 desde UI)**: evaluar repetidamente el mismo `user_id` para una flag con regla `percentage` devuelve siempre el mismo resultado (stickiness). El simulador refleja el valor devuelto sin alterarlo; test verifica que el mismo input produce el mismo render (la consistencia real la garantiza spec 09).
- **CA-10.6 (evaluación individual)**: usar el modo de evaluar una sola `key` llama a `evaluateFlag(key, context)` con los query params correctos (omitiendo los vacíos). Test de componente.
- **CA-10.7 (query params vacíos omitidos)**: si `company_id` y `user_id` están vacíos, la llamada no incluye esos params/los envía vacíos según se documente; preferible omitirlos. Test unitario del helper o de componente.
- **CA-10.8 (estado de error)**: si la evaluación falla, se muestra mensaje de error. Test de componente.
- **CA-10.9 (build/tipos)**: `pnpm --filter web build` compila sin `any`. Verificación CI/manual.

## 6. Notas técnicas

- **Detalle de regla aplicada (opcional)**: el contrato canónico de `evaluate` es `{ key, value }` y el de batch `{ [key]: boolean }` — **no** incluyen qué regla aplicó. Si en la implementación de la spec 09 se decide enriquecer la respuesta (p. ej. `{ key, value, matched_rule? }`), el simulador puede mostrar esa columna; de lo contrario, no asumir su existencia y mostrar solo el valor. Tipar el campo extra como opcional.
- **Batch vs individual**: el modo por defecto es batch (una sola llamada para todas las flags). El individual es útil para depurar una flag concreta. Ambos usan el mismo contexto.
- **Omitir params vacíos**: en `evaluateFlag`, construir el query string omitiendo `company_id`/`user_id` cuando estén vacíos para no enviar cadenas vacías que puedan confundir al evaluador.
- **Página admin vs endpoint público**: el endpoint `evaluate` no exige auth (RF-21), pero la página del simulador vive en el área admin (requiere sesión). Mantener coherencia: reenviar cookie/`credentials: 'include'` aunque el endpoint no lo exija.
- **No alterar resultados**: el simulador solo muestra lo que devuelve la API; no aplica lógica de cascada ni stickiness por su cuenta. La verificación de CA-02..CA-04 a nivel de algoritmo vive en la spec 09; aquí se verifica que la UI envía el contexto correcto y refleja fielmente la respuesta.
- **Testing**: mockear `evaluateBatch`, `evaluateFlag` y `getFlags`. Probar payloads, render de resultados, omisión de params vacíos y estado de error.
