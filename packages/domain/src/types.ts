export type FlagType = "release";

export type FlagStatus = "draft" | "active" | "deprecated" | "archived";

export type FailMode = "fail_closed" | "fail_open";

export type RuleType = "environment" | "company" | "percentage";

export type Environment = "development" | "staging" | "production";

export type AuditEntityType = "flag" | "rule";

export type AuditAction = "create" | "update" | "archive" | "delete";

export type Flag = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  type: FlagType;
  status: FlagStatus;
  default_value: boolean;
  fail_mode: FailMode;
  created_at: number;
  updated_at: number;
};

export type TargetingRule = {
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

export type AuditLogEntry = {
  id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  timestamp: number;
};

export const FLAG_KEY_PATTERN = /^[a-z0-9_]+$/;

export const FLAG_STATUSES: readonly FlagStatus[] = [
  "draft",
  "active",
  "deprecated",
  "archived",
];

export const ENVIRONMENTS: readonly Environment[] = ["development", "staging", "production"];
