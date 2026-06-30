# Spec 02 — Configuración de testing (Vitest)

## 1. Objetivo

Configurar **Vitest** como framework de testing del monorepo, tanto a nivel raíz (ejecución agregada) como por paquete, con scripts estandarizados (`test`, `test:watch`). Dejar un test verde trivial en `packages/domain` que demuestre que la cadena de testing funciona end-to-end. Al finalizar, `pnpm -r test` debe ejecutar todos los tests de todos los workspaces y pasar.

Esta spec habilita la infraestructura de pruebas que usarán las specs posteriores (03 base de datos con test de integración, 04 API, 09 evaluador, etc.). **No** escribe tests de funcionalidad real.

## 2. Contexto y dependencias

- **Specs previas requeridas:**
  - **Spec 01 (monorepo-setup)** debe estar implementada. Es decir, ya existen:
    - `pnpm-workspace.yaml` con `apps/*` y `packages/*`.
    - `package.json` raíz (privado) con scripts agregados vía `pnpm -r`.
    - `tsconfig.base.json` en la raíz.
    - Los 4 workspaces con scope `@ff/*`: `@ff/web`, `@ff/api`, `@ff/db`, `@ff/domain`, cada uno con su `package.json` y `tsconfig.json`.
    - `packages/domain/src/index.ts` con un export trivial.
- **Gestor de paquetes:** pnpm con workspaces, sin Turborepo. La orquestación de tests usa `pnpm -r test`.
- **Framework de testing:** Vitest (versión `^1.6.0` o superior). Para `apps/web` (Next.js) no es obligatorio configurar Vitest en esta spec; el foco es `packages/domain`, `packages/db` y `apps/api`.

## 3. Alcance

### In scope
- Instalar `vitest` como devDependency (en la raíz y/o por paquete según convenga).
- Configuración de Vitest compartida o por paquete (`vitest.config.ts`).
- Scripts `test` y `test:watch` en los `package.json` de los paquetes que tendrán tests (`packages/domain`, `packages/db`, `apps/api`) y un script agregado en la raíz.
- Un **test verde trivial** con lógica real en `packages/domain` (no un test vacío).
- Asegurar que `pnpm -r test` recorre los workspaces y pasa.

### Out of scope
- Tests de funcionalidad real (cada uno vive en su propia spec: integración de DB en spec 03, endpoints en spec 04, evaluador en spec 09, etc.).
- Configuración de testing de componentes React / Next.js (no requerida en esta iteración).
- Cobertura obligatoria (puede dejarse configurada de forma opcional, pero no es criterio de aceptación).
- CI.

## 4. Tareas en orden

1. **Instalar Vitest.** Desde la raíz, añadir `vitest` como devDependency en el workspace raíz para compartir versión:
   ```bash
   pnpm add -D -w vitest
   ```
   (Alternativamente, instalarlo por paquete; mantener una única versión para evitar conflictos.)
2. **Crear configuración base de Vitest.** Crear en la raíz `vitest.config.ts` (o `vitest.shared.ts`) con la configuración común:
   ```ts
   import { defineConfig } from "vitest/config";

   export default defineConfig({
     test: {
       environment: "node",
       globals: true,
       include: ["src/**/*.{test,spec}.ts"],
     },
   });
   ```
3. **Configurar Vitest por paquete.** En cada paquete que tendrá tests (`packages/domain`, `packages/db`, `apps/api`), crear un `vitest.config.ts` que reutilice la base (mediante `mergeConfig` o re-export) o defina `include: ["src/**/*.{test,spec}.ts"]` localmente. Mínimo imprescindible para esta spec: `packages/domain`.
4. **Añadir scripts `test` y `test:watch`** en el `package.json` de los paquetes con tests:
   ```json
   {
     "scripts": {
       "test": "vitest run",
       "test:watch": "vitest"
     }
   }
   ```
   Hazlo al menos en `packages/domain`. Recomendado también en `packages/db` y `apps/api` para que el agregado `pnpm -r test` los recorra cuando tengan tests (en esos paquetes el script puede existir aunque aún no haya archivos de test: `vitest run --passWithNoTests`).
5. **Añadir el script agregado en la raíz.** En el `package.json` raíz, asegurar:
   ```json
   {
     "scripts": {
       "test": "pnpm -r test",
       "test:watch": "pnpm -r --parallel test:watch"
     }
   }
   ```
6. **Escribir el test verde trivial en `packages/domain`.**
   - Crear una pequeña función pura para tener algo que testear, p. ej. `packages/domain/src/sum.ts`:
     ```ts
     export function sum(a: number, b: number): number {
       return a + b;
     }
     ```
   - Exportarla desde `packages/domain/src/index.ts`.
   - Crear `packages/domain/src/sum.test.ts`:
     ```ts
     import { describe, expect, it } from "vitest";
     import { sum } from "./sum";

     describe("sum", () => {
       it("suma dos números", () => {
         expect(sum(2, 3)).toBe(5);
       });
     });
     ```
7. **Manejar paquetes sin tests todavía.** Para `packages/db`, `apps/api` y `apps/web`, si su script `test` existe pero aún no hay archivos de test, usar `vitest run --passWithNoTests` para no romper el agregado. Si prefieres, omite el script `test` en los paquetes sin tests todavía (pnpm `-r` simplemente los salta).
8. **Verificar.** Ejecutar `pnpm -r test` desde la raíz y confirmar que pasa.

## 5. Criterios de aceptación verificables

1. **Vitest instalado:** `pnpm ls -r vitest` muestra Vitest disponible; existe `vitest.config.ts` en la raíz y al menos en `packages/domain`.
2. **Test agregado pasa:** ejecutar `pnpm -r test` desde la raíz termina con código de salida `0` y reporta al menos 1 test ejecutado y 1 pasado.
3. **Test de domain verde:** ejecutar `pnpm --filter @ff/domain test` ejecuta `sum.test.ts`, reporta `1 passed` y sale con código `0`.
4. **Modo watch disponible:** existe el script `test:watch` en `packages/domain` (verificable leyendo su `package.json`) y `pnpm --filter @ff/domain test:watch` arranca Vitest en modo watch sin error de configuración.
5. **Sin falsos negativos por paquetes vacíos:** ejecutar `pnpm -r test` no falla por workspaces que aún no tienen tests (se saltan o usan `--passWithNoTests`).

## 6. Notas técnicas

- **Nombre de los workspaces:** scope `@ff/*` heredado de la spec 01 (`@ff/web`, `@ff/api`, `@ff/db`, `@ff/domain`). Usa `pnpm --filter @ff/domain ...` para operar sobre un paquete concreto.
- **`globals: true`** evita tener que importar `describe`/`it`/`expect` en cada archivo, pero el ejemplo los importa explícitamente para claridad; ambas formas son válidas.
- **Entorno `node`:** los paquetes `domain` y `db` y la API corren en Node, no en jsdom. No configurar jsdom en esta spec.
- **Convención de archivos de test:** `*.test.ts` o `*.spec.ts` dentro de `src/`. Mantén esta convención para que las specs posteriores la reutilicen.
- **Reutilización de config:** puedes centralizar con `mergeConfig(baseConfig, defineConfig({...}))` importando el config raíz, pero no es obligatorio; basta con que cada paquete con tests tenga su `vitest.config.ts`.
- **Relación con specs futuras:** la spec 03 añadirá un test de integración de base de datos en `packages/db`; la spec 09 añadirá tests unitarios del evaluador en `packages/domain`. Esta spec solo deja el andamiaje y un test trivial.
