import { describe, expect, it } from "vitest";
import { hasFieldErrors, validateFlagInput } from "./validate-flag-input";

describe("validateFlagInput", () => {
  it("CA-07.3 rejects invalid key format", () => {
    const errors = validateFlagInput({
      key: "Checkout V2!",
      name: "Checkout V2",
      default_value: false,
      fail_mode: "fail_closed",
    });

    expect(errors.key).toBeTruthy();
    expect(hasFieldErrors(errors)).toBe(true);
  });

  it("accepts valid key format", () => {
    const errors = validateFlagInput({
      key: "checkout_v2",
      name: "Checkout V2",
      default_value: false,
      fail_mode: "fail_closed",
    });

    expect(errors.key).toBeUndefined();
    expect(hasFieldErrors(errors)).toBe(false);
  });

  it("requires name when validating edit input", () => {
    const errors = validateFlagInput(
      {
        name: "",
        default_value: false,
        fail_mode: "fail_closed",
      },
      { requireKey: false },
    );

    expect(errors.name).toBeTruthy();
  });
});
