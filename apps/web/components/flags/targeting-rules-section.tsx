"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getRules } from "@/lib/api";
import type { TargetingRule } from "@/types/rules";
import { RuleForm } from "./rule-form";
import { RulesList } from "./rules-list";

type TargetingRulesSectionProps = {
  /** Endpoints de reglas usan Flag.id, no la key de la URL. */
  flagId: string;
};

function readRulesError(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  return "No se pudieron cargar las reglas";
}

export function TargetingRulesSection({ flagId }: TargetingRulesSectionProps) {
  const router = useRouter();
  const [rules, setRules] = useState<TargetingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      setError(null);
      setLoading(true);

      try {
        const data = await getRules(flagId);
        if (!cancelled) {
          setRules(data);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setError(readRulesError(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, [flagId, router]);

  async function refreshRules() {
    setError(null);
    setRefreshing(true);

    try {
      const data = await getRules(flagId);
      setRules(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      setError(readRulesError(err));
    } finally {
      setRefreshing(false);
    }
  }

  async function retryLoad() {
    setError(null);
    setLoading(true);

    try {
      const data = await getRules(flagId);
      setRules(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      setError(readRulesError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 space-y-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
        Reglas de targeting
      </h2>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando reglas…</p>
      ) : error ? (
        <div className="space-y-3">
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void retryLoad()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {refreshing ? (
            <p className="text-sm text-slate-500">Actualizando reglas…</p>
          ) : null}
          <RulesList
            flagId={flagId}
            rules={rules}
            onRuleDeleted={() => void refreshRules()}
          />
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
            <h3 className="mb-4 text-sm font-medium text-slate-300">
              Nueva regla
            </h3>
            <RuleForm
              flagId={flagId}
              onRuleCreated={() => void refreshRules()}
            />
          </div>
        </>
      )}
    </section>
  );
}
