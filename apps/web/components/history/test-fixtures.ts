import type { AuditLogEntry } from "@/types/audit-log";

export const updateDefaultValueEntry: AuditLogEntry = {
  id: "audit-1",
  entity_type: "flag",
  entity_id: "flag-checkout-v2",
  action: "update",
  field: "default_value",
  old_value: "false",
  new_value: "true",
  timestamp: "2026-01-15T10:30:00.000Z",
};

export const createFlagEntry: AuditLogEntry = {
  id: "audit-2",
  entity_type: "flag",
  entity_id: "flag-checkout-v2",
  action: "create",
  timestamp: "2026-01-10T08:00:00.000Z",
};

export const olderUpdateEntry: AuditLogEntry = {
  id: "audit-3",
  entity_type: "flag",
  entity_id: "flag-checkout-v2",
  action: "update",
  field: "name",
  old_value: "Checkout",
  new_value: "Checkout V2",
  timestamp: "2026-01-12T14:00:00.000Z",
};

export const newestUpdateEntry: AuditLogEntry = {
  id: "audit-4",
  entity_type: "rule",
  entity_id: "rule-1",
  action: "delete",
  old_value: '{"type":"environment"}',
  timestamp: "2026-01-20T16:45:00.000Z",
};
