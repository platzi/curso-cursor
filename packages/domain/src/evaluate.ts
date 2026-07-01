import { hashToBucket } from "./hash.js";
import type {
  EvalContext,
  FailMode,
  FeatureFlag,
  Flag,
  TargetingRule,
} from "./types.js";

function compareRules(a: TargetingRule, b: TargetingRule): number {
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }
  return a.created_at.localeCompare(b.created_at);
}

function findMatchingRule(
  rules: TargetingRule[],
  type: TargetingRule["type"],
  matches: (rule: TargetingRule) => boolean,
): TargetingRule | undefined {
  return rules
    .filter((rule) => rule.type === type && matches(rule))
    .sort(compareRules)[0];
}

/**
 * Cascada del PRD: archived → environment → company → percentage → default.
 */
export function evaluateFlag(
  flag: Flag | null,
  rules: TargetingRule[],
  context: EvalContext,
): boolean {
  if (flag === null) {
    return false;
  }

  if (flag.status === "archived") {
    return false;
  }

  const environmentRule = findMatchingRule(
    rules,
    "environment",
    (rule) =>
      context.environment !== undefined &&
      rule.environment === context.environment,
  );
  if (environmentRule !== undefined) {
    return environmentRule.value;
  }

  const companyRule = findMatchingRule(
    rules,
    "company",
    (rule) =>
      context.company_id !== undefined &&
      rule.company_id === context.company_id,
  );
  if (companyRule !== undefined) {
    return companyRule.value;
  }

  const percentageRule = findMatchingRule(
    rules,
    "percentage",
    (rule) => rule.percentage !== null,
  );
  if (percentageRule !== undefined && percentageRule.percentage !== null) {
    const bucket = hashToBucket(
      `${context.user_id ?? ""}:${flag.key}`,
    );
    if (bucket < percentageRule.percentage) {
      return percentageRule.value;
    }
  }

  return flag.default_value;
}

/** Atajo que recibe flag + reglas en un solo objeto. */
export function isFeatureEnabled(
  flag: FeatureFlag | null,
  userContext: EvalContext,
): boolean {
  if (flag === null) {
    return false;
  }

  const { rules, ...flagData } = flag;
  return evaluateFlag(flagData, rules, userContext);
}

/** Usado por la capa API cuando la lectura del store falla. */
export function applyFailMode(failMode: FailMode): boolean {
  return failMode === "fail_open";
}
