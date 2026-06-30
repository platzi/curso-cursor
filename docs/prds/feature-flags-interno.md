# PRD: Herramienta interna de Feature Flags

**Versión:** 1.0  
**Estado:** Aprobado  
**Fecha:** 2026-06-30

---

## 1. Contexto y problema

Hoy, activar o desactivar una funcionalidad para una empresa concreta, un ambiente o un subconjunto de usuarios requiere un **deploy**. Eso genera:

- Latencia operativa (horas o días para cambios triviales).
- Riesgo innecesario al tocar producción por ajustes de visibilidad.
- Imposibilidad de hacer rollout gradual o rollback instantáneo.

El equipo necesita una **herramienta interna** que centralice la gestión de flags y permita cambiar su comportamiento en runtime, sin redeploy.

---

## 2. Objetivo

Entregar un MVP que permita:

1. Crear y gestionar feature flags desde una UI admin.
2. Definir reglas de targeting por **ambiente**, **empresa** y **porcentaje de tráfico**.
3. Evaluar flags en runtime vía API, con propagación efectiva en **menos de 1 minuto**.
4. Persistir todo en **SQLite local**, con audit log de cambios.

**Métrica de éxito del MVP:** un operador puede activar/desactivar una feature para una empresa en producción sin deploy, y el cambio se refleja en la app en < 1 min.

---

## 3. Público objetivo y usuarios

| Perfil | Descripción | Necesidad |
|--------|-------------|-----------|
| **Operador interno** | Dev, QA o PM del equipo | Activar/desactivar features sin deploy |
| **Desarrollador consumidor** | Integra el SDK en frontend | Evaluar flags en runtime con API estable |

**Autenticación:** login con **un único usuario demo** (credenciales fijas). Sin OAuth, sin roles, sin permisos granulares. Todo usuario autenticado tiene acceso total.

---

## 4. Alcance

### In scope (MVP)

- CRUD de feature flags (tipo `release` para UI).
- Reglas de targeting: `ambiente`, `empresa_id`, `% tráfico`.
- Evaluación en cascada: ambiente → empresa → % tráfico.
- API REST de evaluación + SDK ligero para frontend.
- UI admin para gestionar flags y reglas.
- Login demo (usuario/contraseña fijos).
- Audit log de cambios en SQLite.
- Ciclo de vida: `draft` → `active` → `deprecated` → `archived`.
- Cache local en el SDK (TTL 30–60 s).
- Política fail-closed/fail-open configurable por flag.

### Out of scope (explícito)

- OAuth / SSO.
- Roles y permisos (Viewer, Editor, Admin).
- Aprobaciones en dos pasos para producción.
- Feature flags **operational** en backend (fase 2).
- Segmentación avanzada (plan, país, rol, reglas AND/OR compuestas).
- Analytics de adopción o dashboard de métricas.
- Infra distribuida (Postgres, Redis, cloud DB).
- Enforcement automático de política de 90 días en prod.

---

## 5. Conceptos de dominio

### Feature Flag

Entidad que representa un interruptor de funcionalidad. Atributos clave:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `key` | string (único) | Identificador en código (ej. `checkout_v2`) |
| `name` | string | Nombre legible |
| `description` | string | Propósito de la flag |
| `type` | enum | `release` (MVP) |
| `status` | enum | `draft`, `active`, `deprecated`, `archived` |
| `default_value` | boolean | Valor cuando no aplica ninguna regla |
| `fail_mode` | enum | `fail_closed` (default) o `fail_open` |

Una flag en estado `archived` **no se evalúa** y siempre devuelve `false`.

### Targeting Rule

Regla que determina el valor de una flag para un contexto concreto. Tipos soportados en v1:

| Tipo | Parámetro | Ejemplo |
|------|-----------|---------|
| `environment` | `environment` ∈ {`development`, `staging`, `production`} | Flag ON solo en staging |
| `company` | `company_id` (string) | Flag ON para empresa `acme-corp` |
| `percentage` | `percentage` (0–100) | Flag ON para el 25% del tráfico |

Cada regla tiene: `flag_id`, `type`, parámetros, `value` (boolean), `priority` (entero).

### Evaluador (Flag Evaluator)

Componente que, dado un `flag_key` y un **contexto de evaluación**, devuelve `true` o `false`.

**Contexto de evaluación:**

```json
{
  "environment": "production",
  "company_id": "acme-corp",
  "user_id": "user-123"
}
```

**Algoritmo de evaluación (cascada):**

1. Si la flag está `archived` → `false`.
2. Si hay regla `environment` que coincide → usar su `value`.
3. Si hay regla `company` que coincide → usar su `value`.
4. Si hay regla `percentage` → `hash(user_id + flag_key) % 100 < percentage`.
5. Si ninguna regla aplica → `default_value`.
6. Si el servicio falla → aplicar `fail_mode` de la flag.

El hash por `user_id` garantiza que el mismo usuario siempre cae en el mismo bucket (stickiness).

---

## 6. Requerimientos funcionales

### Gestión de flags

**RF-01.** El sistema debe permitir crear una flag con `key`, `name`, `description`, `type`, `default_value` y `fail_mode`.

**RF-02.** El sistema debe validar que `key` sea único, alfanumérico con guiones bajos, y rechazar duplicados con error 409.

**RF-03.** El sistema debe permitir editar `name`, `description`, `default_value`, `fail_mode` y `status` de una flag existente.

**RF-04.** El sistema debe permitir listar todas las flags con filtro opcional por `status`.

**RF-05.** El sistema debe impedir eliminar una flag; solo transición a `archived`.

### Reglas de targeting

**RF-06.** El sistema debe permitir añadir una regla `environment` a una flag, indicando el ambiente y el valor booleano.

