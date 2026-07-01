import Link from "next/link";
import type { Flag } from "@/types/flags";
import { StatusBadge } from "./status-badge";

type FlagsTableProps = {
  flags: Flag[];
};

export function FlagsTable({ flags }: FlagsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead className="bg-slate-900/80">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-slate-300"
            >
              key
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-slate-300"
            >
              name
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-slate-300"
            >
              status
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-slate-300"
            >
              default_value
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950">
          {flags.map((flag) => (
            <tr key={flag.id} className="hover:bg-slate-900/50">
              <td className="px-4 py-3 font-mono text-sky-400">
                <Link
                  href={`/flags/${flag.key}`}
                  className="hover:text-sky-300 hover:underline"
                >
                  {flag.key}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-200">{flag.name}</td>
              <td className="px-4 py-3">
                <StatusBadge status={flag.status} />
              </td>
              <td className="px-4 py-3 text-slate-300">
                {String(flag.default_value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
