# Spec 05 — Login básico (usuario demo + sesión por cookie)

## 1. Objetivo

Implementar autenticación mínima para la herramienta interna: un **único usuario demo** con credenciales fijas (en config/env), **sesión por cookie firmada**, y un **middleware** que protege las rutas admin de la API y las páginas web. Los endpoints de evaluación (`/api/v1/flags/:key/evaluate` y `/api/v1/flags/evaluate-batch`) quedan **públicos** (sin auth), pensados para consumo en runtime.

Sin OAuth, sin SSO, sin roles ni permisos. Todo usuario autenticado tiene acceso total.

Cubre: **RF-20, RF-21, CA-07, CA-08**.

---

## 2. Contexto y dependencias

### Specs previas requeridas (deben estar implementadas)

- **Spec 01 (monorepo-setup):** monorepo pnpm workspaces con `apps/api` (Hono) y `apps/web`, TypeScript, tsconfig base. `apps/api` levanta Hono con `GET /health`.
- **Spec 02 (testing-setup):** Vitest configurado en `apps/api` con scripts `test`/`test:watch`.
- **Spec 03 (database-schema-and-seed):** `packages/db` con cliente Drizzle/libSQL. (No se requieren tablas nuevas para auth: las credenciales viven en config/env, no en DB.)

> Nota: esta spec se apoya en que la API de la spec 04 expone rutas admin bajo `/api/v1` (CRUD de flags/reglas, audit log). El middleware definido aquí debe envolver esas rutas. Si la spec 04 aún no está implementada, el middleware puede integrarse igualmente y aplicarse a las rutas admin cuando existan.

### Stack

- pnpm workspaces (sin Turborepo).
- `apps/api`: Hono (TypeScript). Para cookies firmadas usar los helpers de Hono (`hono/cookie`: `setSignedCookie`, `getSignedCookie`, `deleteCookie`).
- `apps/web`: Next.js (páginas/middleware de protección).
- Vitest para tests.

### Contrato de rutas (canónico)

- `POST /api/v1/auth/login` — body `{ "username": string, "password": string }` → 200 con cookie de sesión si las credenciales coinciden con las del config/env; 401 si no.
- `POST /api/v1/auth/logout` — borra la cookie de sesión. → 200.
- (Opcional pero recomendado) `GET /api/v1/auth/me` — 200 `{ "authenticated": true, "username": "..." }` si hay sesión válida; 401 si no.

### Configuración (credenciales y secreto)

Variables de entorno (con defaults solo para desarrollo, documentados):

- `DEMO_USERNAME` — usuario demo (p. ej. `admin`).
- `DEMO_PASSWORD` — contraseña demo.
- `SESSION_SECRET` — secreto para firmar la cookie (obligatorio en producción).
- `SESSION_COOKIE_NAME` — opcional, default `ff_session`.

---

## 3. Alcance

### In scope

