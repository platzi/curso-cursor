"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, updateFlag } from "@/lib/api";
import {
  hasFieldErrors,
  validateFlagInput,
  type FlagFieldErrors,
} from "@/lib/validate-flag-input";
import type { FailMode, Flag } from "@/types/flags";
import { FlagFormFields } from "./flag-form-fields";

type EditFlagFormProps = {
  flag: Flag;
};

export function EditFlagForm({ flag }: EditFlagFormProps) {
  const router = useRouter();
  const [name, setName] = useState(flag.name);
  const [description, setDescription] = useState(flag.description);
  const [defaultValue, setDefaultValue] = useState(flag.default_value);
  const [failMode, setFailMode] = useState<FailMode>(flag.fail_mode);
  const [errors, setErrors] = useState<FlagFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const validationErrors = validateFlagInput(
      {
        name,
        default_value: defaultValue,
        fail_mode: failMode,
      },
      { requireKey: false },
    );
    setErrors(validationErrors);

    if (hasFieldErrors(validationErrors)) {
      return;
    }

    const patch = {
      ...(name.trim() !== flag.name ? { name: name.trim() } : {}),
      ...(description !== flag.description ? { description } : {}),
      ...(defaultValue !== flag.default_value
        ? { default_value: defaultValue }
        : {}),
      ...(failMode !== flag.fail_mode ? { fail_mode: failMode } : {}),
    };

    if (Object.keys(patch).length === 0) {
      router.push(`/flags/${flag.key}`);
      return;
    }

    setLoading(true);

    try {
      await updateFlag(flag.key, patch);
      router.push(`/flags/${flag.key}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          router.push("/login");
          return;
        }
        setSubmitError(error.message);
        return;
      }
      setSubmitError("No se pudo actualizar la feature flag");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <FlagFormFields
        keyValue={flag.key}
        name={name}
        description={description}
        type={flag.type}
        defaultValue={defaultValue}
        failMode={failMode}
        errors={errors}
        disabledKey
        disabledType
        onNameChange={setName}
        onDescriptionChange={setDescription}
        onDefaultValueChange={setDefaultValue}
        onFailModeChange={setFailMode}
      />

      {submitError ? (
        <p className="text-sm text-red-400" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/flags/${flag.key}`)}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
