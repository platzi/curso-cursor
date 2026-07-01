import { createMiddleware } from "hono/factory";
import { readSession } from "../lib/session.js";

export const requireAuth = createMiddleware(async (c, next) => {
  const session = await readSession(c);
  if (!session) {
    return c.json({ error: "unauthorized" }, 401);
  }
  c.set("username", session.username);
  await next();
});
