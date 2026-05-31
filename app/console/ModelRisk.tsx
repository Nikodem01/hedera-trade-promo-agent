"use client";
// Model Risk & Quality view — the evidence a financial-services buyer diligences before
// trusting AI to move money (OCC-style MRM): validation, independent review, live
// monitoring, explainability, model lineage. Computed off-chain from sealed decision
// dossiers plus optional pilot-validation data exposed by /api/quality.
import { useCallback, useEffect, useState } from "react";
import { DecisionBadge } from "./primitives";
import type { ComplianceAssessmentType } from "@/lib/plugins/tpp-evaluator/schemas";

type Decision = ComplianceAssessmentType["decision"];
type ValCase = { id: string; expected: string; actual: string | null; correct: boolean; on_chain_seq?: number | null };
type Quality = {
  count: number;
  decision_mix: Record<string, number>;
  mean_confidence: number | null;
  mean_confidence_by_decision: Record<string, number>;
  reviewer_concurrence_rate: number | null;
  reviewer_reviewed: number;
  safety_gate_escalations: number;
  citation_integrity_rate: number | null;
  citations_checked: number;
  model_registry: Record<string, number>;
  validation: { n?: number; accuracy?: number; methodology?: string; cases?: ValCase[] } | null;
};

const MIX_ORDER = ["approve", "partial_credit", "reject", "request_more_evidence", "escalate_human"];
const pct = (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x * 100)}%`);

function Pillar({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-[4px]" style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
      <span className="mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>{label}</span>
      <span className="text-[22px] font-semibold tabular-nums leading-none" style={accent ? { color: "var(--emerald)" } : undefined}>{value}</span>
      {sub && <span className="mono text-[9px] leading-tight" style={{ color: "var(--ink-faint)" }}>{sub}</span>}
    </div>
  );
}

export function ModelRisk({ refreshKey }: { refreshKey?: number }) {
  const [d, setD] = useState<Quality | null>(null);
  const load = useCallback(async () => {
    try { setD(await (await fetch("/api/quality", { cache: "no-store" })).json()); } catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (!d || d.count === 0) {
    return (
      <section className="max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-6 pb-4">
        <div className="rounded-[5px] py-12 px-6 text-center" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
          <div className="text-[14px] font-semibold mb-1">Model risk &amp; quality</div>
          <div className="text-[12.5px] max-w-[460px] mx-auto" style={{ color: "var(--ink-mute)" }}>Adjudicate a claim to populate live model-risk evidence — reviewer concurrence, citation integrity, safety-gate holds, and model lineage.</div>
        </div>
      </section>
    );
  }

  const models = Object.keys(d.model_registry);
  const cases = d.validation?.cases ?? [];

  return (
    <section className="max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-6 pb-4 flex flex-col gap-3">
      <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
        <div className="px-5 md:px-6 py-2.5 hairline-b flex items-center justify-between gap-2.5 flex-wrap" style={{ background: "linear-gradient(180deg, var(--paper-2), var(--paper))" }}>
          <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>Model risk &amp; quality · OCC-style MRM (off-chain)</span>
          {d.validation?.accuracy != null && (
            <span className="mono text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-sm" style={{ color: "var(--emerald)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
              pilot validation {pct(d.validation.accuracy)} · N={d.validation.n ?? "?"}
            </span>
          )}
        </div>
        <div className="px-5 md:px-6 py-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <Pillar label="Adjudications monitored" value={String(d.count)} sub="live, from sealed dossiers" />
          <Pillar label="Independent review · concurrence" value={pct(d.reviewer_concurrence_rate)} sub={`${d.reviewer_reviewed} second-model audits`} accent />
          <Pillar label="Explainability · citation integrity" value={pct(d.citation_integrity_rate)} sub={`${d.citations_checked} clause cites verified`} />
          <Pillar label="Safety gate · holds" value={String(d.safety_gate_escalations)} sub="low-confidence / flagged → human" />
          <Pillar label="Mean confidence" value={d.mean_confidence == null ? "—" : d.mean_confidence.toFixed(2)} sub="across all decisions" />
          <Pillar label="Model lineage" value={String(models.length || 0)} sub={models.length ? models.join(", ") : "—"} />
        </div>
      </div>

      {cases.length > 0 && (
        <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
          <div className="px-5 md:px-6 py-2.5 hairline-b" style={{ background: "var(--paper-2)" }}>
            <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>Labeled validation · pilot set (on-chain ground truth)</span>
          </div>
          <ul>
            {cases.map((c) => (
              <li key={c.id} className="px-5 md:px-6 py-2.5 hairline-b flex items-center gap-x-4 gap-y-1 flex-wrap">
                <span className="mono text-[11px] font-medium w-16">{c.id}</span>
                <span className="mono text-[11px]" style={{ color: "var(--ink-mute)" }}>expected {c.expected}</span>
                <span className="mono text-[11px]" style={{ color: "var(--ink-faint)" }}>→ got {c.actual ?? "—"}</span>
                <span className="ml-auto mono text-[11px] font-semibold" style={{ color: c.correct ? "var(--emerald)" : "var(--red)" }}>{c.correct ? "✓" : "✗"}{c.on_chain_seq ? ` · seq #${c.on_chain_seq}` : ""}</span>
              </li>
            ))}
          </ul>
          {d.validation?.methodology && (
            <div className="px-5 md:px-6 py-2.5">
              <span className="text-[11px] leading-snug" style={{ color: "var(--ink-mute)" }}>{d.validation.methodology}</span>
            </div>
          )}
        </div>
      )}

      <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
        <div className="px-5 md:px-6 py-2.5 hairline-b flex items-center justify-between gap-2.5 flex-wrap" style={{ background: "var(--paper-2)" }}>
          <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>Decision mix · mean confidence</span>
        </div>
        <div className="px-5 md:px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          {MIX_ORDER.filter((k) => d.decision_mix[k]).map((k) => (
            <span key={k} className="flex items-center gap-2">
              <DecisionBadge decision={k as Decision} size="sm" />
              <span className="mono text-[12px] tabular-nums" style={{ color: "var(--ink-mute)" }}>{d.decision_mix[k]}</span>
              {d.mean_confidence_by_decision[k] != null && (
                <span className="mono text-[10px]" style={{ color: "var(--ink-faint)" }}>· conf {d.mean_confidence_by_decision[k].toFixed(2)}</span>
              )}
            </span>
          ))}
        </div>
        <div className="px-5 md:px-6 py-2 hairline-t">
          <span className="mono text-[9px]" style={{ color: "var(--ink-faint)" }}>Validation · independent review · live monitoring · explainability · model lineage — computed from sealed decision dossiers; never published on-chain.</span>
        </div>
      </div>
    </section>
  );
}
