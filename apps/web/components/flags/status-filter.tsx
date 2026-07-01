"use client";

import type { FlagStatus } from "@/types/flags";
import { FLAG_STATUSES } from "@/types/flags";

type StatusFilterProps = {
  value: FlagStatus | undefined;
  onChange: (status: FlagStatus | undefined) => void;
  disabled?: boolean;
};

export function StatusFilter({
  value,
  onChange,
  disabled = false,
}: StatusFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="status-filter" className="text-sm text-slate-400">
        Filtrar por status
      </label>
      <select
        id="status-filter"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => {
          const selected = event.target.value;
          onChange(selected === "" ? undefined : (selected as FlagStatus));
        }}
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500 disabled:opacity-50"
      >
        <option value="">Todos</option>
        {FLAG_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>
  );
}
