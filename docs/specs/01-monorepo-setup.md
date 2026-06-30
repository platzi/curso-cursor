# Spec 01 — Configuración del monorepo

## 1. Objetivo

Establecer la estructura base del monorepo para la herramienta interna de feature flags: un workspace de **pnpm** (sin Turborepo) con dos aplicaciones (`apps/web`, `apps/api`) y dos paquetes compartidos (`packages/db`, `packages/domain`), todo en TypeScript. Al finalizar, el proyecto debe instalarse, compilar todos los workspaces, servir una página vacía en la web y responder a `GET /health` en la API.

Esta spec **no** implementa lógica de negocio, base de datos ni tests; solo deja el esqueleto listo para que las specs siguientes (02 testing, 03 base de datos, etc.) construyan sobre él.

## 2. Contexto y dependencias

- **Specs previas requeridas:** ninguna. Esta es la primera spec; parte de un repositorio vacío (o casi vacío) en la raíz `/home/toro/Code/curso-cursor`.
- **Gestor de paquetes:** pnpm con workspaces. NO se usa Turborepo.
- **Stack global del proyecto** (referencia para nombrar correctamente las carpetas, aunque su contenido funcional llega en specs posteriores):
  - `apps/web`: Next.js (App Router) + Tailwind CSS.
  - `apps/api`: Hono (servidor HTTP).
  - `packages/db`: Drizzle ORM + SQLite/libSQL (se implementa en spec 03).
  - `packages/domain`: tipos y lógica pura, sin dependencias de framework (se llena en specs posteriores).
- **No hay SDK** en esta iteración.
- Versión de Node recomendada: 20 LTS o superior. Versión de pnpm: 9 o superior.

## 3. Alcance

### In scope
- `pnpm-workspace.yaml` declarando `apps/*` y `packages/*`.
- `package.json` raíz con scripts agregados (`dev`, `build`, `lint`) usando `pnpm -r`.
- `tsconfig.base.json` en la raíz con la configuración TypeScript compartida.
- Las 4 carpetas con su propio `package.json` y `tsconfig.json` que extiende del base:
  - `apps/web` (Next.js + Tailwind CSS, página raíz vacía).
  - `apps/api` (Hono con endpoint `GET /health`).
  - `packages/db` (paquete vacío exportable, placeholder).
  - `packages/domain` (paquete vacío exportable, placeholder).
- `.gitignore` razonable (node_modules, build outputs, `*.db`).

### Out of scope
- Configuración de Vitest y tests (spec 02).
- Esquema de base de datos, Drizzle, migraciones y seed (spec 03).
- Endpoints CRUD, autenticación, evaluador, UI de gestión (specs 04+).
- CI/CD, Docker, despliegue.

## 4. Tareas en orden

1. **Inicializar pnpm workspace en la raíz.**
   - Crear `pnpm-workspace.yaml`:
     ```yaml
     packages:
       - "apps/*"
       - "packages/*"
     ```
2. **Crear `package.json` raíz** (privado) con scripts agregados:
   ```json
   {
     "name": "feature-flags-monorepo",
     "private": true,
     "scripts": {
       "build": "pnpm -r build",
       "dev": "pnpm -r dev",
       "lint": "pnpm -r lint"
     },
     "devDependencies": {
       "typescript": "^5.4.0"
     }
   }
   ```
