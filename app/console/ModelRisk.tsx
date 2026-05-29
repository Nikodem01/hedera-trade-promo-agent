"use client";
// Model Risk & Quality — the evidence a financial-services buyer diligences before
// trusting AI to move money (OCC-style MRM): validation, independent review, live
// monitoring, explainability, model lineage. Computed off-chain from the sealed decision
// dossiers (/api/quality); nothing here is published on-chain.
import { useCallback, useEffect, useState } from "react";

type Quality = {
  count: number;
  mean_confidence: number | null;
  reviewer_concurrence_rate: number | null;
  reviewer_reviewed: number;
  safety_gate_escalations: number;
  citation_integrity_rate: number | null;
  citations_checked: number;
  model_registry: Record<string, number>;
  validation: { n?: number; accuracy?: number } | null;
};

const pct = (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x * 100)}%`);

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>{label}</span>
      <span className="text-[20px] font-semibold tabular-nums leading-none" style={accent ? { color: "var(--emerald)" } : undefined}>{value}</span>
      {sub && <span className="mono text-[9px]" style={{ color: "var(--ink-faint)" }}>{sub}</span>}
    </div>
  );
}

export function ModelRisk({ refreshKey }: { refreshKey?: number }) {
  const [d, setD] = useState<Quality | null>(null);
  const load = useCallback(async () => {
    try { setD(await (await fetch("/api/quality", { cache: "no-store" })).json()); } catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (!d || d.count === 0) return null;
  const models = Object.keys(d.model_registry);

  return (
    <section className="max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-2 pb-2">
      <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
        <div className="px-5 md:px-6 py-2.5 hairline-b flex items-center justify-between gap-2.5 flex-wrap" style={{ background: "linear-gradient(180deg, var(--paper-2), var(--paper))" }}>
          <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>Model risk &amp; quality · MRM (off-chain)</span>
          {d.validation?.accuracy != null && (
            <span className="mono text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-sm" style={{ color: "var(--emerald)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
              pilot validation {pct(d.validation.accuracy)} · N={d.validation.n ?? "?"}
            </span>
          )}
        </div>
        <div className="px-5 md:px-6 py-4 flex flex-wrap items-end gap-x-9 gap-y-4">
          <Stat label="Adjudications monitored" value={String(d.count)} />
          <Stat label="Reviewer concurrence" value={pct(d.reviewer_concurrence_rate)} sub={`${d.reviewer_reviewed} independently reviewed`} accent />
          <Stat label="Citation integrity" value={pct(d.citation_integrity_rate)} sub={`${d.citations_checked} clause cites checked`} />
          <Stat label="Safety-gate holds" value={String(d.safety_gate_escalations)} sub="auto-escalated to human" />
          <Stat label="Mean confidence" value={d.mean_confidence == null ? "—" : d.mean_confidence.toFixed(2)} />
          <div className="flex flex-col gap-0.5">
            <span className="mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>Model lineage</span>
            <span className="mono text-[11px]" style={{ color: "var(--ink-mute)" }}>{models.length ? models.join(", ") : "—"}</span>
          </div>
        </div>
        <div className="px-5 md:px-6 py-2 hairline-t">
          <span className="mono text-[9px]" style={{ color: "var(--ink-faint)" }}>OCC-style model-risk evidence — validation · independent review · live monitoring · explainability · model lineage. Computed from sealed decision dossiers; never published on-chain.</span>
        </div>
      </div>
    </section>
  );
}
