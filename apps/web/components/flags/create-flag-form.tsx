"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, createFlag } from "@/lib/api";
import {
  hasFieldErrors,
  validateFlagInput,
  type FlagFieldErrors,
} from "@/lib/validate-flag-input";
import type { FailMode } from "@/types/flags";
import { FlagFormFields } from "./flag-form-fields";

export function CreateFlagForm() {
  const router = useRouter();
  const [keyValue, setKeyValue] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultValue, setDefaultValue] = useState(false);
  const [failMode, setFailMode] = useState<FailMode>("fail_closed");
  const [errors, setErrors] = useState<FlagFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const validationErrors = validateFlagInput({
      key: keyValue,
      name,
      default_value: defaultValue,
      fail_mode: failMode,
    });
    setErrors(validationErrors);

    if (hasFieldErrors(validationErrors)) {
      return;
    }

    setLoading(true);

    try {
      const flag = await createFlag({
        key: keyValue.trim(),
        name: name.trim(),
        description,
        type: "release",
        default_value: defaultValue,
        fail_mode: failMode,
      });
      router.push(`/flags/${flag.key}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          router.push("/login");
          return;
        }
        if (error.status === 409) {
          setErrors({ key: "Esta key ya existe (duplicada)" });
          return;
        }
        setSubmitError(error.message);
        return;
      }
      setSubmitError("No se pudo crear la feature flag");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <FlagFormFields
        keyValue={keyValue}
        name={name}
        description={description}
        type="release"
        defaultValue={defaultValue}
        failMode={failMode}
        errors={errors}
        onKeyChange={setKeyValue}
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

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {loading ? "Creando…" : "Crear flag"}
      </button>
    </form>
  );
}