3. **Crear `tsconfig.base.json`** en la raíz con configuración estricta compartida:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "Bundler",
       "lib": ["ES2022", "DOM", "DOM.Iterable"],
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "declaration": true,
       "noEmit": false
     }
   }
   ```
4. **Crear `packages/domain`** (placeholder de lógica pura):
   - `packages/domain/package.json` con `name: "@ff/domain"`, `type: "module"`, `main`/`types` apuntando a `dist/`, script `build: "tsc -p tsconfig.json"`.
   - `packages/domain/tsconfig.json` extendiendo `../../tsconfig.base.json` con `outDir: "dist"`, `rootDir: "src"`.
   - `packages/domain/src/index.ts` con un export trivial, p. ej. `export const DOMAIN_PACKAGE = "@ff/domain";`.
5. **Crear `packages/db`** (placeholder de base de datos):
   - `packages/db/package.json` con `name: "@ff/db"`, `type: "module"`, `main`/`types` apuntando a `dist/`, script `build: "tsc -p tsconfig.json"`.
   - `packages/db/tsconfig.json` extendiendo el base con `outDir: "dist"`, `rootDir: "src"`.
   - `packages/db/src/index.ts` con export trivial, p. ej. `export const DB_PACKAGE = "@ff/db";`.
6. **Crear `apps/api` (Hono):**
   - `apps/api/package.json` con `name: "@ff/api"`, `type: "module"`, dependencias `hono` y `@hono/node-server`, devDependency `tsx`. Scripts:
     - `dev: "tsx watch src/index.ts"`
     - `build: "tsc -p tsconfig.json"`
     - `start: "node dist/index.js"`
   - `apps/api/tsconfig.json` extendiendo el base con `outDir: "dist"`, `rootDir: "src"`.
   - `apps/api/src/index.ts`: crear la app Hono, registrar `GET /health` que devuelva `{ "status": "ok" }`, y arrancar el servidor con `@hono/node-server` en el puerto `3001` (configurable vía `process.env.PORT`).
     ```ts
     import { Hono } from "hono";
     import { serve } from "@hono/node-server";

     export const app = new Hono();

     app.get("/health", (c) => c.json({ status: "ok" }));

     const port = Number(process.env.PORT ?? 3001);
     serve({ fetch: app.fetch, port });
     console.log(`API escuchando en http://localhost:${port}`);
     ```
7. **Crear `apps/web` (Next.js + Tailwind):**
   - `apps/web/package.json` con `name: "@ff/web"`, dependencias `next`, `react`, `react-dom`; devDependencies `tailwindcss`, `postcss`, `autoprefixer`, `typescript`, `@types/react`, `@types/node`. Scripts:
     - `dev: "next dev -p 3000"`
     - `build: "next build"`
     - `start: "next start -p 3000"`
     - `lint: "next lint"`
   - `apps/web/tsconfig.json` con la configuración estándar de Next.js (puede extender del base o usar la generada por Next; debe incluir `jsx: "preserve"` y el plugin de Next).
   - Configurar Tailwind:
     - `apps/web/tailwind.config.ts` con `content: ["./app/**/*.{ts,tsx}"]`.
     - `apps/web/postcss.config.js` con plugins `tailwindcss` y `autoprefixer`.
     - `apps/web/app/globals.css` con las directivas `@tailwind base; @tailwind components; @tailwind utilities;`.
   - App Router mínimo:
     - `apps/web/app/layout.tsx` que importe `globals.css` y renderice `{children}` dentro de `<html><body>`.
     - `apps/web/app/page.tsx` que renderice una página intencionalmente vacía (p. ej. un `<main className="min-h-screen" />` o un texto placeholder). El objetivo es que la web levante sin errores.
8. **Crear `.gitignore`** en la raíz incluyendo al menos: `node_modules/`, `dist/`, `.next/`, `*.db`, `*.db-journal`, `.env`, `.env.local`.
9. **Instalar dependencias** desde la raíz: `pnpm install`.
10. **Verificar build** de todos los workspaces: `pnpm -r build`.

## 5. Criterios de aceptación verificables

1. **Instalación correcta:** ejecutar `pnpm install` en la raíz termina sin errores y crea un único `pnpm-lock.yaml`.
2. **Estructura de workspaces:** ejecutar `pnpm -r exec pwd` (o `pnpm ls -r --depth -1`) lista los 4 paquetes: `@ff/web`, `@ff/api`, `@ff/db`, `@ff/domain`.
3. **Build agregado:** ejecutar `pnpm -r build` compila los 4 workspaces sin errores de TypeScript. Existen artefactos en `packages/db/dist`, `packages/domain/dist`, `apps/api/dist` y `apps/web/.next`.
4. **API responde /health:** con la API levantada (`pnpm --filter @ff/api dev`), `curl -s http://localhost:3001/health` devuelve `{"status":"ok"}` con HTTP 200.
5. **Web sirve página vacía:** con la web levantada (`pnpm --filter @ff/web dev`), `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` devuelve `200` y la página renderiza sin errores en consola.
6. **TypeScript base compartido:** cada workspace tiene un `tsconfig.json` que extiende `../../tsconfig.base.json` (verificable leyendo cada archivo; los paquetes `db` y `domain` deben extenderlo explícitamente).

## 6. Notas técnicas

- **Nombres de paquetes:** se usa el scope `@ff/*` (`@ff/web`, `@ff/api`, `@ff/db`, `@ff/domain`). Las specs posteriores importarán `@ff/db` y `@ff/domain` por estos nombres; manténlos consistentes.
- **Sin Turborepo:** la orquestación se hace exclusivamente con `pnpm -r` (run recursivo). No agregar `turbo.json` ni la dependencia `turbo`.
- **Puertos por defecto:** API en `3001`, Web en `3000`. La web consumirá la API en specs posteriores; dejar el puerto de la API configurable vía `PORT`.
- **ESM:** los paquetes y la API usan `"type": "module"`. Asegúrate de que `tsx`/Node ejecuten ESM sin conflictos (extensiones `.ts` con `tsx`, imports sin extensión resueltos por `moduleResolution: "Bundler"`).
- **Tailwind:** basta con la página vacía estilizable; no se requiere ningún componente real todavía.
- **Workspace deps:** cuando otras specs necesiten que `apps/api` use `@ff/db`, se añadirá como dependencia con `"@ff/db": "workspace:*"`. En esta spec no es necesario aún.
- **Página "vacía":** "vacía" significa sin funcionalidad de negocio; debe renderizar HTML válido y responder 200, no una pantalla en blanco por error.
