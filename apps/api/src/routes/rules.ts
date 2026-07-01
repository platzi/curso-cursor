import type { DB } from "@ff/db";
import {
  deleteRuleById,
  getRuleById,
  insertRule,
  listRulesByFlagId,
  ruleBelongsToFlag,
} from "@ff/db";
import { Hono } from "hono";
import { writeAudit } from "../lib/audit.js";
import { createRuleBodySchema, parseJsonBody } from "../lib/validation.js";
import { resolveFlagById } from "./flags.js";

export function createRulesRouter(db: DB): Hono {
  const rules = new Hono();

  rules.get("/:flagId/rules", async (c) => {
    const flagId = c.req.param("flagId");
    const flag = await resolveFlagById(db, flagId);
    if (!flag) {
      return c.json({ error: "Flag not found" }, 404);
    }

    const result = await listRulesByFlagId(db, flagId);
    return c.json(result);
  });

  rules.post("/:flagId/rules", async (c) => {
    const flagId = c.req.param("flagId");
    const flag = await resolveFlagById(db, flagId);
    if (!flag) {
      return c.json({ error: "Flag not found" }, 404);
    }

    const body = await c.req.json().catch(() => null);
    const parsed = parseJsonBody(body, createRuleBodySchema);
    if ("error" in parsed) {
      return c.json({ error: parsed.error }, 400);
    }

    const now = Date.now();
    const id = crypto.randomUUID();
    const ruleInput =
      parsed.type === "environment"
        ? {
            id,
            flag_id: flagId,
            type: parsed.type,
            environment: parsed.environment,
            company_id: null,
            percentage: null,
            value: parsed.value,
            priority: parsed.priority,
            created_at: now,
          }
        : parsed.type === "company"
          ? {
              id,
              flag_id: flagId,
              type: parsed.type,
              environment: null,
              company_id: parsed.company_id,
              percentage: null,
              value: parsed.value,
              priority: parsed.priority,
              created_at: now,
            }
          : {
              id,
              flag_id: flagId,
              type: parsed.type,
              environment: null,
              company_id: null,
              percentage: parsed.percentage,
              value: parsed.value,
              priority: parsed.priority,
              created_at: now,
            };

    const created = await insertRule(db, ruleInput);

    await writeAudit(db, {
      entity_type: "rule",
      entity_id: created.id,
      action: "create",
      new_value: created,
    });

    return c.json(created, 201);
  });

  rules.delete("/:flagId/rules/:ruleId", async (c) => {
    const flagId = c.req.param("flagId");
    const ruleId = c.req.param("ruleId");

    const flag = await resolveFlagById(db, flagId);
    if (!flag) {
      return c.json({ error: "Flag not found" }, 404);
    }

    const belongs = await ruleBelongsToFlag(db, ruleId, flagId);
    if (!belongs) {
      return c.json({ error: "Rule not found" }, 404);
    }

    const deleted = await deleteRuleById(db, ruleId);
    if (!deleted) {
      return c.json({ error: "Rule not found" }, 404);
    }

    await writeAudit(db, {
      entity_type: "rule",
      entity_id: deleted.id,
      action: "delete",
      old_value: deleted,
    });

    return c.body(null, 204);
  });

  return rules;
}

export { getRuleById };
