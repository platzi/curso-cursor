import { describe, expect, it } from "vitest";
import {
  hasRuleFieldErrors,
  validateRuleInput,
} from "./validate-rule-input";

describe("validateRuleInput", () => {
  it("CA-08.5 rejects percentage above 100", () => {
    const errors = validateRuleInput({
      type: "percentage",
      percentage: "150",
      priority: "1",
    });

    expect(errors.percentage).toBeTruthy();
    expect(hasRuleFieldErrors(errors)).toBe(true);
  });

  it("CA-08.5 rejects negative percentage", () => {
    const errors = validateRuleInput({
      type: "percentage",
      percentage: "-1",
      priority: "1",
    });

    expect(errors.percentage).toBeTruthy();
  });

  it("CA-08.5 rejects decimal percentage", () => {
    const errors = validateRuleInput({
      type: "percentage",
      percentage: "50.5",
      priority: "1",
    });

    expect(errors.percentage).toBeTruthy();
  });

  it("CA-08.6 rejects empty company_id", () => {
    const errors = validateRuleInput({
      type: "company",
      company_id: "",
      priority: "2",
    });

    expect(errors.company_id).toBeTruthy();
    expect(hasRuleFieldErrors(errors)).toBe(true);
  });

  it("accepts valid environment rule input", () => {
    const errors = validateRuleInput({
      type: "environment",
      environment: "staging",
      priority: "1",
    });

    expect(hasRuleFieldErrors(errors)).toBe(false);
  });
});
