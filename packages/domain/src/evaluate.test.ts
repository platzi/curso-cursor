import { describe, expect, it } from "vitest";
import { hashToBucket } from "./hash.js";
import {
  applyFailMode,
  evaluateFlag,
  isFeatureEnabled,
} from "./evaluate.js";
import type { EvalContext, Flag, TargetingRule } from "./types.js";

const baseFlag: Flag = {
  id: "flag-1",
  key: "checkout_v2",
  name: "Checkout V2",
  description: "New checkout flow",
  type: "release",
  status: "active",
  default_value: false,
  fail_mode: "fail_closed",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

function makeRule(
  overrides: Partial<TargetingRule> & Pick<TargetingRule, "type" | "value">,
): TargetingRule {
  return {
    id: "rule-1",
    flag_id: baseFlag.id,
    environment: null,
    company_id: null,
    percentage: null,
    priority: 0,
    created_at: "2024-01-02T00:00:00.000Z",
    ...overrides,
  };
}

const ctx = (overrides: EvalContext = {}): EvalContext => overrides;

describe("evaluateFlag / isFeatureEnabled", () => {
  it("CA-09.8: flag inexistente devuelve false", () => {
    expect(evaluateFlag(null, [], ctx())).toBe(false);
    expect(isFeatureEnabled(null, ctx())).toBe(false);
  });

  it("CA-09.1: flag archived devuelve false ignorando reglas y default", () => {
    const archivedFlag: Flag = {
      ...baseFlag,
      status: "archived",
      default_value: true,
    };
    const rules = [
      makeRule({
        type: "environment",
        environment: "staging",
        value: true,
      }),
    ];

    expect(evaluateFlag(archivedFlag, rules, ctx({ environment: "staging" }))).toBe(
      false,
    );
    expect(
      isFeatureEnabled({ ...archivedFlag, rules }, ctx({ environment: "staging" })),
    ).toBe(false);
  });

  it("flag apagada: default false sin reglas que apliquen", () => {
    expect(evaluateFlag(baseFlag, [], ctx())).toBe(false);
    expect(isFeatureEnabled({ ...baseFlag, rules: [] }, ctx())).toBe(false);
  });

  it("activa global: default true sin reglas que apliquen", () => {
    const globalFlag: Flag = { ...baseFlag, default_value: true };

    expect(evaluateFlag(globalFlag, [], ctx())).toBe(true);
    expect(isFeatureEnabled({ ...globalFlag, rules: [] }, ctx())).toBe(true);
  });

  it("CA-09.2: regla environment aplica cuando coincide el ambiente", () => {
    const rules = [
      makeRule({
        type: "environment",
        environment: "staging",
        value: true,
      }),
    ];

    expect(
      evaluateFlag(baseFlag, rules, ctx({ environment: "staging" })),
    ).toBe(true);
    expect(
      evaluateFlag(baseFlag, rules, ctx({ environment: "production" })),
    ).toBe(false);
  });

  it("CA-09.3: regla company aplica cuando coincide la empresa", () => {
    const rules = [
      makeRule({
        type: "company",
        company_id: "acme",
        value: true,
      }),
    ];

    expect(evaluateFlag(baseFlag, rules, ctx({ company_id: "acme" }))).toBe(true);
    expect(evaluateFlag(baseFlag, rules, ctx({ company_id: "other" }))).toBe(
      false,
    );
  });

  it("usuario que no cumple ninguna regla cae al default_value", () => {
    const rules = [
      makeRule({
        type: "environment",
        environment: "staging",
        value: true,
      }),
      makeRule({
        id: "rule-2",
        type: "company",
        company_id: "acme",
        value: true,
      }),
    ];
    const flagWithDefault: Flag = { ...baseFlag, default_value: true };

    expect(
      evaluateFlag(
        flagWithDefault,
        rules,
        ctx({ environment: "production", company_id: "other" }),
      ),
    ).toBe(true);
  });

  it("CA-09.4: environment gana sobre company cuando ambas coinciden", () => {
    const rules = [
      makeRule({
        type: "environment",
        environment: "staging",
        value: true,
        priority: 10,
      }),
      makeRule({
        id: "rule-2",
        type: "company",
        company_id: "acme",
        value: false,
        priority: 0,
      }),
    ];

    expect(
      evaluateFlag(
        baseFlag,
        rules,
        ctx({ environment: "staging", company_id: "acme" }),
      ),
    ).toBe(true);
  });

  it("CA-09.4: company aplica cuando environment no coincide", () => {
    const rules = [
      makeRule({
        type: "environment",
        environment: "staging",
        value: true,
      }),
      makeRule({
        id: "rule-2",
        type: "company",
        company_id: "acme",
        value: true,
      }),
    ];

    expect(
      evaluateFlag(
        baseFlag,
        rules,
        ctx({ environment: "production", company_id: "acme" }),
      ),
    ).toBe(true);
  });

  it("CA-09.5: sin reglas aplicables devuelve default_value", () => {
    expect(evaluateFlag({ ...baseFlag, default_value: true }, [], ctx())).toBe(
      true,
    );
    expect(evaluateFlag({ ...baseFlag, default_value: false }, [], ctx())).toBe(
      false,
    );
  });

  it("desempate por priority y created_at dentro del mismo tipo", () => {
    const rules = [
      makeRule({
        id: "rule-low-priority",
        type: "environment",
        environment: "staging",
        value: false,
        priority: 5,
        created_at: "2024-01-03T00:00:00.000Z",
      }),
      makeRule({
        id: "rule-high-priority",
        type: "environment",
        environment: "staging",
        value: true,
        priority: 1,
        created_at: "2024-01-04T00:00:00.000Z",
      }),
    ];

    expect(
      evaluateFlag(baseFlag, rules, ctx({ environment: "staging" })),
    ).toBe(true);
  });

  it("CA-09.6: stickiness — mismo user_id devuelve siempre el mismo resultado", () => {
    const rules = [
      makeRule({
        type: "percentage",
        percentage: 50,
        value: true,
      }),
    ];
    const context = ctx({ user_id: "user-sticky-42" });

    const first = evaluateFlag(baseFlag, rules, context);
    for (let i = 0; i < 100; i++) {
      expect(evaluateFlag(baseFlag, rules, context)).toBe(first);
    }
  });

  it("rollout porcentual: bucket fuera del porcentaje cae al default", () => {
    const rules = [
      makeRule({
        type: "percentage",
        percentage: 0,
        value: true,
      }),
    ];

    expect(
      evaluateFlag(baseFlag, rules, ctx({ user_id: "any-user" })),
    ).toBe(false);
  });

  it("rollout porcentual: bucket dentro del porcentaje aplica el value de la regla", () => {
    let matchedUser: string | undefined;
    const rules = [
      makeRule({
        type: "percentage",
        percentage: 100,
        value: true,
      }),
    ];

    for (let i = 0; i < 20; i++) {
      const userId = `user-${i}`;
      if (evaluateFlag(baseFlag, rules, ctx({ user_id: userId }))) {
        matchedUser = userId;
        break;
      }
    }

    expect(matchedUser).toBeDefined();
    expect(
      evaluateFlag(baseFlag, rules, ctx({ user_id: matchedUser })),
    ).toBe(true);
  });

  it("CA-09.7: distribución ~50% sobre muchos user_id distintos", () => {
    const rules = [
      makeRule({
        type: "percentage",
        percentage: 50,
        value: true,
      }),
    ];

    let enabledCount = 0;
    const totalUsers = 1000;

    for (let i = 0; i < totalUsers; i++) {
      if (evaluateFlag(baseFlag, rules, ctx({ user_id: `user-${i}` }))) {
        enabledCount++;
      }
    }

    const ratio = enabledCount / totalUsers;
    expect(ratio).toBeGreaterThanOrEqual(0.43);
    expect(ratio).toBeLessThanOrEqual(0.57);
  });

  it("user_id ausente usa string vacío de forma determinista", () => {
    const rules = [
      makeRule({
        type: "percentage",
        percentage: 50,
        value: true,
      }),
    ];

    const withoutUser = evaluateFlag(baseFlag, rules, ctx());
    expect(evaluateFlag(baseFlag, rules, ctx())).toBe(withoutUser);
  });

  it("buckets distintos por flag_key para el mismo user_id", () => {
    const flagA: Flag = { ...baseFlag, key: "flag_a" };
    const flagB: Flag = { ...baseFlag, key: "flag_b" };
    const rules = [
      makeRule({
        type: "percentage",
        percentage: 50,
        value: true,
      }),
    ];
    const context = ctx({ user_id: "same-user" });

    const bucketA = hashToBucket(`same-user:${flagA.key}`);
    const bucketB = hashToBucket(`same-user:${flagB.key}`);

    expect(bucketA).not.toBe(bucketB);
    expect(evaluateFlag(flagA, rules, context)).toBe(bucketA < 50);
    expect(evaluateFlag(flagB, rules, context)).toBe(bucketB < 50);
  });
});

describe("hashToBucket", () => {
  it("devuelve valores en [0, 100)", () => {
    for (let i = 0; i < 200; i++) {
      const bucket = hashToBucket(`input-${i}`);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(100);
    }
  });

  it("es estable entre invocaciones", () => {
    expect(hashToBucket("u1:checkout_v2")).toBe(hashToBucket("u1:checkout_v2"));
  });
});

describe("applyFailMode", () => {
  it("fail_closed devuelve false", () => {
    expect(applyFailMode("fail_closed")).toBe(false);
  });

  it("fail_open devuelve true", () => {
    expect(applyFailMode("fail_open")).toBe(true);
  });
});
