import type { FailMode } from "@/types/flags";

export type FlagFieldErrors = {
  key?: string;
  name?: string;
  description?: string;
  default_value?: string;
  fail_mode?: string;
};

const KEY_REGEX = /^[a-z0-9_]+$/;

const VALID_FAIL_MODES: FailMode[] = ["fail_closed", "fail_open"];

export type ValidateFlagInputOptions = {
  requireKey?: boolean;
};

export type ValidateFlagInputValues = {
  key?: string;
  name?: string;
  default_value?: boolean;
  fail_mode?: FailMode;
};

export function validateFlagInput(
  input: ValidateFlagInputValues,
  options: ValidateFlagInputOptions = {},
): FlagFieldErrors {
  const { requireKey = true } = options;
  const errors: FlagFieldErrors = {};

  if (requireKey) {
    const key = input.key?.trim() ?? "";
    if (!key) {
      errors.key = "La key es obligatoria";
    } else if (!KEY_REGEX.test(key)) {
      errors.key =
        "La key solo puede contener letras minúsculas, números y guiones bajos";
    }
  }

  const name = input.name?.trim() ?? "";
  if (!name) {
    errors.name = "El nombre es obligatorio";
  }

  if (
    input.fail_mode !== undefined &&
    !VALID_FAIL_MODES.includes(input.fail_mode)
  ) {
    errors.fail_mode = "Modo de fallo inválido";
  }

  return errors;
}

export function hasFieldErrors(errors: FlagFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
