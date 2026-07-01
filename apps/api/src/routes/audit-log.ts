import type { DB } from "@ff/db";
import { listAuditLog } from "@ff/db";
import { Hono } from "hono";

export function createAuditLogRouter(db: DB): Hono {
  const audit = new Hono();

  audit.get("/", async (c) => {
    const flagKey = c.req.query("flag");
    const entries = await listAuditLog(db, flagKey);
    return c.json(entries);
  });

  return audit;
}
