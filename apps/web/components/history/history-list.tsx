"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuditLog } from "@/lib/api";
import type { AuditLogEntry } from "@/types/audit-log";
import { AuditLogTable } from "./audit-log-table";
import { FlagFilter } from "./flag-filter";

type HistoryListProps = {
  initialEntries: AuditLogEntry[];
  initialFlagKey?: string;
  flagKeys: string[];
};

export function HistoryList({
  initialEntries,
  initialFlagKey,
  flagKeys,
}: HistoryListProps) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [flagKey, setFlagKey] = useState<string | undefined>(initialFlagKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLog = useCallback(async (nextFlagKey?: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAuditLog(nextFlagKey);
      setEntries(data);
    } catch {
      setError(
        "No se pudo cargar el historial de auditoría. Inténtalo de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleFlagChange(nextFlagKey: string | undefined) {
    setFlagKey(nextFlagKey);

    const nextUrl = nextFlagKey
      ? `/history?flag=${encodeURIComponent(nextFlagKey)}`
      : "/history";
    router.replace(nextUrl);

    await loadAuditLog(nextFlagKey);
  }

  async function handleRetry() {
    await loadAuditLog(flagKey);
  }

  if (error) {
    return (
      <div className="space-y-4">
        <FlagFilter
          value={flagKey}
          flagKeys={flagKeys}
          onChange={handleFlagChange}
          disabled
        />
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
      <FlagFilter
        value={flagKey}
        flagKeys={flagKeys}
        onChange={handleFlagChange}
        disabled={loading}
      />

      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-12 text-center text-slate-400">
          Cargando historial…
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-12 text-center text-slate-400">
          {flagKey
            ? `Sin entradas para la flag "${flagKey}".`
            : "Sin entradas en el historial."}
        </div>
      ) : (
        <AuditLogTable entries={entries} />
      )}
    </div>
  );
}
