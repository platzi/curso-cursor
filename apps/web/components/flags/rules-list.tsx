"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, deleteRule } from "@/lib/api";
import type { TargetingRule } from "@/types/rules";
import { getRuleParameter } from "@/types/rules";

type RulesListProps = {
  flagId: string;
  rules: TargetingRule[];
  onRuleDeleted?: () => void;
};

export function RulesList({ flagId, rules, onRuleDeleted }: RulesListProps) {
  const router = useRouter();
  const [confirmRuleId, setConfirmRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const safeRules = rules ?? [];

  async function handleConfirmDelete(ruleId: string) {
    setError(null);
    setDeletingRuleId(ruleId);

    try {
      await deleteRule(flagId, ruleId);
      setConfirmRuleId(null);
      onRuleDeleted?.();
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
      setError("No se pudo eliminar la regla");
    } finally {
      setDeletingRuleId(null);
    }
  }

  if (safeRules.length === 0) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-400">
        Sin reglas
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/80">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left font-medium text-slate-300"
              >
                type
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left font-medium text-slate-300"
              >
                parámetro
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left font-medium text-slate-300"
              >
                value
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left font-medium text-slate-300"
              >
                priority
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-slate-300">
                acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950">
            {safeRules.map((rule) => (
              <tr key={rule.id} className="hover:bg-slate-900/50">
                <td className="px-4 py-3 font-mono text-slate-200">
                  {rule.type}
                </td>
                <td className="px-4 py-3 font-mono text-slate-300">
                  {getRuleParameter(rule)}
                </td>
                <td className="px-4 py-3 font-mono text-slate-300">
                  {String(rule.value)}
                </td>
                <td className="px-4 py-3 font-mono text-slate-300">
                  {rule.priority}
                </td>
                <td className="px-4 py-3 text-right">
                  {confirmRuleId === rule.id ? (
                    <div
                      className="inline-flex flex-col items-end gap-2 rounded-lg border border-red-900/50 bg-red-950/20 p-3"
                      role="alertdialog"
                      aria-labelledby={`delete-confirm-${rule.id}`}
                    >
                      <p
                        id={`delete-confirm-${rule.id}`}
                        className="text-xs text-red-200"
                      >
                        ¿Eliminar esta regla?
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={deletingRuleId === rule.id}
                          onClick={() => void handleConfirmDelete(rule.id)}
                          className="rounded bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          {deletingRuleId === rule.id
                            ? "Eliminando…"
                            : "Confirmar"}
                        </button>
                        <button
                          type="button"
                          disabled={deletingRuleId === rule.id}
                          onClick={() => setConfirmRuleId(null)}
                          className="text-xs text-slate-400 hover:text-slate-200"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRuleId(rule.id)}
                      className="rounded bg-slate-800 px-3 py-1 text-xs font-medium text-red-300 hover:bg-slate-700"
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
