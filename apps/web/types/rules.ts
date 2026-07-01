export type RuleType = "environment" | "company" | "percentage";

export type Environment = "development" | "staging" | "production";

export type TargetingRule = {
  id: string;
  flag_id: string;
  type: RuleType;
  environment?: Environment;
  company_id?: string;
  percentage?: number;
  value: boolean;
  priority: number;
  created_at: string;
};

export type CreateRuleInput =
  | {
      type: "environment";
      environment: Environment;
      value: boolean;
      priority: number;
    }
  | {
      type: "company";
      company_id: string;
      value: boolean;
      priority: number;
    }
  | {
      type: "percentage";
      percentage: number;
      value: boolean;
      priority: number;
    };

export const RULE_TYPES: RuleType[] = ["environment", "company", "percentage"];

export const ENVIRONMENTS: Environment[] = [
  "development",
  "staging",
  "production",
];

export function isEnvironment(value: string): value is Environment {
  return ENVIRONMENTS.includes(value as Environment);
}

export function getRuleParameter(rule: TargetingRule): string {
  switch (rule.type) {
    case "environment":
      return rule.environment ?? "—";
    case "company":
      return rule.company_id ?? "—";
    case "percentage":
      return rule.percentage !== undefined ? String(rule.percentage) : "—";
  }
}
