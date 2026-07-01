import type { AuditLogEntry } from "@/types/audit-log";

type AuditLogTableProps = {
  entries: AuditLogEntry[];
};

export function sortAuditLogByTimestampDesc(
  entries: AuditLogEntry[],
): AuditLogEntry[] {
  return [...entries].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function formatAuditTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatValueChange(entry: AuditLogEntry): string {
  const { old_value, new_value } = entry;

  if (old_value !== undefined && new_value !== undefined) {
    return `${old_value} → ${new_value}`;
  }

  if (new_value !== undefined) {
    return new_value;
  }

  if (old_value !== undefined) {
    return old_value;
  }

  return "—";
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  const sortedEntries = sortAuditLogByTimestampDesc(entries);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead className="bg-slate-900/80">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-slate-300"
            >
              timestamp
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-slate-300"
            >
              entidad
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-slate-300"
            >
              acción
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-slate-300"
            >
              campo
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-slate-300"
            >
              valor anterior
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-slate-300"
            >
              valor nuevo
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950">
          {sortedEntries.map((entry) => (
            <tr key={entry.id} className="hover:bg-slate-900/50">
              <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                {formatAuditTimestamp(entry.timestamp)}
              </td>
              <td className="px-4 py-3 text-slate-200">{entry.entity_type}</td>
              <td className="px-4 py-3 text-slate-200">{entry.action}</td>
              <td className="px-4 py-3 text-slate-300">{entry.field ?? "—"}</td>
              <td className="px-4 py-3 font-mono text-slate-400">
                {entry.old_value ?? "—"}
              </td>
              <td className="px-4 py-3 font-mono text-slate-200">
                <span className="sr-only">{formatValueChange(entry)}</span>
                {entry.new_value ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
