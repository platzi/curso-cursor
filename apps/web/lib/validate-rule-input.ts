import {
  isEnvironment,
  type Environment,
  type RuleType,
} from "@/types/rules";

export type RuleFieldErrors = {
  type?: string;
  environment?: string;
  company_id?: string;
  percentage?: string;
  priority?: string;
};

export type ValidateRuleInputValues = {
  type: RuleType;
  environment?: string;
  company_id?: string;
  percentage?: string;
  priority?: string;
};

function parseInteger(value: string | undefined): number | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

export function validateRuleInput(
  input: ValidateRuleInputValues,
): RuleFieldErrors {
  const errors: RuleFieldErrors = {};

  const priority = parseInteger(input.priority);
  if (priority === null) {
    errors.priority = "La prioridad debe ser un número entero";
  }

  switch (input.type) {
    case "environment": {
      const environment = input.environment?.trim() ?? "";
      if (!environment) {
        errors.environment = "Selecciona un environment";
      } else if (!isEnvironment(environment)) {
        errors.environment = "Environment inválido";
      }
      break;
    }
    case "company": {
      const companyId = input.company_id?.trim() ?? "";
      if (!companyId) {
        errors.company_id = "El company_id es obligatorio";
      }
      break;
    }
    case "percentage": {
      const percentage = parseInteger(input.percentage);
      if (percentage === null) {
        errors.percentage = "El porcentaje debe ser un entero entre 0 y 100";
      } else if (percentage < 0 || percentage > 100) {
        errors.percentage = "El porcentaje debe estar entre 0 y 100";
      }
      break;
    }
  }

  return errors;
}

export function hasRuleFieldErrors(errors: RuleFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function toCreateRuleInput(
  input: ValidateRuleInputValues & { value: boolean },
): CreateRuleInputFromForm | null {
  const errors = validateRuleInput(input);
  if (hasRuleFieldErrors(errors)) {
    return null;
  }

  const priority = parseInteger(input.priority);
  if (priority === null) {
    return null;
  }

  switch (input.type) {
    case "environment": {
      const environment = input.environment?.trim() ?? "";
      if (!isEnvironment(environment)) {
        return null;
      }
      return {
        type: "environment",
        environment,
        value: input.value,
        priority,
      };
    }
    case "company": {
      const companyId = input.company_id?.trim() ?? "";
      if (!companyId) {
        return null;
      }
      return {
        type: "company",
        company_id: companyId,
        value: input.value,
        priority,
      };
    }
    case "percentage": {
      const percentage = parseInteger(input.percentage);
      if (percentage === null || percentage < 0 || percentage > 100) {
        return null;
      }
      return {
        type: "percentage",
        percentage,
        value: input.value,
        priority,
      };
    }
  }
}

type CreateRuleInputFromForm =
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
