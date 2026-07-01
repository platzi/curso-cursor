"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, updateFlag } from "@/lib/api";
import type { Flag, FlagStatus } from "@/types/flags";
import { NEXT_FLAG_STATUS } from "@/types/flags";
import { StatusBadge } from "./status-badge";

type StatusControlProps = {
  flagKey: string;
  status: FlagStatus;
  onStatusUpdated?: (flag: Flag) => void;
};

export function StatusControl({
  flagKey,
  status,
  onStatusUpdated,
}: StatusControlProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatus = NEXT_FLAG_STATUS[currentStatus];

  async function advanceStatus(targetStatus: FlagStatus) {
    setError(null);
    setLoading(true);

    try {
      const updated = await updateFlag(flagKey, { status: targetStatus });
      setCurrentStatus(updated.status);
      setConfirmArchive(false);
      onStatusUpdated?.(updated);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.push("/login");
          return;
        }
        setError(err.message);
        return;
      }
      setError("No se pudo actualizar el status");
    } finally {
      setLoading(false);
    }
  }

  function handleAdvanceClick() {
    if (!nextStatus) {
      return;
    }

    if (nextStatus === "archived") {
      setConfirmArchive(true);
      return;
    }

    void advanceStatus(nextStatus);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-400">Status actual:</span>
        <StatusBadge status={currentStatus} />
      </div>

      {nextStatus ? (
        <div className="mt-4 space-y-3">
          {!confirmArchive ? (
            <button
              type="button"
              disabled={loading}
              onClick={handleAdvanceClick}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading
                ? "Actualizando…"
                : `Avanzar a ${nextStatus}`}
            </button>
          ) : (
            <div
              className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4"
              role="alertdialog"
              aria-labelledby="archive-confirm-title"
            >
              <p
                id="archive-confirm-title"
                className="text-sm text-amber-200"
              >
                ¿Archivar esta flag? Es una acción terminal y dejará de
                evaluarse.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void advanceStatus("archived")}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  Confirmar archivado
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setConfirmArchive(false)}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          Esta flag está archivada y no admite más cambios de status.
        </p>
      )}

      {error ? (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
