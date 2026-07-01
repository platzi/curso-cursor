import type { DB } from "@ff/db";
import {
  flagKeyExists,
  getFlagById,
  getFlagByKey,
  insertFlag,
  listFlags,
  updateFlagByKey,
} from "@ff/db";
import type { Flag, FlagStatus } from "@ff/domain";
import { Hono } from "hono";
import { writeAudit } from "../lib/audit.js";
import {
  createFlagBodySchema,
  flagStatusQuerySchema,
  isValidFlagKey,
  parseJsonBody,
  patchFlagBodySchema,
} from "../lib/validation.js";
import { createRulesRouter } from "./rules.js";

export function createFlagsRouter(db: DB): Hono {
  const flags = new Hono();

  flags.get("/", async (c) => {
    const statusParam = c.req.query("status");
    if (statusParam !== undefined) {
      const statusResult = flagStatusQuerySchema.safeParse(statusParam);
      if (!statusResult.success) {
        return c.json({ error: "Invalid status filter" }, 400);
      }
    }

    const status = statusParam as FlagStatus | undefined;
    const result = await listFlags(db, status);
    return c.json(result);
  });

  flags.post("/", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = parseJsonBody(body, createFlagBodySchema);
    if ("error" in parsed) {
      return c.json({ error: parsed.error }, 400);
    }

    if (!isValidFlagKey(parsed.key)) {
      return c.json({ error: "Invalid key format" }, 400);
    }

    if (await flagKeyExists(db, parsed.key)) {
      return c.json({ error: "Flag key already exists" }, 409);
    }

    const now = Date.now();
    const id = crypto.randomUUID();
    const created = await insertFlag(db, {
      id,
      key: parsed.key,
      name: parsed.name,
      description: parsed.description ?? null,
      type: parsed.type,
      default_value: parsed.default_value,
      fail_mode: parsed.fail_mode,
      created_at: now,
      updated_at: now,
    });

    await writeAudit(db, {
      entity_type: "flag",
      entity_id: created.id,
      action: "create",
      new_value: created,
    });

    return c.json(created, 201);
  });

  flags.route("/", createRulesRouter(db));

  flags.get("/:key", async (c) => {
    const key = c.req.param("key");
    const flag = await getFlagByKey(db, key);
    if (!flag) {
      return c.json({ error: "Flag not found" }, 404);
    }
    return c.json(flag);
  });

  flags.patch("/:key", async (c) => {
    const key = c.req.param("key");
    const existing = await getFlagByKey(db, key);
    if (!existing) {
      return c.json({ error: "Flag not found" }, 404);
    }

    const body = await c.req.json().catch(() => null);
    const parsed = parseJsonBody(body, patchFlagBodySchema);
    if ("error" in parsed) {
      return c.json({ error: parsed.error }, 400);
    }

    const updates: Parameters<typeof updateFlagByKey>[2] = {
      updated_at: Date.now(),
    };
    const auditEntries: Array<{
      field: keyof Flag;
      old_value: unknown;
      new_value: unknown;
      action: "update" | "archive";
    }> = [];

    if (parsed.name !== undefined && parsed.name !== existing.name) {
      updates.name = parsed.name;
      auditEntries.push({
        field: "name",
        old_value: existing.name,
        new_value: parsed.name,
        action: "update",
      });
    }
    if (parsed.description !== undefined && parsed.description !== existing.description) {
      updates.description = parsed.description;
      auditEntries.push({
        field: "description",
        old_value: existing.description,
        new_value: parsed.description,
        action: "update",
      });
    }
    if (parsed.default_value !== undefined && parsed.default_value !== existing.default_value) {
      updates.default_value = parsed.default_value;
      auditEntries.push({
        field: "default_value",
        old_value: existing.default_value,
        new_value: parsed.default_value,
        action: "update",
      });
    }
    if (parsed.fail_mode !== undefined && parsed.fail_mode !== existing.fail_mode) {
      updates.fail_mode = parsed.fail_mode;
      auditEntries.push({
        field: "fail_mode",
        old_value: existing.fail_mode,
        new_value: parsed.fail_mode,
        action: "update",
      });
    }
    if (parsed.status !== undefined && parsed.status !== existing.status) {
      updates.status = parsed.status;
      auditEntries.push({
        field: "status",
        old_value: existing.status,
        new_value: parsed.status,
        action: parsed.status === "archived" ? "archive" : "update",
      });
    }

    const updated = await updateFlagByKey(db, key, updates);
    if (!updated) {
      return c.json({ error: "Flag not found" }, 404);
    }

    for (const entry of auditEntries) {
      await writeAudit(db, {
        entity_type: "flag",
        entity_id: existing.id,
        action: entry.action,
        field: entry.field,
        old_value: entry.old_value,
        new_value: entry.new_value,
      });
    }

    return c.json(updated);
  });

  return flags;
}

export async function resolveFlagById(db: DB, flagId: string) {
  return getFlagById(db, flagId);
}
