"use client";

import { useCallback, useState } from "react";
import { getFlags } from "@/lib/api";
import type { Flag, FlagStatus } from "@/types/flags";
import { FlagsTable } from "./flags-table";
import { StatusFilter } from "./status-filter";

type FlagsListProps = {
  initialFlags: Flag[];
  initialStatus?: FlagStatus;
};

export function FlagsList({ initialFlags, initialStatus }: FlagsListProps) {
  const [flags, setFlags] = useState(initialFlags);
  const [status, setStatus] = useState<FlagStatus | undefined>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFlags = useCallback(async (nextStatus?: FlagStatus) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getFlags(nextStatus);
      setFlags(data);
    } catch {
      setError("No se pudieron cargar las feature flags. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleStatusChange(nextStatus: FlagStatus | undefined) {
    setStatus(nextStatus);
    await loadFlags(nextStatus);
  }

  async function handleRetry() {
    await loadFlags(status);
  }

  if (error) {
    return (
      <div className="space-y-4">
        <StatusFilter value={status} onChange={handleStatusChange} disabled />
        <div
          className="rounded-xl border border-red-900/50 bg-red-950/30 px-6 py-8 text-center"
          role="alert"
        >
          <p className="text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => void handleRetry()}
            className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StatusFilter
        value={status}
        onChange={handleStatusChange}
        disabled={loading}
      />

      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-12 text-center text-slate-400">
          Cargando flags…
        </div>
      ) : flags.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-12 text-center text-slate-400">
          {status
            ? `Ningún resultado para el filtro "${status}".`
            : "No hay flags."}
        </div>
      ) : (
        <FlagsTable flags={flags} />
      )}
    </div>
  );
}
