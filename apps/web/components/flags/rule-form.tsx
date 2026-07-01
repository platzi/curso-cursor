"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, createRule } from "@/lib/api";
import {
  hasRuleFieldErrors,
  toCreateRuleInput,
  validateRuleInput,
  type RuleFieldErrors,
} from "@/lib/validate-rule-input";
import { ENVIRONMENTS, RULE_TYPES, type RuleType } from "@/types/rules";

type RuleFormProps = {
  flagId: string;
  onRuleCreated?: () => void;
};

export function RuleForm({ flagId, onRuleCreated }: RuleFormProps) {
  const router = useRouter();
  const [type, setType] = useState<RuleType>("environment");
  const [environment, setEnvironment] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [percentage, setPercentage] = useState("");
  const [value, setValue] = useState(true);
  const [priority, setPriority] = useState("0");
  const [errors, setErrors] = useState<RuleFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const formValues = {
      type,
      environment,
      company_id: companyId,
      percentage,
      priority,
    };

    const validationErrors = validateRuleInput(formValues);
    setErrors(validationErrors);

    if (hasRuleFieldErrors(validationErrors)) {
      return;
    }

    const payload = toCreateRuleInput({ ...formValues, value });
    if (!payload) {
      return;
    }

    setLoading(true);

    try {
      await createRule(flagId, payload);
      setEnvironment("");
      setCompanyId("");
      setPercentage("");
      setPriority("0");
      setValue(true);
      onRuleCreated?.();
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.push("/login");
          return;
        }
        setSubmitError(err.message);
        return;
      }
      setSubmitError("No se pudo crear la regla");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-4"
    >
      <div>
        <label htmlFor="rule-type" className="block text-sm text-slate-300">
          type
        </label>
        <select
          id="rule-type"
          value={type}
          onChange={(event) => setType(event.target.value as RuleType)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          {RULE_TYPES.map((ruleType) => (
            <option key={ruleType} value={ruleType}>
              {ruleType}
            </option>
          ))}
        </select>
      </div>

      {type === "environment" ? (
        <div>
          <label
            htmlFor="rule-environment"
            className="block text-sm text-slate-300"
          >
            environment
          </label>
          <select
            id="rule-environment"
            value={environment}
            onChange={(event) => setEnvironment(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="">Seleccionar…</option>
            {ENVIRONMENTS.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </select>
          {errors.environment ? (
            <p className="mt-1 text-sm text-red-400">{errors.environment}</p>
          ) : null}
        </div>
      ) : null}

      {type === "company" ? (
        <div>
          <label
            htmlFor="rule-company-id"
            className="block text-sm text-slate-300"
          >
            company_id
          </label>
          <input
            id="rule-company-id"
            type="text"
            value={companyId}
            onChange={(event) => setCompanyId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          {errors.company_id ? (
            <p className="mt-1 text-sm text-red-400">{errors.company_id}</p>
          ) : null}
        </div>
      ) : null}

      {type === "percentage" ? (
        <div>
          <label
            htmlFor="rule-percentage"
            className="block text-sm text-slate-300"
          >
            percentage
          </label>
          <input
            id="rule-percentage"
            type="number"
            min={0}
            max={100}
            value={percentage}
            onChange={(event) => setPercentage(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          {errors.percentage ? (
            <p className="mt-1 text-sm text-red-400">{errors.percentage}</p>
          ) : null}
        </div>
      ) : null}

      <div>
        <label htmlFor="rule-priority" className="block text-sm text-slate-300">
          priority
        </label>
        <input
          id="rule-priority"
          type="number"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        {errors.priority ? (
          <p className="mt-1 text-sm text-red-400">{errors.priority}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="rule-value" className="text-sm text-slate-300">
          value
        </label>
        <button
          id="rule-value"
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => setValue((current) => !current)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
            value ? "bg-sky-600" : "bg-slate-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              value ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span className="font-mono text-sm text-slate-300">{String(value)}</span>
      </div>

      {submitError ? (
        <p className="text-sm text-red-400" role="alert">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {loading ? "Creando…" : "Añadir regla"}
      </button>
    </form>
  );
}
