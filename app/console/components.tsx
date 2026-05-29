"use client";
// The composed PromoProof surfaces: header, claim picker, timeline, verdict,
// evidence request, settlement receipt, composer.
import { useState } from "react";
import type {
  ComplianceAssessmentType,
  SettlementProposalType,
} from "@/lib/plugins/tpp-evaluator/schemas";
import { HASHSCAN, SCENARIOS, type Scenario, type ToolCall } from "./data";
import { scheduleUrl, accountUrl } from "@/lib/hedera/hashscan";

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

/** The verify panel works off the on-chain commitment alone. */
export type VerifyInputs = { commitment: string };

type RevealedField = { label: string; value: string; ok: boolean };
type VerifyResponse = {
  onChain: { sequenceNumber: number; consensusTimestamp: string } | null;
  fields: RevealedField[];
  allFieldsOk: boolean;
  reuse: { detected: boolean; hits: { sequenceNumber: number; consensusTimestamp: string }[] };
};

// Counterparty disclosure scope: reveal only the outcome + economics, prove them,
// expose nothing else (terms, photo, reasoning stay sealed).
const COUNTERPARTY_LABELS = ["decision", "recommended_credit_pct", "max_settlement_hbar"];

function fmtConsensusShort(ts: string): string {
  const secs = Number(ts.split(".")[0]);
  if (!Number.isFinite(secs)) return ts;
  return new Date(secs * 1000).toISOString().replace("T", " ").replace(/:\d\d\.\d+Z$/, " UTC");
}

/** "Verify against chain": pulls a selective disclosure for this commitment (full
 * audit, or a minimal counterparty scope), re-derives each revealed field and proves
 * it against the on-chain Merkle commitment, confirms the commitment is on the Mirror
 * Node, and flags proof-reuse. Nothing confidential is on-chain; the proof is. */
