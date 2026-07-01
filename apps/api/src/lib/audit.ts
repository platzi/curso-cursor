import { insertAuditEntry } from "@ff/db";
import type { DB } from "@ff/db";
import type { AuditAction, AuditEntityType } from "@ff/domain";

export type WriteAuditInput = {
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  field?: string | null;
  old_value?: unknown;
  new_value?: unknown;
};

/** Serializa valores de audit como JSON (strings se guardan tal cual). */
export function serializeAuditValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

export async function writeAudit(db: DB, input: WriteAuditInput): Promise<void> {
  await insertAuditEntry(db, {
    id: crypto.randomUUID(),
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    action: input.action,
    field: input.field ?? null,
    old_value: input.old_value === undefined ? null : serializeAuditValue(input.old_value),
    new_value: input.new_value === undefined ? null : serializeAuditValue(input.new_value),
    timestamp: Date.now(),
  });
}
