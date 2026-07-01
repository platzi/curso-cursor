export type FlagType = "release";
export type FlagStatus = "draft" | "active" | "deprecated" | "archived";
export type FailMode = "fail_closed" | "fail_open";
export type RuleType = "environment" | "company" | "percentage";
export type Environment = "development" | "staging" | "production";

export type Flag = {
  id: string;
  key: string;
  name: string;
  description: string;
  type: FlagType;
  status: FlagStatus;
  default_value: boolean;
  fail_mode: FailMode;
  created_at: string;
  updated_at: string;
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
  created_at: string;
};

export type EvalContext = {
  environment?: Environment;
  company_id?: string;
  user_id?: string;
};

/** Alias del contexto de evaluación para consumidores del evaluador. */
export type UserContext = EvalContext;

/** Flag con reglas embebidas para evaluación en una sola llamada. */
export type FeatureFlag = Flag & { rules: TargetingRule[] };