**RF-07.** El sistema debe permitir añadir una regla `company` a una flag, indicando `company_id` y el valor booleano.

**RF-08.** El sistema debe permitir añadir una regla `percentage` a una flag, con valor entre 0 y 100 inclusive.

**RF-09.** El sistema debe permitir eliminar una regla de targeting existente.

**RF-10.** El sistema debe listar todas las reglas asociadas a una flag.

### Evaluación

**RF-11.** El sistema debe exponer `GET /api/v1/flags/{key}/evaluate` que reciba `environment`, `company_id` y `user_id` como query params y devuelva `{ "key": "...", "value": true|false }`.

**RF-12.** El sistema debe exponer `POST /api/v1/flags/evaluate-batch` que reciba un array de keys y un contexto, y devuelva un mapa `key → value`.

**RF-13.** El evaluador debe aplicar la cascada definida en la sección 5 y respetar stickiness por `user_id`.

**RF-14.** Si la flag no existe, el evaluador debe devolver `false` (o el valor definido por `fail_mode` si el store no responde).

### UI Admin

**RF-15.** La UI debe mostrar un listado de flags con key, name, status y default_value.

**RF-16.** La UI debe permitir crear y editar flags desde un formulario.

**RF-17.** La UI debe mostrar y gestionar las reglas de targeting de cada flag.

**RF-18.** La UI debe permitir cambiar el `status` de una flag (draft → active → deprecated → archived).

**RF-19.** La UI debe mostrar el audit log de cambios (timestamp, flag afectada, campo, valor anterior, valor nuevo).

### Autenticación

**RF-20.** La UI y la API admin deben requerir autenticación con usuario demo (credenciales fijas en configuración).

**RF-21.** El endpoint de evaluación (`/evaluate`, `/evaluate-batch`) **no requiere autenticación** (pensado para consumo del SDK en runtime).

### Audit log

**RF-22.** Toda creación, edición o eliminación de flag o regla debe registrarse en el audit log con: timestamp, entidad, acción, valor anterior, valor nuevo.

---

## 7. Requerimientos no funcionales

**RNF-01. Persistencia:** todos los datos en SQLite local; un único archivo `.db` en el servidor.

**RNF-02. Propagación:** un cambio en la UI admin debe ser evaluable por la API en **< 60 segundos** sin reiniciar el servicio.

**RNF-03. Cache SDK:** el SDK debe cachear respuestas con TTL configurable (default 30 s).

**RNF-04. Latencia API:** `evaluate` y `evaluate-batch` (≤ 20 flags) deben responder en **< 100 ms** p99 en condiciones normales.

**RNF-05. Disponibilidad:** si SQLite no responde, el evaluador aplica `fail_mode` por flag; no devuelve 500 genérico sin valor.

**RNF-06. Tipado:** las `key` de flags deben poder exportarse como constantes tipadas para uso en código (ej. archivo generado o enum manual documentado).

**RNF-07. Audit log:** append-only; no editable ni eliminable desde la UI.

---

## 8. Criterios de aceptación del MVP

| ID | Criterio | Verificación |
|----|----------|--------------|
| CA-01 | Crear flag `checkout_v2` con default `false` y status `draft` | POST exitoso; aparece en listado |
| CA-02 | Añadir regla `environment=staging, value=true` a `checkout_v2` | Regla visible en UI; evaluate en staging devuelve `true` |
| CA-03 | Añadir regla `company_id=acme, value=true` | Evaluate con `company_id=acme` devuelve `true`; otra empresa devuelve `false` |
| CA-04 | Añadir regla `percentage=50` | 50% de user_ids distintos reciben `true` de forma consistente en llamadas repetidas |
| CA-05 | Cambiar status a `active` sin deploy | Evaluate refleja el cambio en < 60 s |
| CA-06 | Archivar flag | Evaluate siempre devuelve `false` |
| CA-07 | Login demo requerido en UI admin | Acceso sin credenciales redirige a login |
| CA-08 | Evaluate sin auth | SDK puede llamar evaluate sin token |
| CA-09 | Audit log registra cambio | Editar default_value genera entrada con old/new value |
| CA-10 | Fail-closed ante error de DB | Simular fallo SQLite → flags con `fail_mode=fail_closed` devuelven `false` |

---

## 9. Riesgos y supuestos

### Supuestos

- Existe un `company_id` estable en el producto, reutilizable como identificador de tenant.
- Existe un `user_id` estable para calcular el hash de percentage rollout.
- El volumen de flags en v1 es bajo (< 100); SQLite es suficiente.
- Un único operador (usuario demo) es aceptable para el MVP interno.
- Los nombres de flags se acuerdan en código antes de crearlos en la herramienta.

### Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Sin RBAC, cualquier persona con credenciales demo puede cambiar prod | Alto | MVP interno; credenciales no públicas; audit log |
| SQLite no escala con concurrencia alta | Medio | Aceptable en v1; evaluación con cache en SDK |
| Flags huérfanas en código tras archivar | Medio | Política documental de limpieza; status `deprecated` con aviso en UI |
| Stickiness de percentage depende de `user_id` estable | Bajo | Documentar que cambios de user_id pueden mover al usuario de bucket |
| Propagación > 60 s por cache agresivo en SDK | Bajo | TTL default 30 s; invalidación manual documentada |

---

## Apéndice: modelo de datos (referencia)

```
flags
  id, key, name, description, type, status, default_value, fail_mode, created_at, updated_at

targeting_rules
  id, flag_id, type, environment?, company_id?, percentage?, value, priority, created_at

audit_log
  id, entity_type, entity_id, action, field, old_value, new_value, timestamp
```
