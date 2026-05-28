"use client";
// The composed PromoProof surfaces: header, claim picker, timeline, verdict,
// evidence request, settlement receipt, composer.
import { useState } from "react";
import type {
  ComplianceAssessmentType,
  SettlementProposalType,
} from "@/lib/plugins/tpp-evaluator/schemas";
import { HASHSCAN, SCENARIOS, type Scenario, type ToolCall } from "./data";

/** Minimal header shape the verdict/settlement cards read — satisfied by both the
 * demo Scenario and a synthesized live claim. */
export type CardScenario = {
  retailer: string;
  promotion: string;
  claimId?: string;
  contractId?: string;
  maxHbar?: number;
};

export type HashScanLinks = typeof HASHSCAN;
import {
  DECISION_META,
  COLORS,
  DecisionBadge,
  StatusChip,
  ClauseChip,
  ConfidenceMeter,
  Stat,
  TestnetPill,
  ProofPhoto,
  ToolDot,
  ExternalIcon,
  DocSeal,
  WordmarkGlyph,
  truncMid,
} from "./primitives";

export function Header() {
  return (
    <header className="hairline-b">
      <div className="max-w-[1100px] mx-auto px-6 md:px-8 py-5 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <WordmarkGlyph />
          <div className="flex items-baseline gap-2.5">
            <div className="text-[19px] font-semibold tracking-[-0.01em]">PromoProof</div>
            <div className="mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: "var(--ink-faint)" }}>
              v0.4 · trade-promo audit
            </div>
          </div>
        </div>
        <div className="hidden md:block text-[13px] leading-snug max-w-[460px]" style={{ color: "var(--ink-mute)" }}>
          Reads the contract. Judges the proof. <span style={{ color: "var(--ink)" }}>Negotiates.</span> Settles on Hedera.
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <TestnetPill />
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-[10px] uppercase tracking-[0.14em] mono" style={{ color: "var(--ink-faint)" }}>Operator</span>
            <span className="mono text-[12.5px] font-medium">{HASHSCAN.operatorId}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export function ClaimPicker({ active, onSelect }: { active: string | null; onSelect: (id: string) => void }) {
  const claims = Object.values(SCENARIOS);
  return (
    <section className="max-w-[1100px] mx-auto px-6 md:px-8 pt-6 pb-4 w-full">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="mono text-[10.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>
          Active claims · awaiting adjudication
        </h2>
        <span className="mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: "var(--ink-faint)" }}>
          {claims.length} pending
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {claims.map((c) => {
          const isActive = active === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="text-left p-4 rounded-[4px] relative group transition-all"
              style={{
                background: isActive ? "var(--paper)" : "var(--paper-2)",
                boxShadow: isActive
                  ? "inset 0 0 0 1.5px var(--ink), 0 6px 18px rgba(22,22,26,0.06)"
                  : "inset 0 0 0 1px var(--keyline)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[14px] font-semibold leading-tight">{c.retailer}</div>
                  <div className="mono text-[10.5px] uppercase tracking-[0.12em] mt-0.5" style={{ color: "var(--ink-faint)" }}>{c.retailerId}</div>
                </div>
                {isActive && (
                  <span className="mono text-[9.5px] uppercase tracking-[0.16em] font-medium px-1.5 py-0.5 rounded-sm" style={{ background: "var(--ink)", color: "var(--paper)" }}>
                    Active
                  </span>
                )}
              </div>
              <div className="mt-3 text-[13px] leading-snug" style={{ color: "var(--ink-2)" }}>{c.promotion}</div>
              <div className="text-[11.5px] mt-0.5" style={{ color: "var(--ink-faint)" }}>{c.promoSub}</div>
              <div className="mt-3 pt-3 hairline-t flex items-center justify-between">
                <span className="text-[10.5px] uppercase tracking-[0.14em] mono" style={{ color: "var(--ink-faint)" }}>Max settle</span>
                <span className="mono text-[13px] font-semibold tabular-nums">{c.maxHbar} HBAR</span>
              </div>
              <div className="serif text-[10.5px] italic mt-1.5" style={{ color: "var(--ink-faint)" }}>{c.expected}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type RowKind = "submission" | "tool" | "reason" | "verdict" | "evidence" | "settle";

export function TimelineRow({ kind, time, children, idx = 0 }: { kind: RowKind; time?: string; children: React.ReactNode; last?: boolean; idx?: number }) {
  const DOT: Record<RowKind, { bg: string; ring: string }> = {
    submission: { bg: "var(--ink)", ring: "rgba(22,22,26,0.15)" },
    tool: { bg: "var(--paper)", ring: "var(--keyline-2)" },
    reason: { bg: "var(--paper-2)", ring: "var(--keyline-2)" },
    verdict: { bg: "var(--emerald)", ring: "rgba(11,93,59,0.18)" },
    evidence: { bg: "var(--blue)", ring: "rgba(29,78,216,0.18)" },
    settle: { bg: "var(--emerald)", ring: "rgba(11,93,59,0.22)" },
  };
  const d = DOT[kind] || DOT.tool;
  return (
    <div className="relative grid grid-cols-[28px_1fr] gap-3 pb-5" style={{ animationDelay: `${idx * 60}ms` }}>
      <div className="relative">
        <i className="absolute left-[5px] top-[5px] block w-3 h-3 rounded-full" style={{ background: d.bg, boxShadow: `0 0 0 4px var(--paper), 0 0 0 5px ${d.ring}` }} />
      </div>
      <div className="min-w-0">
        {time && (
          <div className="mono text-[10px] uppercase tracking-[0.14em] mb-1" style={{ color: "var(--ink-faint)" }}>{time}</div>
        )}
        {children}
      </div>
    </div>
  );
}

function KV({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col leading-tight min-w-0">
      <span className="text-[9.5px] uppercase tracking-[0.14em] mono" style={{ color: "var(--ink-faint)" }}>{label}</span>
      <span className={(mono ? "mono " : "") + "text-[11.5px] truncate"} style={{ color: "var(--ink)" }}>{value}</span>
    </div>
  );
}

export function ClaimSubmission({ scenario }: { scenario: Scenario }) {
  return (
    <div className="rounded-[4px] p-4 grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] gap-4" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
      <ProofPhoto caption={scenario.photoCaption} tone={scenario.photoTone} small />
      <div className="min-w-0 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.14em] mono font-medium" style={{ color: "var(--ink-faint)" }}>Analyst submission</div>
            <div className="text-[14px] font-semibold mt-0.5">{scenario.retailer} · {scenario.promotion}</div>
          </div>
          <span className="mono text-[10.5px]" style={{ color: "var(--ink-faint)" }}>{scenario.claimId}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-1">
          <KV label="Contract" value={scenario.contractId} mono />
          <KV label="Max settle" value={`${scenario.maxHbar} HBAR`} mono />
          <KV label="Submitted" value={scenario.submittedAt} mono />
          <KV label="By" value={scenario.submittedBy} />
        </div>
        <blockquote className="serif mt-2 pl-3 text-[13px] leading-snug border-l-2 italic" style={{ borderColor: "var(--keyline-2)", color: "var(--ink-2)" }}>
          “{scenario.narrative}”
        </blockquote>
      </div>
    </div>
  );
}

export function ToolChip({ tool, args, result, state = "done", expanded = false, onToggle, error }: { tool: string; args: string; result: string; state?: "running" | "done" | "error" | "queued"; expanded?: boolean; onToggle?: () => void; error?: string }) {
  const open = expanded;
  return (
    <div className="rounded-[3px] overflow-hidden" style={{ background: open ? "var(--paper)" : "transparent", boxShadow: open ? "inset 0 0 0 1px var(--keyline)" : "none" }}>
      <button onClick={onToggle} className="w-full grid gap-3 items-center px-2 py-1.5 text-left hover:bg-[var(--paper)]" style={{ gridTemplateColumns: "14px minmax(0,200px) 1fr auto" }}>
        <ToolDot state={error ? "error" : state} />
        <span className="mono text-[12px] font-medium truncate" style={{ color: error ? "var(--red)" : "var(--ink)" }}>{tool}</span>
        <span className="mono text-[11.5px] truncate" style={{ color: "var(--ink-mute)" }}>
          {error ? "error · " + error : state === "running" ? "running…" : result}
        </span>
        <span className="mono text-[10px]" style={{ color: "var(--ink-faint)" }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-2 pb-2.5 grid sm:grid-cols-2 gap-x-4 gap-y-1.5" style={{ borderTop: "1px solid var(--keyline-soft)" }}>
          <div className="pt-2">
            <div className="text-[9.5px] uppercase tracking-[0.14em] mono" style={{ color: "var(--ink-faint)" }}>args</div>
            <div className="mono text-[11.5px] break-all">{args}</div>
          </div>
          <div className="pt-2">
            <div className="text-[9.5px] uppercase tracking-[0.14em] mono" style={{ color: "var(--ink-faint)" }}>result</div>
            <div className="mono text-[11.5px] break-all" style={{ color: error ? "var(--red)" : "var(--ink)" }}>{error || result}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ToolChipList({ chips, runningIdx, errorIdx }: { chips: ToolCall[]; runningIdx?: number | null; errorIdx?: number | null }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (i: number) => {
    const s = new Set(open);
    s.has(i) ? s.delete(i) : s.add(i);
    setOpen(s);
  };
  return (
    <div className="flex flex-col gap-0.5">
      {chips.map((c, i) => {
        let state: "running" | "done" | "queued" = "done";
        if (i === runningIdx) state = "running";
        if (i > (runningIdx ?? Infinity)) state = "queued";
        const err = i === errorIdx ? "rate_limited (will retry)" : undefined;
        return <ToolChip key={i + c.tool} {...c} state={state} error={err} expanded={open.has(i)} onToggle={() => toggle(i)} />;
      })}
    </div>
  );
}

export function ReasoningBlock({ children, label = "Agent reasoning" }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="px-1">
      <div className="text-[9.5px] uppercase tracking-[0.14em] mono font-medium mb-1.5" style={{ color: "var(--ink-faint)" }}>{label}</div>
      <div className="serif italic text-[13.5px] leading-[1.55]" style={{ color: "var(--ink-2)" }}>{children}</div>
    </div>
  );
}

export function VerdictCard({ assessment, scenario, revised = false }: { assessment: ComplianceAssessmentType; scenario: CardScenario; revised?: boolean }) {
  const meta = DECISION_META[assessment.decision];
  return (
    <article className="rounded-[5px] overflow-hidden anim-reveal" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2), 0 10px 30px rgba(22,22,26,0.05)" }}>
      <div className="px-5 md:px-6 py-3 flex items-center justify-between hairline-b" style={{ background: "linear-gradient(180deg, var(--paper-2), var(--paper))" }}>
        <div className="flex items-center gap-3">
          <DocSeal />
          <div className="flex flex-col leading-tight">
            <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>
              Compliance assessment {revised && <span style={{ color: "var(--amber)" }}>· revised</span>}
            </span>
            <span className="text-[13px] font-semibold">{scenario.retailer} · {scenario.promotion}</span>
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end leading-tight">
          <span className="mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>Claim</span>
          <span className="mono text-[11.5px] font-medium">{scenario.claimId ?? "—"}</span>
        </div>
      </div>

      <div className="px-5 md:px-6 py-5 grid grid-cols-1 md:grid-cols-[auto_1fr_auto_auto] gap-x-6 gap-y-4 items-end hairline-b">
        <div className="anim-seal"><DecisionBadge decision={assessment.decision} /></div>
        <ConfidenceMeter value={assessment.confidence} color={meta.color} />
        <Stat label="Recommended credit" value={assessment.recommended_credit_pct + ""} unit="%" accent={meta.color === "emerald" || meta.color === "amber"} />
        <Stat label="Max settlement" value={assessment.max_settlement_hbar + ""} unit="HBAR" mono />
      </div>

      <div className="px-5 md:px-6 py-4">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="mono text-[10.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>Criteria · clause-by-clause finding</h3>
          <span className="mono text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>{assessment.criteria.length} clauses</span>
        </div>

        <div className="crit-table">
          <div className="grid gap-x-4 px-2 py-2 text-[10px] uppercase tracking-[0.14em] mono font-medium hairline-b" style={{ gridTemplateColumns: "56px minmax(180px, 1.4fr) 110px 1.6fr 1.2fr", color: "var(--ink-faint)" }}>
            <span>Ref</span><span>Requirement</span><span>Status</span><span>Observed in photo</span><span>Concern</span>
          </div>
          {assessment.criteria.map((cr, i) => (
            <div key={i} className="grid gap-x-4 px-2 py-3 text-[12.5px] leading-snug" style={{ gridTemplateColumns: "56px minmax(180px, 1.4fr) 110px 1.6fr 1.2fr", boxShadow: i === assessment.criteria.length - 1 ? "none" : "inset 0 -1px 0 var(--keyline-soft)" }}>
              <div><ClauseChip>{cr.clause_ref}</ClauseChip></div>
              <div style={{ color: "var(--ink)" }}>{cr.requirement}</div>
              <div><StatusChip status={cr.status} /></div>
              <div style={{ color: "var(--ink-2)" }}>{cr.observed_in_photo}</div>
              <div style={{ color: cr.concern ? "var(--ink-2)" : "var(--ink-faint)" }}>{cr.concern || <span style={{ color: "var(--ink-faint)" }}>—</span>}</div>
            </div>
          ))}
        </div>

        <div className="crit-cards flex-col gap-2" style={{ display: "none" }}>
          {assessment.criteria.map((cr, i) => (
            <div key={i} className="rounded-[3px] p-3" style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
              <div className="flex items-center justify-between mb-1.5"><ClauseChip>{cr.clause_ref}</ClauseChip><StatusChip status={cr.status} /></div>
              <div className="text-[13px] font-medium mb-2">{cr.requirement}</div>
              <div className="text-[11px] uppercase tracking-[0.14em] mono mb-0.5" style={{ color: "var(--ink-faint)" }}>Observed</div>
              <div className="text-[12.5px] mb-2" style={{ color: "var(--ink-2)" }}>{cr.observed_in_photo}</div>
              {cr.concern && (
                <>
                  <div className="text-[11px] uppercase tracking-[0.14em] mono mb-0.5" style={{ color: "var(--ink-faint)" }}>Concern</div>
                  <div className="text-[12.5px]" style={{ color: "var(--ink-2)" }}>{cr.concern}</div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 md:px-6 pb-5">
        <div className="text-[11px] uppercase tracking-[0.14em] mono font-medium mb-1.5" style={{ color: "var(--ink-faint)" }}>Reasoning summary</div>
        <p className="serif italic text-[14px] leading-[1.55]" style={{ color: "var(--ink)" }}>“{assessment.reasoning_summary}”</p>
      </div>

      <div className="px-5 md:px-6 py-2.5 flex items-center justify-between hairline-t" style={{ background: "var(--paper-2)" }}>
        <span className="mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>Issued by PromoProof · model adjudicator</span>
        <span className="mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>Pending operator approval</span>
      </div>
    </article>
  );
}

export function EvidenceRequest({ text, onSend, replied }: { text?: string; onSend: (v: string) => void; replied: boolean }) {
  const [val, setVal] = useState("");
  return (
    <div className="rounded-[4px] overflow-hidden" style={{ background: "var(--blue-bg)", boxShadow: "inset 0 0 0 1px rgba(29,78,216,0.25)" }}>
      <div className="px-4 md:px-5 py-3 flex items-center gap-2.5 hairline-b" style={{ background: "rgba(29,78,216,0.06)" }}>
        <i className="block w-2 h-2 rounded-full" style={{ background: "var(--blue)" }} />
        <span className="mono text-[10.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--blue)" }}>Negotiation · evidence requested</span>
      </div>
      <div className="px-4 md:px-5 py-4">
        <p className="text-[14.5px] leading-snug font-medium" style={{ color: "var(--ink)" }}>{text}</p>
        {!replied ? (
          <div className="mt-3 flex items-stretch gap-2 rounded-[3px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
            <input
              className="field-bare flex-1 px-3 py-2.5 text-[13px]"
              placeholder="Provide a POS timestamp or dated compliance report…"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && val && onSend(val)}
            />
            <button onClick={() => val && onSend(val)} disabled={!val} className="mono text-[11px] uppercase tracking-[0.14em] font-medium px-3" style={{ background: val ? "var(--blue)" : "var(--paper-sunken)", color: val ? "white" : "var(--ink-faint)", cursor: val ? "pointer" : "not-allowed" }}>
              Send reply
            </button>
          </div>
        ) : (
          <div className="mt-3 rounded-[3px] p-3 hairline-b" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
            <div className="mono text-[10px] uppercase tracking-[0.14em] mb-1" style={{ color: "var(--ink-faint)" }}>Analyst reply · 14:28 UTC</div>
            <div className="serif italic text-[13px]">“Attached: POS log {`{2026-04-04 → 2026-04-16}`}, signed compliance report PDF (dated 2026-04-20). Display ran 12 of 29 contracted days.”</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PreSettlement({ amount, scenario, onApprove }: { amount: number; scenario: CardScenario; onApprove: () => void }) {
  return (
    <div className="rounded-[4px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
      <div className="px-4 md:px-5 py-3 flex items-center justify-between hairline-b" style={{ background: "var(--paper-2)" }}>
        <div className="flex items-center gap-2.5">
          <i className="block w-2 h-2 rounded-full pulse-dot" style={{ background: "var(--emerald)" }} />
          <span className="mono text-[10.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--emerald)" }}>Ready to settle</span>
        </div>
        <span className="mono text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>On approval: HCS · HTS · HBAR transfer</span>
      </div>
      <div className="px-5 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.14em] mono" style={{ color: "var(--ink-faint)" }}>Computed settlement</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="mono text-[34px] font-semibold tabular-nums leading-none" style={{ letterSpacing: "-0.02em" }}>{amount}</span>
            <span className="mono text-[14px] font-medium" style={{ color: "var(--ink-mute)" }}>HBAR</span>
          </div>
          <span className="text-[11.5px] mt-1.5" style={{ color: "var(--ink-faint)" }}>Capped at {scenario.maxHbar ?? "?"} HBAR · contract {scenario.contractId ?? "—"}</span>
        </div>
        <button onClick={onApprove} className="btn-primary mono text-[12px] uppercase tracking-[0.14em] font-semibold px-5 py-3.5 rounded-[3px] inline-flex items-center gap-2.5" style={{ background: "var(--emerald)", color: "white", boxShadow: "0 6px 18px rgba(11,93,59,0.18), inset 0 -1px 0 rgba(0,0,0,0.18)" }}>
          Approve &amp; settle
          <span style={{ opacity: 0.8 }}>→</span>
        </button>
      </div>
    </div>
  );
}

function HashScanLink({ label, sub, id, href }: { label: string; sub: string; id: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="hashscan-link rounded-[3px] px-3 py-2.5 flex flex-col gap-1 group" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.14em] mono font-semibold" style={{ color: "var(--emerald)" }}>{label}</span>
        <span style={{ color: "var(--ink-faint)" }}><ExternalIcon size={11} /></span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="mono text-[11.5px] truncate" style={{ color: "var(--ink)" }}>{id}</span>
        <span className="mono text-[9.5px] uppercase tracking-[0.16em]" style={{ color: "var(--ink-faint)" }}>{sub}</span>
      </div>
    </a>
  );
}

export function SettlementReceipt({ proposal, scenario, partial, links = HASHSCAN }: { proposal: SettlementProposalType; scenario: CardScenario; partial: boolean; links?: HashScanLinks }) {
  return (
    <div className="relative rounded-[5px] overflow-hidden anim-seal" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1.5px var(--emerald), inset 0 0 0 5px var(--paper), inset 0 0 0 6px rgba(11,93,59,0.18), 0 16px 36px rgba(11,93,59,0.10)" }}>
      <div className="absolute right-4 top-4 z-0 stamp-in pointer-events-none select-none">
        <div className="mono text-[11px] uppercase tracking-[0.24em] font-bold px-3 py-1.5 rounded-[2px]" style={{ color: "var(--emerald)", boxShadow: "inset 0 0 0 2px var(--emerald)" }}>
          {partial ? "Settled · partial" : "Settled"}
        </div>
      </div>

      <div className="px-5 md:px-6 py-3 flex items-center gap-2.5 hairline-b" style={{ background: "linear-gradient(180deg, var(--emerald-bg), var(--paper))" }}>
        <DocSeal />
        <div className="flex flex-col leading-tight">
          <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--emerald)" }}>Settlement receipt</span>
          <span className="text-[13px] font-semibold">{scenario.retailer} · {scenario.promotion}</span>
        </div>
      </div>

      <div className="px-5 md:px-6 py-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start relative z-10">
        <div className="flex flex-col">
          <span className="text-[10.5px] uppercase tracking-[0.14em] mono font-medium" style={{ color: "var(--ink-faint)" }}>Amount transferred</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="mono text-[52px] font-semibold tabular-nums leading-none" style={{ letterSpacing: "-0.025em", color: "var(--ink)" }}>{proposal.amount_hbar}</span>
            <span className="mono text-[18px] font-medium" style={{ color: "var(--ink-mute)" }}>HBAR</span>
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2.5">
            <KV label="Credit applied" value={`${proposal.partial_credit_pct}%`} mono />
            <KV label="Of contract max" value={`${proposal.max_settlement_hbar} HBAR`} mono />
            <KV label="Consensus time" value="2026-04-22 14:31:02.418 UTC" mono />
          </div>
          <blockquote className="serif italic mt-4 pl-3 text-[13px] leading-snug border-l-2" style={{ borderColor: "var(--emerald)", color: "var(--ink-2)" }}>“{proposal.justification}”</blockquote>
        </div>
      </div>

      <div className="px-5 md:px-6 py-4 hairline-t" style={{ background: "linear-gradient(180deg, var(--paper), var(--paper-2))" }}>
        <div className="text-[10.5px] uppercase tracking-[0.16em] mono font-medium mb-2" style={{ color: "var(--ink-faint)" }}>Verifiable on Hedera · public testnet</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <HashScanLink label="HCS audit" sub="topic" id={links.hcsAuditId} href={links.hcsAudit} />
          <HashScanLink label="HTS receipt" sub="token" id={links.htsReceiptId} href={links.htsReceipt} />
          <HashScanLink label="HBAR transfer" sub="tx" id={truncMid(links.hbarXferId, 14, 8)} href={links.hbarXfer} />
        </div>
      </div>
    </div>
  );
}

export function RejectAuditCard({ scenario: _scenario, links = HASHSCAN }: { scenario: CardScenario; links?: HashScanLinks }) {
  return (
    <div className="rounded-[4px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
      <div className="px-5 py-3 flex items-center gap-2.5 hairline-b" style={{ background: "linear-gradient(180deg, var(--red-bg), var(--paper))" }}>
        <i className="block w-2 h-2 rounded-full" style={{ background: "var(--red)" }} />
        <span className="mono text-[10.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--red)" }}>Zero-pay · recorded for audit</span>
      </div>
      <div className="px-5 py-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="mono text-[36px] font-semibold tabular-nums leading-none" style={{ letterSpacing: "-0.02em" }}>0.00</span>
            <span className="mono text-[14px] font-medium" style={{ color: "var(--ink-mute)" }}>HBAR transferred</span>
          </div>
          <div className="serif italic text-[12.5px] mt-2" style={{ color: "var(--ink-2)" }}>
            Threshold clause R-1 unmet. The verdict and reasoning are written to the HCS audit topic for an immutable record.
          </div>
        </div>
        <HashScanLink label="HCS audit" sub="topic" id={links.hcsAuditId} href={links.hcsAudit} />
      </div>
    </div>
  );
}

type ComposerState = "empty" | "streaming" | "verdict" | "evidence" | "settled";

export function Composer({ working, scenario, runState, onApprove, onReset, onAdvance }: { working: boolean; scenario: Scenario | null; runState: ComposerState; onApprove: () => void; onReset: () => void; onAdvance: () => void }) {
  const [val, setVal] = useState("");
  const placeholders: Record<ComposerState, string> = {
    empty: "Select a claim above to begin adjudication…",
    streaming: "PromoProof is working…",
    verdict: "Type a directive — approve, request changes, or ask a clarifying question…",
    evidence: "Reply to the evidence request above, or type free-form…",
    settled: "Settled · type 'next claim' to clear and continue",
  };
  const disabled = runState === "empty" || runState === "streaming";
  return (
    <div className="hairline-t" style={{ background: "var(--paper-2)" }}>
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
        <div className="flex-1 flex items-stretch rounded-[4px]" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)", opacity: disabled ? 0.6 : 1 }}>
          <div className="px-3 flex items-center mono text-[10.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)", borderRight: "1px solid var(--keyline)" }}>
            {disabled ? (runState === "empty" ? "Idle" : "Working") : scenario ? scenario.retailer.slice(0, 3).toUpperCase() : "Cmd"}
          </div>
          <input className="field-bare flex-1 px-3 py-2.5 text-[13px]" placeholder={placeholders[runState] || "Message PromoProof…"} value={val} disabled={disabled} onChange={(e) => setVal(e.target.value)} />
          {working && (
            <div className="px-3 flex items-center gap-2 mono text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>
              <i className="block w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--emerald)" }} />
              PromoProof is working…
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {runState === "verdict" && scenario && scenario.assessment.decision === "approve" && (
            <button onClick={onApprove} className="mono text-[11px] uppercase tracking-[0.14em] font-medium px-3 py-2 rounded-[3px]" style={{ background: "var(--emerald)", color: "white" }}>Approve</button>
          )}
          {runState === "verdict" && scenario && scenario.assessment.decision === "reject" && (
            <button onClick={onAdvance} className="mono text-[11px] uppercase tracking-[0.14em] font-medium px-3 py-2 rounded-[3px]" style={{ background: "var(--ink)", color: "var(--paper)" }}>Acknowledge</button>
          )}
          <button onClick={onReset} className="mono text-[11px] uppercase tracking-[0.14em] font-medium px-3 py-2 rounded-[3px]" style={{ background: "transparent", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>Reset</button>
          <button className="mono text-[11px] uppercase tracking-[0.14em] font-medium px-3 py-2 rounded-[3px]" style={{ background: val && !disabled ? "var(--ink)" : "var(--paper-sunken)", color: val && !disabled ? "var(--paper)" : "var(--ink-faint)", cursor: val && !disabled ? "pointer" : "not-allowed" }} disabled={!val || disabled}>Send</button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-8 py-12">
      <div className="rounded-[4px] py-14 px-6 text-center" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[3px] mb-4" style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
          <DocSeal />
        </div>
        <div className="text-[15px] font-semibold mb-1.5">No claim selected</div>
        <div className="text-[13px] max-w-[440px] mx-auto" style={{ color: "var(--ink-mute)" }}>
          Pick a claim above to load the bespoke promotion contract, judge the proof photo against it, and prepare a Hedera settlement.
        </div>
      </div>
    </div>
  );
}
