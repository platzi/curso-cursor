import type { FailMode } from "@/types/flags";
import type { FlagFieldErrors } from "@/lib/validate-flag-input";

type FlagFormFieldsProps = {
  keyValue: string;
  name: string;
  description: string;
  type: "release";
  defaultValue: boolean;
  failMode: FailMode;
  errors: FlagFieldErrors;
  disabledKey?: boolean;
  disabledType?: boolean;
  onKeyChange?: (value: string) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDefaultValueChange: (value: boolean) => void;
  onFailModeChange: (value: FailMode) => void;
};

export function FlagFormFields({
  keyValue,
  name,
  description,
  type,
  defaultValue,
  failMode,
  errors,
  disabledKey = false,
  disabledType = false,
  onKeyChange,
  onNameChange,
  onDescriptionChange,
  onDefaultValueChange,
  onFailModeChange,
}: FlagFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="flag-key" className="mb-1 block text-sm text-slate-300">
          key
        </label>
        <input
          id="flag-key"
          name="key"
          type="text"
          value={keyValue}
          disabled={disabledKey}
          onChange={(event) => onKeyChange?.(event.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white outline-none focus:border-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {errors.key ? (
          <p className="mt-1 text-sm text-red-400" role="alert">
            {errors.key}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="flag-name" className="mb-1 block text-sm text-slate-300">
          name
        </label>
        <input
          id="flag-name"
          name="name"
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-sky-500"
        />
        {errors.name ? (
          <p className="mt-1 text-sm text-red-400" role="alert">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="flag-description"
          className="mb-1 block text-sm text-slate-300"
        >
          description
        </label>
        <textarea
          id="flag-description"
          name="description"
          rows={3}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-sky-500"
        />
      </div>

      <div>
        <label htmlFor="flag-type" className="mb-1 block text-sm text-slate-300">
          type
        </label>
        <input
          id="flag-type"
          name="type"
          type="text"
          value={type}
          disabled={disabledType}
          readOnly
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-400 outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div>
        <label
          htmlFor="flag-default-value"
          className="flex items-center gap-2 text-sm text-slate-300"
        >
          <input
            id="flag-default-value"
            name="default_value"
            type="checkbox"
            checked={defaultValue}
            onChange={(event) => onDefaultValueChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-600"
          />
          default_value
        </label>
        {errors.default_value ? (
          <p className="mt-1 text-sm text-red-400" role="alert">
            {errors.default_value}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="flag-fail-mode"
          className="mb-1 block text-sm text-slate-300"
        >
          fail_mode
        </label>
        <select
          id="flag-fail-mode"
          name="fail_mode"
          value={failMode}
          onChange={(event) =>
            onFailModeChange(event.target.value as FailMode)
          }
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-sky-500"
        >
          <option value="fail_closed">fail_closed</option>
          <option value="fail_open">fail_open</option>
        </select>
        {errors.fail_mode ? (
          <p className="mt-1 text-sm text-red-400" role="alert">
            {errors.fail_mode}
          </p>
        ) : null}
      </div>
    </div>
  );
}