- Endpoint `POST /api/v1/auth/login` que valida credenciales contra `DEMO_USERNAME`/`DEMO_PASSWORD` y, si coinciden, emite una **cookie de sesión firmada** (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` en producción).
- Endpoint `POST /api/v1/auth/logout` que borra la cookie.
- Endpoint opcional `GET /api/v1/auth/me` para comprobar sesión.
- Middleware Hono `requireAuth` que protege las rutas admin de la API (todo `/api/v1/**` **excepto** `/api/v1/auth/*` y `/api/v1/flags/**/evaluate*`). Responde 401 si no hay cookie válida.
- Protección de páginas web admin en `apps/web` (middleware Next.js o equivalente) que redirige a `/login` si no hay sesión.
- Página `/login` mínima en `apps/web` con formulario usuario/contraseña que llama a `POST /api/v1/auth/login`.
- Tests Vitest del flujo de auth y del comportamiento público de evaluate.

### Out of scope

- OAuth, SSO, recuperación de contraseña.
- Roles, permisos, RBAC.
- Múltiples usuarios o registro.
- Almacenar usuarios/sesiones en DB (la sesión es stateless vía cookie firmada).
- Lógica de evaluación o CRUD de flags (specs 04 y 09); aquí solo se protege/expone.

---

## 4. Tareas en orden

1. **Config de auth.** Leer `DEMO_USERNAME`, `DEMO_PASSWORD`, `SESSION_SECRET`, `SESSION_COOKIE_NAME` desde env con defaults de desarrollo documentados. Centralizar en un módulo de config de `apps/api`.

2. **Emisión de sesión.** Definir el contenido de la cookie de sesión (p. ej. payload `{ username, iat }`) firmado con `SESSION_SECRET` usando `setSignedCookie`. Atributos: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` cuando `NODE_ENV==='production'`, y un `maxAge` razonable (p. ej. 24 h).

3. **POST `/api/v1/auth/login`.** Validar body `{ username, password }`. Comparar contra config. Si coincide → `setSignedCookie` y responder 200 `{ "authenticated": true, "username": "..." }`. Si no → 401 `{ "error": "invalid_credentials" }`. No emitir cookie en fallo.

4. **POST `/api/v1/auth/logout`.** Borrar la cookie (`deleteCookie`) y responder 200.

5. **GET `/api/v1/auth/me` (opcional).** Leer y verificar la cookie firmada (`getSignedCookie`). 200 con `{ authenticated:true, username }` o 401.

6. **Middleware `requireAuth` (API).** Crear middleware Hono que: lee la cookie firmada; si es válida deja pasar; si no, responde 401 `{ "error": "unauthorized" }`. **Aplicarlo a las rutas admin** (`/api/v1/flags*`, `/api/v1/audit-log`, etc.) **excluyendo** explícitamente `/api/v1/auth/*` y cualquier ruta cuyo path termine en `/evaluate` o sea `/api/v1/flags/evaluate-batch`.

7. **Exclusión de evaluate.** Garantizar (por orden de montaje o por comprobación de path) que `GET /api/v1/flags/:key/evaluate` y `POST /api/v1/flags/evaluate-batch` **no** pasan por `requireAuth`.

8. **Protección web.** En `apps/web`, añadir middleware (Next.js `middleware.ts` o guard en layout) que verifique la presencia de sesión válida para rutas admin y redirija a `/login` cuando no exista. La página `/login` debe ser accesible sin sesión.

9. **Página `/login`.** Formulario mínimo (usuario, contraseña) que hace `POST /api/v1/auth/login` con credenciales y, en éxito, redirige al dashboard; en error muestra mensaje de credenciales inválidas.

10. **Tests Vitest.** Cubrir login ok/ko, logout, acceso a ruta admin sin/with cookie, y acceso público a evaluate (ver sección 5).

---

## 5. Criterios de aceptación verificables

Tests Vitest en `apps/api` usando `app.request(...)` de Hono, propagando la cookie `Set-Cookie` devuelta por login en peticiones posteriores.

- **CA-05.1 (login ok — RF-20):** `POST /api/v1/auth/login` con las credenciales correctas (`DEMO_USERNAME`/`DEMO_PASSWORD`) responde 200 e incluye un header `Set-Cookie` con la cookie de sesión (`HttpOnly`).
- **CA-05.2 (login ko — RF-20):** `POST /api/v1/auth/login` con contraseña incorrecta responde **401** y **no** incluye `Set-Cookie`.
- **CA-05.3 (ruta admin sin sesión — CA-07):** una petición a una ruta admin protegida (p. ej. `GET /api/v1/flags`) **sin** cookie responde **401**.
- **CA-05.4 (ruta admin con sesión — CA-07):** la misma petición **con** la cookie obtenida en login responde 200 (o el código normal del endpoint).
- **CA-05.5 (logout — RF-20):** tras `POST /api/v1/auth/logout`, reusar la cookie ya no da acceso (la cookie se borra/invalida) y una ruta admin vuelve a responder 401.
- **CA-05.6 (evaluate público — RF-21 / CA-08):** `GET /api/v1/flags/checkout_v2/evaluate?environment=production&user_id=u1` y `POST /api/v1/flags/evaluate-batch` responden **sin requerir cookie** (no devuelven 401 por falta de auth). _Nota: el comportamiento funcional de evaluate lo implementa la spec 09; aquí solo se verifica que el middleware **no** los bloquea._
- **CA-05.7 (cookie firmada — RF-20):** una cookie de sesión manipulada/no firmada con `SESSION_SECRET` es rechazada (ruta admin responde 401).
- **CA-05.8 (web redirige — CA-07):** acceder a una página admin de `apps/web` sin sesión redirige a `/login`.

---

## 6. Notas técnicas

- **Cookies firmadas en Hono:** usar `setSignedCookie(c, name, value, secret, options)` y `getSignedCookie(c, secret, name)` de `hono/cookie`. `getSignedCookie` devuelve `false` si la firma no valida, lo que facilita el rechazo en `requireAuth`.
- **Sin estado en servidor:** la sesión es stateless (todo va en la cookie firmada). No se persisten sesiones en DB. Para "invalidar" en logout basta con `deleteCookie`.
- **Orden de middleware:** montar `requireAuth` **después** de declarar las rutas públicas, o aplicarlo selectivamente por prefijo, de modo que `/api/v1/auth/*` y `/api/v1/flags/**/evaluate*` queden fuera. Verificar con tests CA-05.6.
- **Atributos de cookie:** `HttpOnly` siempre; `Secure` solo en producción (para permitir tests/local en http); `SameSite=Lax`; `Path=/`. Documentar `maxAge`.
- **Comparación de credenciales:** comparación directa contra env es suficiente para el MVP demo. Opcionalmente usar comparación en tiempo constante para evitar timing attacks (no obligatorio).
- **Secreto:** `SESSION_SECRET` debe ser obligatorio en producción; si falta, fallar al arrancar o usar un default solo en `NODE_ENV!=='production'` con warning.
- **Integración con spec 04:** el `requireAuth` envuelve las rutas CRUD de la spec 04. Si ambas specs se implementan juntas, aplicar el middleware al sub-router admin de `/api/v1` excluyendo `auth` y `evaluate`.
- **No introducir roles:** cualquier sesión válida = acceso total. No añadir checks de rol/permiso.
