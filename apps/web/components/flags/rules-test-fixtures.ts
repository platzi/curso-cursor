import type { TargetingRule } from "@/types/rules";
import { getRuleParameter } from "@/types/rules";

export const stagingEnvironmentRule: TargetingRule = {
  id: "rule-env-staging",
  flag_id: "flag-checkout-v2",
  type: "environment",
  environment: "staging",
  value: true,
  priority: 1,
  created_at: "2026-01-01T00:00:00.000Z",
};

export const companyRule: TargetingRule = {
  id: "rule-company-acme",
  flag_id: "flag-checkout-v2",
  type: "company",
  company_id: "acme-corp",
  value: true,
  priority: 2,
  created_at: "2026-01-01T00:00:00.000Z",
};

export const percentageRule: TargetingRule = {
  id: "rule-pct-50",
  flag_id: "flag-checkout-v2",
  type: "percentage",
  percentage: 50,
  value: true,
  priority: 3,
  created_at: "2026-01-01T00:00:00.000Z",
};

export { getRuleParameter };
