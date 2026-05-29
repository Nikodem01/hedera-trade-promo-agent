"use client";
// Operator's PRIVATE portfolio view — decision mix + settled value computed from the
// confidential off-chain dossiers (via /api/portfolio). The deliberate contrast with
// the public commitment ledger below it: the operator sees the business detail; the
// world sees only tamper-proof commitments.
import { useCallback, useEffect, useState } from "react";
import type { ComplianceAssessmentType } from "@/lib/plugins/tpp-evaluator/schemas";
import { DecisionBadge } from "./primitives";

type Decision = ComplianceAssessmentType["decision"];
const MIX_ORDER = ["approve", "partial_credit", "reject", "request_more_evidence", "escalate_human"];

export function PortfolioPrivate({ refreshKey }: { refreshKey?: number }) {
  const [data, setData] = useState<{ count: number; mix: Record<string, number>; settledValue: number; recovered: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio", { cache: "no-store" });
      setData(await res.json());
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (!data || data.count === 0) return null;

  return (
    <section className="max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-2 pb-4">
      <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
        <div className="px-5 md:px-6 py-2.5 hairline-b flex items-center justify-between gap-2.5 flex-wrap" style={{ background: "linear-gradient(180deg, var(--paper-2), var(--paper))" }}>
          <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>Operator portfolio · confidential (off-chain)</span>
          <span className="flex items-center gap-2">
            <a href="/api/export?format=csv" className="mono text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-sm" style={{ color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>export CSV</a>
            <a href="/api/export?format=edi" target="_blank" rel="noreferrer" className="mono text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-sm" style={{ color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>EDI-812</a>
          </span>
        </div>
        <div className="px-5 md:px-6 py-4 flex flex-wrap items-end gap-x-9 gap-y-4">
          <div className="flex flex-col gap-0.5">
            <span className="mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>Claims adjudicated</span>
            <span className="text-[20px] font-semibold tabular-nums leading-none">{data.count}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>Approved value</span>
            <span className="text-[20px] font-semibold tabular-nums leading-none">{data.settledValue.toFixed(0)} <span className="text-[12px] font-medium" style={{ color: "var(--ink-mute)" }}>pUSDC</span></span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>Leakage recovered</span>
            <span className="text-[20px] font-semibold tabular-nums leading-none" style={{ color: "var(--emerald)" }}>{(data.recovered ?? 0).toFixed(0)} <span className="text-[12px] font-medium" style={{ color: "var(--ink-mute)" }}>pUSDC</span></span>
            <span className="mono text-[9px]" style={{ color: "var(--ink-faint)" }}>vs paying every claim in full</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>Decision mix</span>
            <div className="flex flex-wrap items-center gap-2.5">
              {MIX_ORDER.filter((d) => data.mix[d]).map((d) => (
                <span key={d} className="flex items-center gap-1.5">
                  <DecisionBadge decision={d as Decision} size="sm" />
                  <span className="mono text-[11px] tabular-nums" style={{ color: "var(--ink-mute)" }}>{data.mix[d]}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
