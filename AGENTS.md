# Feature Flags Dashboard

Herramienta interna para activar/desactivar features por **ambiente**, **empresa** y **porcentaje de tráfico**, sin redeploy. Incluye UI de gestión, API de evaluación y audit log. Login de usuario demo (sin OAuth/roles en esta iteración).

## Usuario demo

Credenciales fijas para desarrollo (configurables por env):

| Variable | Default |
|----------|---------|
| `DEMO_USERNAME` | `admin` |
| `DEMO_PASSWORD` | `demo123` |

Tras `pnpm --filter @ff/db db:seed`, el script imprime las credenciales activas. Copia `.env.example` a `.env` y ajusta `SESSION_SECRET` antes de producción.

## Stack

Monorepo **pnpm** (sin Turborepo) en TypeScript estricto.

- **apps/web** (`@ff/web`): Next.js (App Router) + Tailwind CSS.
- **apps/api** (`@ff/api`): Hono. Rutas `/api/v1/`*, auth y audit log.
- **packages/db** (`@ff/db`): Drizzle ORM + SQLite/libSQL.
- **packages/domain** (`@ff/domain`): tipos compartidos y lógica pura (evaluador de flags).

Separación de responsabilidades y reglas de dependencia: ver `.cursor/rules/monorepo-architecture.mdc`.

