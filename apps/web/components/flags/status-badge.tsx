import type { FlagStatus } from "@/types/flags";

const STATUS_STYLES: Record<FlagStatus, string> = {
  draft: "bg-slate-700 text-slate-200",
  active: "bg-emerald-900/60 text-emerald-300",
  deprecated: "bg-amber-900/60 text-amber-300",
  archived: "bg-red-900/50 text-red-300",
};

type StatusBadgeProps = {
  status: FlagStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
