import type { DB } from "@ff/db";
import { Hono } from "hono";
import { createAuditLogRouter } from "./routes/audit-log.js";
import { createFlagsRouter } from "./routes/flags.js";

export function createApp(db: DB): Hono {
  const app = new Hono();

  app.get("/health", (c) => c.json({ status: "ok" }));

  const v1 = new Hono();
  v1.route("/flags", createFlagsRouter(db));
  v1.route("/audit-log", createAuditLogRouter(db));
  app.route("/api/v1", v1);

  return app;
}