export function VerifyPanel({ commitment }: VerifyInputs) {
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [pkg, setPkg] = useState<string>("");
  const [scope, setScope] = useState<"full" | "counterparty">("full");
  const [copied, setCopied] = useState(false);
  const [errMsg, setErrMsg] = useState<string>("");

  async function run(s: "full" | "counterparty") {
    setScope(s);
    setPhase("loading");
    setCopied(false);
    try {
      const labels = s === "counterparty" ? COUNTERPARTY_LABELS : undefined;
      const dRes = await fetch("/api/disclose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commitment, labels }),
      });
      const disclosure = await dRes.json();
      if (!dRes.ok) throw new Error(disclosure.error || `disclose failed (${dRes.status})`);
      setPkg(JSON.stringify(disclosure, null, 2));
      const vRes = await fetch("/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(disclosure),
      });
      const json = await vRes.json();
      if (!vRes.ok) throw new Error(json.error || `verify failed (${vRes.status})`);
      setData(json as VerifyResponse);
      setPhase("done");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "verify failed");
      setPhase("error");
    }
  }

  const matched = !!data?.onChain;
  const ScopeBtn = ({ s, label }: { s: "full" | "counterparty"; label: string }) => (
    <button
      onClick={() => run(s)}
      disabled={phase === "loading"}
      className="mono text-[10px] uppercase tracking-[0.12em] font-medium px-2.5 py-1 rounded-[3px]"
      style={{ background: scope === s && phase !== "idle" ? "var(--ink)" : "transparent", color: scope === s && phase !== "idle" ? "white" : "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline-2)", cursor: phase === "loading" ? "wait" : "pointer" }}
    >
      {label}
    </button>
  );

  return (
    <div className="px-5 md:px-6 py-3 hairline-t" style={{ background: matched ? "var(--emerald-bg)" : "var(--paper)" }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>
          Selective disclosure · reveal &amp; prove against the chain
        </span>
        <div className="flex items-center gap-1.5">
          <ScopeBtn s="full" label="Full audit" />
          <ScopeBtn s="counterparty" label="Counterparty only" />
        </div>
      </div>
      {phase === "loading" && (
        <div className="mt-2 mono text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-mute)" }}>proving against mirror node…</div>
      )}
      {phase === "idle" && (
        <div className="mt-2 text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
          Choose a scope to reveal only those fields and prove them against the on-chain commitment — everything else stays sealed.
        </div>
      )}

      {phase === "error" && (
        <div className="mt-2 text-[12px]" style={{ color: "var(--red)" }}>{errMsg}</div>
      )}

      {phase === "done" && data && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[12.5px]" style={{ color: matched ? "var(--emerald)" : "var(--ink-mute)" }}>
            <span className="text-[13px]">{matched ? "✓" : "⧖"}</span>
            {matched ? (
              <span>Commitment on the immutable ledger — sequence <b className="mono">#{data.onChain!.sequenceNumber}</b> · {fmtConsensusShort(data.onChain!.consensusTimestamp)}</span>
            ) : (
              <span>Anchored on-chain; awaiting Mirror Node propagation — re-verify in a few seconds.</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[12px]" style={{ color: data.allFieldsOk ? "var(--emerald)" : "var(--red)" }}>
            <span className="text-[13px]">{data.allFieldsOk ? "✓" : "✗"}</span>
            {data.allFieldsOk ? (
              <span><b>{data.fields.length}</b> {scope === "counterparty" ? "disclosed" : ""} field{data.fields.length === 1 ? "" : "s"} proven against commitment <span className="mono" title={commitment}>{truncMid(commitment, 10, 6)}</span> via Merkle proof{scope === "counterparty" ? " — rest stays sealed" : ""}</span>
            ) : (
              <span>One or more revealed fields did NOT match the commitment — tampering detected.</span>
            )}
          </div>
          {/* revealed field list — visibly demonstrates selective disclosure */}
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {data.fields.map((f) => (
              <span key={f.label} className="mono text-[10.5px] flex items-center gap-1.5" style={{ color: "var(--ink-mute)" }}>
                <span style={{ color: f.ok ? "var(--emerald)" : "var(--red)" }}>{f.ok ? "✓" : "✗"}</span>
                {f.label}
                <span style={{ color: "var(--ink-faint)" }}>{f.value.length > 22 ? f.value.slice(0, 22) + "…" : f.value}</span>
              </span>
            ))}
          </div>
          {data.reuse.detected && (
            <div className="flex items-start gap-2 text-[12px] mt-0.5 rounded-[3px] px-2.5 py-1.5" style={{ color: "var(--amber)", background: "var(--amber-bg)" }}>
              <span className="text-[13px]">⚠</span>
              <span>
                Duplicate-proof alert: this photo&apos;s fingerprint is anchored under {data.reuse.hits.length} other claim(s)
                {data.reuse.hits.map((h) => (<span key={h.sequenceNumber}> — seq #{h.sequenceNumber}</span>))}.
              </span>
            </div>
          )}
          <button
            onClick={() => { navigator.clipboard?.writeText(pkg); setCopied(true); }}
            className="self-start mt-1 mono text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-[3px]"
            style={{ background: "transparent", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline-2)", cursor: "pointer" }}
          >
            {copied ? "✓ copied" : "copy disclosure package"}
          </button>
        </div>
      )}
    </div>
  );
}

/** When the agent re-judges after more evidence, this shows what changed:
 * the decision transition + the specific clauses whose status flipped. Proves the
 * agent reasoned over the new evidence, not just re-ran. */
export function RevisionDiff({ prior, current }: { prior: ComplianceAssessmentType; current: ComplianceAssessmentType }) {
  const priorByRef = new Map(prior.criteria.map((c) => [c.clause_ref, c.status]));
  const changes = current.criteria
    .filter((c) => priorByRef.has(c.clause_ref) && priorByRef.get(c.clause_ref) !== c.status)
    .map((c) => ({ ref: c.clause_ref, from: priorByRef.get(c.clause_ref)!, to: c.status }));
  const decisionChanged = prior.decision !== current.decision;
  if (!decisionChanged && changes.length === 0) return null;
  return (
    <div className="rounded-[4px] px-4 py-3 mb-2" style={{ background: "var(--amber-bg)", boxShadow: "inset 0 0 0 1px rgba(180,83,9,0.25)" }}>
      <div className="mono text-[10px] uppercase tracking-[0.16em] font-medium mb-2" style={{ color: "var(--amber)" }}>Re-adjudicated on new evidence · what changed</div>
      {decisionChanged && (
        <div className="flex items-center gap-2 text-[13px] mb-1.5">
          <span className="mono uppercase text-[11px]" style={{ color: "var(--ink-mute)" }}>{prior.decision.replace(/_/g, " ")}</span>
          <span style={{ color: "var(--amber)" }}>→</span>
          <span className="mono uppercase text-[11px] font-semibold" style={{ color: "var(--ink)" }}>{current.decision.replace(/_/g, " ")}</span>
        </div>
      )}
      {changes.length > 0 && (
        <div className="flex flex-col gap-1">
          {changes.map((ch) => (
            <div key={ch.ref} className="text-[12px] flex items-center gap-2">
              <ClauseChip>{ch.ref}</ClauseChip>
              <span className="mono text-[11px]" style={{ color: "var(--ink-mute)" }}>{ch.from}</span>
              <span style={{ color: "var(--amber)" }}>→</span>
              <span className="mono text-[11px] font-medium" style={{ color: "var(--ink)" }}>{ch.to}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Straight-through-processing policy. Claims clearing BOTH thresholds are eligible
// for auto-processing; everything else routes to a human reviewer. This only LABELS
// the route — the human consent gate is ALWAYS enforced before any funds move
// (the mainnet safeguard / no-drain rule), so the policy can never auto-drain.
const STP_MIN_CONFIDENCE = 0.9;
const STP_MAX_HBAR = 25;

function stpStatus(a: ComplianceAssessmentType): { eligible: boolean; reason: string } {
  if (a.decision !== "approve") return { eligible: false, reason: `${a.decision.replace(/_/g, " ")} — reviewer` };
  if (a.confidence < STP_MIN_CONFIDENCE) return { eligible: false, reason: `confidence ${a.confidence} < ${STP_MIN_CONFIDENCE}` };
  if (a.max_settlement_hbar > STP_MAX_HBAR) return { eligible: false, reason: `${a.max_settlement_hbar} > ${STP_MAX_HBAR} HBAR cap` };
  return { eligible: true, reason: `conf ${a.confidence} ≥ ${STP_MIN_CONFIDENCE} · ≤ ${STP_MAX_HBAR} HBAR` };
}

const OVERRIDE_DECISIONS = ["approve", "partial_credit", "reject", "request_more_evidence", "escalate_human"];

/** Human-in-command oversight: an analyst overturns the AI decision; the override
 * (who, prior→new, why) is anchored to HCS as its own proof-only commitment linked
 * to the original — tamper-proof oversight evidence (EU AI Act Art. 14). */
export function OverridePanel({ commitment, priorDecision }: { commitment: string; priorDecision: string }) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ commitment: string; seq?: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!decision || !reason.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/override", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ original_commitment: commitment, prior_decision: priorDecision, new_decision: decision, reason: reason.trim(), analyst: "analyst" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "override failed");
      setDone({ commitment: d.commitment, seq: d.anchor?.sequenceNumber });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "override failed");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="px-5 md:px-6 py-2.5 hairline-t" style={{ background: "var(--amber-bg)" }}>
        <span className="text-[12px]" style={{ color: "var(--amber)" }}>
          ✓ Human override recorded on-chain{done.seq ? ` · seq #${done.seq}` : ""} — {priorDecision.replace(/_/g, " ")} ⟶ <b>{decision.replace(/_/g, " ")}</b> · commitment <span className="mono">{truncMid(done.commitment, 8, 6)}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="px-5 md:px-6 py-2.5 hairline-t">
      {!open ? (
        <button onClick={() => setOpen(true)} className="mono text-[10px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-[3px]" style={{ background: "transparent", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline-2)", cursor: "pointer" }}>
          ⊻ Analyst override
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--ink-faint)" }}>Human oversight · overturn the AI decision (recorded on-chain)</span>
          <div className="flex gap-2 flex-wrap items-center">
            <select value={decision} onChange={(e) => setDecision(e.target.value)} className="text-[12px] px-2 py-1.5 rounded-[3px]" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
              <option value="">new decision…</option>
              {OVERRIDE_DECISIONS.filter((d) => d !== priorDecision).map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}
            </select>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="reason (recorded on-chain)" className="field-bare flex-1 min-w-[180px] text-[12px] px-2 py-1.5 rounded-[3px]" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }} />
            <button onClick={submit} disabled={!decision || !reason.trim() || busy} className="mono text-[10.5px] uppercase tracking-[0.14em] px-3 py-1.5 rounded-[3px]" style={{ background: decision && reason.trim() && !busy ? "var(--ink)" : "var(--paper-sunken)", color: decision && reason.trim() && !busy ? "white" : "var(--ink-faint)", cursor: decision && reason.trim() && !busy ? "pointer" : "not-allowed" }}>
              {busy ? "recording…" : "Record override"}
            </button>
          </div>
          {err && <span className="text-[12px]" style={{ color: "var(--red)" }}>{err}</span>}
        </div>
      )}
    </div>
  );
}

type AuthenticityInfo = { has_capture_metadata: boolean; capture_time?: string; gps?: string; camera?: string; manipulation_likelihood?: number; manipulation_note?: string };

export function VerdictCard({ assessment, scenario, revised = false, provenance, onClauseClick, verify, imageSrc, authenticity, citations, review }: { assessment: ComplianceAssessmentType; scenario: CardScenario; revised?: boolean; provenance?: { model: string; adjudicated_at: string; commitment: string; image_fp?: string }; onClauseClick?: (ref: string) => void; verify?: VerifyInputs; imageSrc?: string; authenticity?: AuthenticityInfo; citations?: { ref: string; verified: boolean }[]; review?: { agrees: boolean; concern: string; recommended_action: "accept" | "escalate" } }) {
  const citeOk = citations ? citations.filter((c) => c.verified).length : 0;
  const citeBad = citations ? citations.filter((c) => !c.verified) : [];
  const stp = stpStatus(assessment);
  const meta = DECISION_META[assessment.decision];
  const [activeBox, setActiveBox] = useState<number | null>(null);
  const boxColor = (status: string) => (status === "met" ? "var(--emerald)" : status === "unmet" ? "var(--red)" : "var(--amber)");
  const boxed = assessment.criteria
    .map((c, i) => ({ c, i }))
    .filter((x) => Array.isArray(x.c.box) && x.c.box!.length === 4);
  const renderClause = (ref: string) =>
    onClauseClick ? (
      <button onClick={() => onClauseClick(ref)} title="Show this clause in the contract" className="cursor-pointer" style={{ background: "none", border: 0, padding: 0 }}>
        <ClauseChip>{ref}</ClauseChip>
      </button>
    ) : (
      <ClauseChip>{ref}</ClauseChip>
    );
  return (
    <article className="rounded-[5px] overflow-hidden anim-reveal" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2), 0 10px 30px rgba(22,22,26,0.05)" }}>
      <div className="px-5 md:px-6 py-3 flex items-center justify-between hairline-b" style={{ background: "linear-gradient(180deg, var(--paper-2), var(--paper))" }}>
        <div className="flex items-center gap-3">
          <DocSeal />
          <div className="flex flex-col leading-tight">
            <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium flex items-center gap-2 flex-wrap" style={{ color: "var(--ink-faint)" }}>
              Compliance assessment {revised && <span style={{ color: "var(--amber)" }}>· revised</span>}
              {review && (
                <span className="px-1.5 py-0.5 rounded-sm" title={review.concern && review.concern !== "none" ? `Reviewer concern: ${review.concern}` : "Independent reviewer concurs"} style={{ color: review.agrees ? "var(--emerald)" : "var(--red)", background: review.agrees ? "var(--emerald-bg)" : "var(--red-bg)", boxShadow: `inset 0 0 0 1px ${review.agrees ? "rgba(11,93,59,0.2)" : "rgba(185,28,28,0.25)"}` }}>
                  {review.agrees ? "✓ 2nd-model review concurs" : `⚠ reviewer: ${review.recommended_action}`}
                </span>
              )}
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

      {imageSrc && boxed.length > 0 && (
        <div className="px-5 md:px-6 py-4 hairline-b">
          <div className="mono text-[10.5px] uppercase tracking-[0.16em] font-medium mb-2" style={{ color: "var(--ink-faint)" }}>Visual findings · where the model looked</div>
          <div className="relative inline-block rounded-[4px] overflow-hidden" style={{ maxWidth: "100%", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc} alt="proof with visual findings" className="block max-w-full max-h-[340px] object-contain" />
            {boxed.map(({ c, i }) => {
              const [ymin, xmin, ymax, xmax] = c.box as number[];
              const active = activeBox === i;
              const color = boxColor(c.status);
              return (
                <div
                  key={i}
                  onMouseEnter={() => setActiveBox(i)}
                  onMouseLeave={() => setActiveBox(null)}
                  className="absolute"
                  style={{
                    left: `${xmin / 10}%`, top: `${ymin / 10}%`,
                    width: `${(xmax - xmin) / 10}%`, height: `${(ymax - ymin) / 10}%`,
                    border: `2px solid ${color}`, borderRadius: 3,
                    background: active ? "rgba(255,255,255,0.10)" : "transparent",
                    boxShadow: active ? `0 0 0 2px ${color}` : "none",
                    opacity: activeBox === null || active ? 1 : 0.4,
                    transition: "opacity .12s ease, box-shadow .12s ease", cursor: "pointer",
                  }}
                >
                  <span className="absolute left-0 mono text-[9px] px-1 rounded-sm" style={{ top: -14, background: color, color: "white", whiteSpace: "nowrap" }}>{c.clause_ref}</span>
                </div>
              );
            })}
          </div>
          <div className="mono text-[9.5px] mt-1.5" style={{ color: "var(--ink-faint)" }}>Boxes are the model&apos;s own visual grounding — hover a criterion below to isolate where it was observed.</div>
        </div>
      )}

      <div className="px-5 md:px-6 py-4">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="mono text-[10.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>Criteria · clause-by-clause finding</h3>
          {citations && citations.length > 0 ? (
            <span className="mono text-[10px] uppercase tracking-[0.12em]" style={{ color: citeBad.length ? "var(--red)" : "var(--emerald)" }} title={citeBad.length ? `Unverified citations: ${citeBad.map((c) => c.ref).join(", ")}` : "Every cited clause exists in the contract"}>
              {citeBad.length ? `⚠ ${citeBad.length} citation${citeBad.length === 1 ? "" : "s"} unverified` : `✓ ${citeOk}/${citations.length} citations verified`}
            </span>
          ) : (
            <span className="mono text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>{assessment.criteria.length} clauses</span>
          )}
        </div>

        <div className="crit-table">
          <div className="grid gap-x-4 px-2 py-2 text-[10px] uppercase tracking-[0.14em] mono font-medium hairline-b" style={{ gridTemplateColumns: "56px minmax(180px, 1.4fr) 110px 1.6fr 1.2fr", color: "var(--ink-faint)" }}>
            <span>Ref</span><span>Requirement</span><span>Status</span><span>Observed in photo</span><span>Concern</span>
          </div>
          {assessment.criteria.map((cr, i) => (
            <div
              key={i}
              onMouseEnter={() => Array.isArray(cr.box) && setActiveBox(i)}
              onMouseLeave={() => setActiveBox(null)}
              className="grid gap-x-4 px-2 py-3 text-[12.5px] leading-snug"
              style={{ gridTemplateColumns: "56px minmax(180px, 1.4fr) 110px 1.6fr 1.2fr", boxShadow: i === assessment.criteria.length - 1 ? "none" : "inset 0 -1px 0 var(--keyline-soft)", background: activeBox === i ? "var(--paper-2)" : "transparent", cursor: Array.isArray(cr.box) ? "pointer" : "default" }}
            >
              <div>{renderClause(cr.clause_ref)}</div>
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
              <div className="flex items-center justify-between mb-1.5">{renderClause(cr.clause_ref)}<StatusChip status={cr.status} /></div>
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

      {authenticity && (() => {
        const ml = authenticity.manipulation_likelihood;
        const flag = ml != null && ml >= 0.4;
        return (
          <div className="px-5 md:px-6 py-3 hairline-t">
            <div className="mono text-[10px] uppercase tracking-[0.16em] font-medium mb-1.5" style={{ color: "var(--ink-faint)" }}>Evidence authenticity</div>
            <div className="flex flex-col gap-1 text-[12px]" style={{ color: "var(--ink-2)" }}>
              <div className="flex items-center gap-2">
                <span style={{ color: authenticity.has_capture_metadata ? "var(--emerald)" : "var(--amber)" }}>{authenticity.has_capture_metadata ? "✓" : "○"}</span>
                {authenticity.has_capture_metadata ? (
                  <span>Capture metadata present{authenticity.capture_time ? ` · ${authenticity.capture_time.replace("T", " ").replace(/\..*/, " UTC")}` : ""}{authenticity.gps ? ` · ${authenticity.gps}` : ""}{authenticity.camera ? ` · ${authenticity.camera}` : ""}</span>
                ) : (
                  <span>No verifiable capture metadata (EXIF stripped or stock image) — reduces date/location corroboration</span>
                )}
              </div>
              {ml != null && (
                <div className="flex items-center gap-2">
                  <span style={{ color: flag ? "var(--red)" : "var(--emerald)" }}>{flag ? "⚠" : "✓"}</span>
                  <span>Manipulation signal {(ml * 100).toFixed(0)}%{authenticity.manipulation_note ? ` — ${authenticity.manipulation_note}` : ""}</span>
                </div>
              )}
              <div className="mono text-[9.5px]" style={{ color: "var(--ink-faint)" }}>Proof-reuse across claims is checked on-chain (image fingerprint) in Verify, below.</div>
            </div>
          </div>
        );
      })()}

      <div className="px-5 md:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap hairline-t" style={{ background: "var(--paper-2)" }}>
        <span className="mono text-[10px] tracking-[0.04em]" style={{ color: "var(--ink-faint)" }}>
          {provenance ? (
            <>model <span style={{ color: "var(--ink-mute)" }}>{provenance.model}</span> · commitment <span title={provenance.commitment} style={{ color: "var(--ink-mute)" }}>{truncMid(provenance.commitment, 10, 6)}</span> · <a href={`/api/credential?commitment=${provenance.commitment}`} className="underline" style={{ color: "var(--ink-mute)" }} title="Download a W3C Verifiable Credential attestation">↓ VC</a></>
          ) : (
            "Issued by PromoProof · model adjudicator"
          )}
        </span>
        <span
          className="mono text-[9.5px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-sm"
          title={`Straight-through-processing policy: auto-clear only when confidence ≥ ${STP_MIN_CONFIDENCE} and contract max ≤ ${STP_MAX_HBAR} HBAR. The human consent gate is enforced before any funds move, regardless.`}
          style={{
            color: stp.eligible ? "var(--emerald)" : "var(--amber)",
            background: stp.eligible ? "var(--emerald-bg)" : "var(--amber-bg)",
            boxShadow: `inset 0 0 0 1px ${stp.eligible ? "rgba(11,93,59,0.20)" : "rgba(180,83,9,0.25)"}`,
          }}
        >
          {stp.eligible ? "STP-eligible" : "Manual review"} · {stp.reason}
        </span>
      </div>

      {provenance && <OverridePanel commitment={provenance.commitment} priorDecision={assessment.decision} />}
      {verify && <VerifyPanel {...verify} />}
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
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-[10.5px] uppercase tracking-[0.16em] mono font-medium" style={{ color: "var(--ink-faint)" }}>Verifiable on Hedera · public testnet</span>
          <button onClick={() => window.print()} className="no-print mono text-[10px] uppercase tracking-[0.14em] font-medium px-2.5 py-1 rounded-[3px]" style={{ background: "var(--paper)", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline-2)", cursor: "pointer" }} title="Save a one-page audit dossier as PDF">
            ⎙ Export audit dossier
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <HashScanLink label="HCS audit" sub="topic" id={links.hcsAuditId} href={links.hcsAudit} />
          <HashScanLink label="HTS receipt" sub="token" id={links.htsReceiptId} href={links.htsReceipt} />
          <HashScanLink label="HBAR transfer" sub="tx" id={truncMid(links.hbarXferId, 14, 8)} href={links.hbarXfer} />
        </div>
      </div>
    </div>
  );
}

/** Mutual-consent settlement: a SCHEDULED pUSDC transfer that executes only once the
 * brand approver AND the retailer each sign on-chain. Neither the agent nor any single
 * key can move the funds — consent is enforced by Hedera consensus. */
export function MutualSettlement({ scheduleId, amount, commitment, brandTreasury, retailerAccount }: {
  scheduleId: string;
  amount: number;
  commitment: string;
  brandTreasury?: string;
  retailerAccount?: string;
}) {
  const [brand, setBrand] = useState<"idle" | "signing" | "done">("idle");
  const [retail, setRetail] = useState<"idle" | "signing" | "done">("idle");
  const [executed, setExecuted] = useState<{ executedAt: string; nftSerial: string | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function sign(role: "brand" | "retailer") {
    const set = role === "brand" ? setBrand : setRetail;
    set("signing");
    setErr(null);
    try {
      const res = await fetch("/api/settlement/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scheduleId, role, commitment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "sign failed");
      set("done");
      if (data.executed) setExecuted({ executedAt: data.executedAt, nftSerial: data.nftSerial ?? null });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "sign failed");
      set("idle");
    }
  }

  const SignButton = ({ role, label, state, who }: { role: "brand" | "retailer"; label: string; state: "idle" | "signing" | "done"; who?: string }) => (
    <div className="flex-1 rounded-[4px] p-3" style={{ background: "var(--paper)", boxShadow: `inset 0 0 0 1px ${state === "done" ? "var(--emerald)" : "var(--keyline-2)"}` }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>{label}</span>
        {who && <a href={accountUrl(who)} target="_blank" rel="noreferrer" className="mono text-[10px] flex items-center gap-1" style={{ color: "var(--ink-faint)" }}>{who}<ExternalIcon size={9} /></a>}
      </div>
      <button
        onClick={() => sign(role)}
        disabled={state !== "idle" || !!executed}
        className="w-full mono text-[11px] uppercase tracking-[0.14em] font-semibold px-3 py-2 rounded-[3px]"
        style={{
          background: state === "done" ? "var(--emerald-bg)" : state === "signing" ? "var(--paper-sunken)" : "var(--ink)",
          color: state === "done" ? "var(--emerald)" : state === "signing" ? "var(--ink-faint)" : "white",
          boxShadow: state === "done" ? "inset 0 0 0 1px var(--emerald)" : "none",
          cursor: state === "idle" && !executed ? "pointer" : "default",
        }}
      >
        {state === "done" ? "✓ signed on-chain" : state === "signing" ? "signing…" : role === "brand" ? "Approve & authorize" : "Accept settlement"}
      </button>
    </div>
  );

  return (
    <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper-2)", boxShadow: `inset 0 0 0 1.5px ${executed ? "var(--emerald)" : "var(--keyline-2)"}` }}>
      <div className="px-5 md:px-6 py-3 flex items-center justify-between gap-3 flex-wrap hairline-b" style={{ background: executed ? "linear-gradient(180deg, var(--emerald-bg), var(--paper))" : "var(--paper)" }}>
        <div className="flex flex-col leading-tight">
          <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: executed ? "var(--emerald)" : "var(--ink-faint)" }}>
            {executed ? "Settled · mutual consent" : "Settlement proposed · awaiting mutual consent"}
          </span>
          <span className="text-[13px] font-semibold mt-0.5">
            <span className="mono tabular-nums">{amount}</span> pUSDC · brand → retailer
          </span>
        </div>
        <a href={scheduleUrl(scheduleId)} target="_blank" rel="noreferrer" className="mono text-[11px] flex items-center gap-1.5" style={{ color: "var(--emerald)" }}>
          schedule {scheduleId}<ExternalIcon size={11} />
        </a>
      </div>

      <div className="px-5 md:px-6 py-4">
        <p className="text-[12.5px] leading-snug mb-3" style={{ color: "var(--ink-mute)" }}>
          The agent <b>proposed</b> this payout as a Hedera Scheduled Transaction. It executes <b>only</b> once both parties sign on-chain — the brand authorizes the spend, the retailer accepts (receiver-signature-required). No single key, and not the agent, can release the funds.
        </p>
        <div className="flex gap-3 flex-wrap">
          <SignButton role="brand" label="Brand approver" state={brand} who={brandTreasury} />
          <SignButton role="retailer" label="Retailer" state={retail} who={retailerAccount} />
        </div>
        {err && <div className="mt-2 text-[12px]" style={{ color: "var(--red)" }}>{err}</div>}
        {executed && (
          <div className="mt-3 rounded-[4px] px-3 py-2.5 flex items-center gap-2.5 flex-wrap" style={{ background: "var(--emerald-bg)", boxShadow: "inset 0 0 0 1px var(--emerald)" }}>
            <span className="text-[13px]" style={{ color: "var(--emerald)" }}>✓</span>
            <span className="text-[12.5px]" style={{ color: "var(--ink)" }}>
              Executed by Hedera on both signatures — {amount} pUSDC settled to the retailer.
            </span>
            {executed.nftSerial && (
              <span className="mono text-[10.5px] px-2 py-0.5 rounded-sm" style={{ color: "var(--emerald)", background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--emerald)" }}>
                attestation NFT #{executed.nftSerial}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** A one-page, print-ready settlement dossier — the filing an auditor keeps.
 * Hidden on screen (.print-dossier); "Export audit dossier" triggers window.print()
 * and the browser's Save-as-PDF renders only this. Border/text styling (no colour
 * fills) so it prints faithfully without "background graphics" enabled. */
export function Dossier({
  scenario,
  assessment,
  settlement,
  anchor,
  provenance,
  narrative,
  contractText,
  imageSrc,
}: {
  scenario: CardScenario;
  assessment: ComplianceAssessmentType;
  settlement?: { amount: number; scheduleId: string; token: string; executedAt?: string | null } | null;
  anchor?: { topicId: string; sequenceNumber: number } | null;
  provenance?: { model: string; adjudicated_at: string; commitment: string; image_fp?: string };
  narrative: string;
  contractText: string;
  imageSrc: string;
}) {
  const line = "1px solid #c9c9c4";
  const Row = ({ k, v }: { k: string; v: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", borderBottom: "1px solid #e6e6e1", fontSize: 11 }}>
      <span style={{ color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", fontSize: 9.5 }}>{k}</span>
      <span style={{ fontFamily: "monospace", color: "#16161A", textAlign: "right", wordBreak: "break-all" }}>{v}</span>
    </div>
  );
  return (
    <div className="print-dossier" style={{ color: "#16161A", fontFamily: "ui-sans-serif, system-ui, sans-serif", padding: 4 }}>
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #16161A", paddingBottom: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>PromoProof — Settlement Dossier</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Trade-promotion proof-of-performance · adjudicated &amp; settled on Hedera</div>
        </div>
        <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 10, color: "#555" }}>
          <div>{scenario.claimId ?? "—"}</div>
          <div>{provenance?.adjudicated_at ?? new Date().toISOString()}</div>
        </div>
      </div>

      {/* Parties + outcome */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", fontFamily: "monospace" }}>Claim</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{scenario.retailer} · {scenario.promotion}</div>
          <blockquote style={{ borderLeft: "2px solid #c9c9c4", paddingLeft: 10, margin: "8px 0 0", fontStyle: "italic", fontSize: 12, color: "#2A2A33" }}>“{narrative}”</blockquote>
        </div>
        <div style={{ border: line, borderRadius: 4, padding: "10px 12px" }}>
          <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", fontFamily: "monospace" }}>Decision</div>
          <div style={{ fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{assessment.decision.replace(/_/g, " ")}</div>
          <div style={{ marginTop: 8, fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", fontFamily: "monospace" }}>Settled</div>
          <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700 }}>{settlement ? settlement.amount : "—"} <span style={{ fontSize: 12, fontWeight: 500 }}>{settlement?.token ?? "pUSDC"}</span></div>
          <div style={{ fontSize: 10, color: "#555", fontFamily: "monospace" }}>{assessment.recommended_credit_pct}% credit · contract max {assessment.max_settlement_hbar} · confidence {assessment.confidence}{settlement?.executedAt ? " · executed" : settlement ? " · awaiting signatures" : ""}</div>
        </div>
      </div>

      {/* Evidence + criteria */}
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 14, marginBottom: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt="proof photo" style={{ width: 120, height: 120, objectFit: "cover", border: line, borderRadius: 4 }} />
        <div>
          <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", fontFamily: "monospace", marginBottom: 4 }}>Clause-by-clause finding</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#555", fontFamily: "monospace", fontSize: 9 }}>
                <th style={{ padding: "2px 6px 2px 0" }}>Clause</th><th style={{ padding: "2px 6px" }}>Requirement</th><th style={{ padding: "2px 6px" }}>Status</th><th style={{ padding: "2px 0 2px 6px" }}>Observed</th>
              </tr>
            </thead>
            <tbody>
              {assessment.criteria.map((c, i) => (
                <tr key={i} style={{ borderTop: "1px solid #e6e6e1", verticalAlign: "top" }}>
                  <td style={{ padding: "3px 6px 3px 0", fontFamily: "monospace", whiteSpace: "nowrap" }}>{c.clause_ref}</td>
                  <td style={{ padding: "3px 6px" }}>{c.requirement}</td>
                  <td style={{ padding: "3px 6px", textTransform: "uppercase", fontFamily: "monospace", fontSize: 9.5 }}>{c.status}</td>
                  <td style={{ padding: "3px 0 3px 6px", color: "#2A2A33" }}>{c.observed_in_photo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", fontFamily: "monospace", marginBottom: 2 }}>Reasoning</div>
        <div style={{ fontSize: 12, fontStyle: "italic" }}>“{assessment.reasoning_summary}”</div>
      </div>

      {/* On-chain provenance — full ids, for the auditor */}
      <div style={{ border: line, borderRadius: 4, padding: "10px 12px", marginBottom: 10 }}>
        <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", fontFamily: "monospace", marginBottom: 4 }}>On-chain provenance · independently verifiable</div>
        {provenance && <Row k="Adjudicator model" v={provenance.model} />}
        {provenance && <Row k="Commitment (Merkle root)" v={provenance.commitment} />}
        {provenance?.image_fp && <Row k="Image fingerprint (keyed)" v={provenance.image_fp} />}
        {anchor && <Row k="HCS audit topic" v={`${anchor.topicId} · seq #${anchor.sequenceNumber}`} />}
        {settlement && <Row k="Settlement schedule" v={settlement.scheduleId} />}
      </div>

      <div style={{ fontSize: 9.5, color: "#777", fontFamily: "monospace" }}>
        Every value above is verifiable on HashScan (hashscan.io/testnet) and re-readable from the Hedera Mirror Node.
        The commitment is a salted Merkle root over the full off-chain decision dossier — every field provable individually without exposing the rest; the keyed image fingerprint detects proof reuse across claims.
      </div>

      {/* Full contract text appended for the record */}
      <div style={{ marginTop: 14, borderTop: line, paddingTop: 8 }}>
        <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", fontFamily: "monospace", marginBottom: 4 }}>Bespoke contract (basis of judgement)</div>
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 9.5, color: "#2A2A33", margin: 0 }}>{contractText}</pre>
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
