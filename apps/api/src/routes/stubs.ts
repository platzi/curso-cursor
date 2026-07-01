import { Hono, type Context } from "hono";

/** Stub público hasta spec 09 — solo verifica que auth no bloquee. */
export function evaluateFlagStub(c: Context): Response {
  const key = c.req.param("key");
  const environment = c.req.query("environment") ?? null;
  const userId = c.req.query("user_id") ?? null;
  return c.json({
    key,
    enabled: false,
    environment,
    user_id: userId,
  });
}

export async function evaluateBatchStub(c: Context): Promise<Response> {
  const body: unknown = await c.req.json().catch(() => ({}));
  return c.json({ results: body });
}

/** Rutas admin mínimas protegidas (CRUD completo en spec 04). */
export function createAdminStubRouter(): Hono {
  const admin = new Hono();
  admin.get("/flags", (ctx) => ctx.json([]));
  return admin;
}
