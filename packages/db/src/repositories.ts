import type { AuditLogEntry, Flag, FlagStatus, TargetingRule } from "@ff/domain";
import { and, asc, desc, eq } from "drizzle-orm";
import type { DB } from "./client.js";
import { booleanToInt, mapAuditEntry, mapFlag, mapRule } from "./mappers.js";
import { auditLog, flags, targetingRules } from "./schema.js";
import type { Environment, FailMode, FlagType, RuleType } from "./schema.js";

export type CreateFlagInput = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  type?: FlagType;
  status?: FlagStatus;
  default_value: boolean;
  fail_mode?: FailMode;
  created_at: number;
  updated_at: number;
};

export type UpdateFlagInput = Partial<{
  name: string;
  description: string | null;
  default_value: boolean;
  fail_mode: FailMode;
  status: FlagStatus;
  updated_at: number;
}>;

export type CreateRuleInput = {
  id: string;
  flag_id: string;
  type: RuleType;
  environment: Environment | null;
  company_id: string | null;
  percentage: number | null;
  value: boolean;
  priority: number;
  created_at: number;
};

export type InsertAuditInput = {
  id: string;
  entity_type: "flag" | "rule";
  entity_id: string;
  action: "create" | "update" | "archive" | "delete";
  field?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  timestamp: number;
};

export async function listFlags(db: DB, status?: FlagStatus): Promise<Flag[]> {
  const rows =
    status === undefined
      ? await db.select().from(flags)
      : await db.select().from(flags).where(eq(flags.status, status));
  return rows.map(mapFlag);
}

export async function getFlagByKey(db: DB, key: string): Promise<Flag | null> {
  const row = await db.query.flags.findFirst({ where: eq(flags.key, key) });
  return row ? mapFlag(row) : null;
}

export async function getFlagById(db: DB, id: string): Promise<Flag | null> {
  const row = await db.query.flags.findFirst({ where: eq(flags.id, id) });
  return row ? mapFlag(row) : null;
}

export async function flagKeyExists(db: DB, key: string): Promise<boolean> {
  const row = await db.query.flags.findFirst({ where: eq(flags.key, key) });
  return row !== undefined;
}

export async function insertFlag(db: DB, input: CreateFlagInput): Promise<Flag> {
  await db.insert(flags).values({
    id: input.id,
    key: input.key,
    name: input.name,
    description: input.description ?? null,
    type: input.type ?? "release",
    status: input.status ?? "draft",
    defaultValue: booleanToInt(input.default_value),
    failMode: input.fail_mode ?? "fail_closed",
    createdAt: input.created_at,
    updatedAt: input.updated_at,
  });
  const created = await getFlagByKey(db, input.key);
  if (!created) {
    throw new Error(`Flag ${input.key} not found after insert`);
  }
  return created;
}

export async function updateFlagByKey(
  db: DB,
  key: string,
  input: UpdateFlagInput,
): Promise<Flag | null> {
  const updates: Partial<typeof flags.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.default_value !== undefined) {
    updates.defaultValue = booleanToInt(input.default_value);
  }
  if (input.fail_mode !== undefined) updates.failMode = input.fail_mode;
  if (input.status !== undefined) updates.status = input.status;
  if (input.updated_at !== undefined) updates.updatedAt = input.updated_at;

  if (Object.keys(updates).length === 0) {
    return getFlagByKey(db, key);
  }

  await db.update(flags).set(updates).where(eq(flags.key, key));
  return getFlagByKey(db, key);
}

export async function listRulesByFlagId(db: DB, flagId: string): Promise<TargetingRule[]> {
  const rows = await db
    .select()
    .from(targetingRules)
    .where(eq(targetingRules.flagId, flagId))
    .orderBy(asc(targetingRules.priority));
  return rows.map(mapRule);
}

export async function getRuleById(db: DB, ruleId: string): Promise<TargetingRule | null> {
  const row = await db.query.targetingRules.findFirst({
    where: eq(targetingRules.id, ruleId),
  });
  return row ? mapRule(row) : null;
}

export async function insertRule(db: DB, input: CreateRuleInput): Promise<TargetingRule> {
  await db.insert(targetingRules).values({
    id: input.id,
    flagId: input.flag_id,
    type: input.type,
    environment: input.environment,
    companyId: input.company_id,
    percentage: input.percentage,
    value: booleanToInt(input.value),
    priority: input.priority,
    createdAt: input.created_at,
  });
  const created = await getRuleById(db, input.id);
  if (!created) {
    throw new Error(`Rule ${input.id} not found after insert`);
  }
  return created;
}

export async function deleteRuleById(db: DB, ruleId: string): Promise<TargetingRule | null> {
  const existing = await getRuleById(db, ruleId);
  if (!existing) {
    return null;
  }
  await db.delete(targetingRules).where(eq(targetingRules.id, ruleId));
  return existing;
}

export async function insertAuditEntry(db: DB, input: InsertAuditInput): Promise<void> {
  await db.insert(auditLog).values({
    id: input.id,
    entityType: input.entity_type,
    entityId: input.entity_id,
    action: input.action,
    field: input.field ?? null,
    oldValue: input.old_value ?? null,
    newValue: input.new_value ?? null,
    timestamp: input.timestamp,
  });
}

export async function listAuditLog(db: DB, flagKey?: string): Promise<AuditLogEntry[]> {
  const rows = await db.select().from(auditLog).orderBy(desc(auditLog.timestamp));

  if (flagKey === undefined) {
    return rows.map(mapAuditEntry);
  }

  const flag = await getFlagByKey(db, flagKey);
  if (!flag) {
    return [];
  }

  const rules = await listRulesByFlagId(db, flag.id);
  const ruleIds = new Set(rules.map((rule) => rule.id));

  return rows
    .map(mapAuditEntry)
    .filter((entry) => {
      if (entry.entity_type === "flag" && entry.entity_id === flag.id) {
        return true;
      }
      if (entry.entity_type !== "rule") {
        return false;
      }
      if (ruleIds.has(entry.entity_id)) {
        return true;
      }
      const snapshot = entry.old_value ?? entry.new_value;
      return snapshot?.includes(`"flag_id":"${flag.id}"`) ?? false;
    });
}

export async function ruleBelongsToFlag(
  db: DB,
  ruleId: string,
  flagId: string,
): Promise<boolean> {
  const row = await db.query.targetingRules.findFirst({
    where: and(eq(targetingRules.id, ruleId), eq(targetingRules.flagId, flagId)),
  });
  return row !== undefined;
}
