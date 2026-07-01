import type { AuditLogEntry, Flag, TargetingRule } from "@ff/domain";
import type { auditLog, flags, targetingRules } from "./schema.js";

type FlagRow = typeof flags.$inferSelect;
type RuleRow = typeof targetingRules.$inferSelect;
type AuditRow = typeof auditLog.$inferSelect;

function toBoolean(value: number): boolean {
  return value !== 0;
}

export function mapFlag(row: FlagRow): Flag {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description ?? null,
    type: row.type,
    status: row.status,
    default_value: toBoolean(row.defaultValue),
    fail_mode: row.failMode,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function mapRule(row: RuleRow): TargetingRule {
  return {
    id: row.id,
    flag_id: row.flagId,
    type: row.type,
    environment: row.environment ?? null,
    company_id: row.companyId ?? null,
    percentage: row.percentage ?? null,
    value: toBoolean(row.value),
    priority: row.priority,
    created_at: row.createdAt,
  };
}

export function mapAuditEntry(row: AuditRow): AuditLogEntry {
  return {
    id: row.id,
    entity_type: row.entityType,
    entity_id: row.entityId,
    action: row.action,
    field: row.field ?? null,
    old_value: row.oldValue ?? null,
    new_value: row.newValue ?? null,
    timestamp: row.timestamp,
  };
}

export function booleanToInt(value: boolean): number {
  return value ? 1 : 0;
}
