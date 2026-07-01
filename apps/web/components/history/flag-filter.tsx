"use client";

type FlagFilterProps = {
  value: string | undefined;
  flagKeys: string[];
  onChange: (flagKey: string | undefined) => void;
  disabled?: boolean;
};

export function FlagFilter({
  value,
  flagKeys,
  onChange,
  disabled = false,
}: FlagFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="flag-filter" className="text-sm text-slate-400">
        Filtrar por flag
      </label>
      <select
        id="flag-filter"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => {
          const selected = event.target.value;
          onChange(selected === "" ? undefined : selected);
        }}
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500 disabled:opacity-50"
      >
        <option value="">Todas</option>
        {flagKeys.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </div>
  );
}
