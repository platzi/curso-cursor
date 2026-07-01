export type AuditEntityType = "flag" | "rule";

export type AuditAction = "create" | "update" | "archive" | "delete";

export type AuditLogEntry = {
  id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  field?: string;
  old_value?: string;
  new_value?: string;
  timestamp: string;
};
