"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolOrDynamicToolName,
  isTextUIPart,
  isToolOrDynamicToolUIPart,
  type UIMessage,
} from "ai";
import type {
  ComplianceAssessmentType,
  SettlementProposalType,
} from "@/lib/plugins/tpp-evaluator/schemas";
import { txUrl } from "@/lib/hedera/hashscan";
import {
  Header,
  TimelineRow,
  ToolChip,
  VerdictCard,
  SettlementReceipt,
  PreSettlement,
  type CardScenario,
  type HashScanLinks,
} from "@/app/console/components";
import { AuditLedger } from "@/app/console/AuditLedger";
import { EvidencePanel, EvidenceRequestPanel } from "@/app/console/Evidence";
import { ProseMarkdown } from "@/app/console/Markdown";

export type Scenario = {
  id: string;
  file: string;
  retailer: string;
  promo: string;
  imageRef: string;
  narrative: string;
  expect: string;
  contractText: string;
};

function parseJSON(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object") return v as Record<string, unknown>;
  if (typeof v !== "string") return null;
  try {
    return JSON.parse(v) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function txOf(out: Record<string, unknown> | null): string | undefined {
  const raw = out?.raw as Record<string, unknown> | undefined;
  return typeof raw?.transactionId === "string" ? raw.transactionId : undefined;
}

type ToolPart = {
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function shortInput(name: string, input: unknown): string {
  if (name === "adjudicate_claim") return "contract + photo + narrative";
  if (input == null) return "";
  const s = typeof input === "string" ? input : JSON.stringify(input);
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
}

function shortResult(name: string, out: Record<string, unknown> | null, state?: string): string {
  if (state === "input-available" || state === "input-streaming") return "running…";
  if (!out) return state ?? "";
  if (name === "adjudicate_claim") return `decision: ${out.decision} · confidence ${out.confidence}`;
  if (name === "compute_settlement") return `${out.amount_hbar} HBAR (${out.partial_credit_pct}%)`;
  if (typeof out.humanMessage === "string") return out.humanMessage.split("\n")[0];
  return JSON.stringify(out).slice(0, 80);
}

function LiveToolChip({ name, part }: { name: string; part: ToolPart }) {
  const [open, setOpen] = useState(false);
  const out = parseJSON(part.output);
  const state = part.state === "output-available" ? "done" : part.state === "output-error" ? "error" : "running";
  return (
    <ToolChip
      tool={name.replace(/_tool$/, "")}
      args={shortInput(name, part.input)}
      result={shortResult(name, out, part.state)}
      state={state}
      error={part.state === "output-error" ? part.errorText ?? "tool error" : undefined}
      expanded={open}
      onToggle={() => setOpen(!open)}
    />
  );
}

/** Aggregate the on-chain settlement across the whole conversation for the receipt. */
function deriveSettlement(messages: UIMessage[]): { proposal: SettlementProposalType; links: HashScanLinks; partial: boolean } | null {
  let proposal: SettlementProposalType | null = null;
  let topicTx: string | undefined;
  let mintTx: string | undefined;
  let transferTx: string | undefined;
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    for (const p of m.parts) {
      if (!isToolOrDynamicToolUIPart(p)) continue;
      const name = getToolOrDynamicToolName(p);
      const out = parseJSON((p as ToolPart).output);
      if (!out) continue;
      if (name === "compute_settlement") proposal = out as unknown as SettlementProposalType;
      else if (name.startsWith("submit_topic_message")) topicTx = txOf(out) ?? topicTx;
      else if (name.startsWith("mint_fungible_token")) mintTx = txOf(out) ?? mintTx;
      else if (name.startsWith("transfer_hbar")) transferTx = txOf(out) ?? transferTx;
    }
  }
  if (!proposal || !transferTx) return null;
  const links: HashScanLinks = {
    hcsAudit: topicTx ? txUrl(topicTx) : "#",
    htsReceipt: mintTx ? txUrl(mintTx) : "#",
    hbarXfer: txUrl(transferTx),
    hcsAuditId: topicTx ?? "—",
    htsReceiptId: mintTx ?? "—",
    hbarXferId: transferTx,
    operatorId: "",
  };
  return { proposal, links, partial: proposal.partial_credit_pct < 100 };
}

/** A computed settlement awaiting the human consent gate: compute_settlement has
 * run with a payable amount, but no transfer_hbar has happened yet. */
function derivePendingSettlement(messages: UIMessage[]): SettlementProposalType | null {
  let proposal: SettlementProposalType | null = null;
  let settled = false;
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    for (const p of m.parts) {
      if (!isToolOrDynamicToolUIPart(p)) continue;
      const name = getToolOrDynamicToolName(p);
      const out = parseJSON((p as ToolPart).output);
      if (!out) continue;
      if (name === "compute_settlement") proposal = out as unknown as SettlementProposalType;
      else if (name.startsWith("transfer_hbar")) settled = true;
    }
  }
  if (!proposal || settled || proposal.amount_hbar <= 0) return null;
  return proposal;
}

/** The most recent adjudication's decision + evidence ask — drives the live
 * negotiation panel when the agent is waiting for more evidence. */
function lastAdjudication(messages: UIMessage[]): { decision: string; evidence_requested?: string } | null {
  let result: { decision: string; evidence_requested?: string } | null = null;
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    for (const p of m.parts) {
      if (!isToolOrDynamicToolUIPart(p)) continue;
      if (getToolOrDynamicToolName(p) !== "adjudicate_claim") continue;
      const out = parseJSON((p as ToolPart).output);
      if (out && typeof out.decision === "string") {
        result = { decision: out.decision, evidence_requested: typeof out.evidence_requested === "string" ? out.evidence_requested : undefined };
      }
    }
  }
  return result;
}

const UPLOAD_REF_RE = /NEW_IMAGE_REF:\s*upload:([\w.-]+)/;

function ClaimPickerLive({ scenarios, active, busy, onSelect }: { scenarios: Scenario[]; active: string | null; busy: boolean; onSelect: (s: Scenario) => void }) {
  return (
    <section className="max-w-[1100px] mx-auto px-6 md:px-8 pt-6 pb-4 w-full">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="mono text-[10.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>Active claims · awaiting adjudication</h2>
        <span className="mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: "var(--ink-faint)" }}>{scenarios.length} pending</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {scenarios.map((s) => {
          const isActive = active === s.id;
          return (
            <button key={s.id} onClick={() => onSelect(s)} disabled={busy} className="text-left p-4 rounded-[4px] transition-all disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: isActive ? "var(--paper)" : "var(--paper-2)", boxShadow: isActive ? "inset 0 0 0 1.5px var(--ink), 0 6px 18px rgba(22,22,26,0.06)" : "inset 0 0 0 1px var(--keyline)" }}>
              <div className="text-[14px] font-semibold leading-tight">{s.retailer}</div>
              <div className="mt-2 text-[13px] leading-snug" style={{ color: "var(--ink-2)" }}>{s.promo}</div>
              <div className="serif text-[10.5px] italic mt-2" style={{ color: "var(--ink-faint)" }}>{s.expect}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Console({ scenarios }: { scenarios: Scenario[] }) {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent" }),
  });
  const [input, setInput] = useState("");
  const [active, setActive] = useState<Scenario | null>(null);
  const [highlightedClause, setHighlightedClause] = useState<string | null>(null);
  const busy = status === "submitted" || status === "streaming";

  // Re-read the on-chain ledger each time a run finishes (records are confirmed by then).
  const [auditTick, setAuditTick] = useState(0);
  const prevBusy = useRef(busy);
  useEffect(() => {
    if (prevBusy.current && !busy) setAuditTick((t) => t + 1);
    prevBusy.current = busy;
  }, [busy]);

  function submitClaim(s: Scenario) {
    setActive(s);
    sendMessage({
      text:
        `New trade-promotion claim from ${s.retailer} — ${s.promo}. Adjudicate it.\n\n` +
        `CONTRACT:\n${s.contractText}\n\nIMAGE_REF: ${s.imageRef}\nNARRATIVE: ${s.narrative}`,
    });
  }
  function send() {
    const t = input.trim();
    if (!t) return;
    sendMessage({ text: t });
    setInput("");
  }

  const settlement = useMemo(() => deriveSettlement(messages), [messages]);
  const pending = useMemo(() => derivePendingSettlement(messages), [messages]);
  const lastAdj = useMemo(() => lastAdjudication(messages), [messages]);
  const awaitingEvidence =
    lastAdj?.decision === "request_more_evidence" &&
    messages[messages.length - 1]?.role === "assistant" &&
    !busy;
  const header: CardScenario | null = active
    ? { retailer: active.retailer, promotion: active.promo, claimId: `CLM-${active.id}` }
    : null;

  let adjudicationsSeen = 0;

  return (
    <>
      <Header />
      <ClaimPickerLive scenarios={scenarios} active={active?.id ?? null} busy={busy} onSelect={submitClaim} />

      <main className="flex-1 max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-2 pb-10">
        {messages.length === 0 ? (
          <div className="rounded-[4px] py-14 px-6 text-center mt-4" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
            <div className="text-[15px] font-semibold mb-1.5">No claim selected</div>
            <div className="text-[13px] max-w-[440px] mx-auto" style={{ color: "var(--ink-mute)" }}>
              Pick a claim above to load the bespoke promotion contract, judge the proof photo against it, and prepare a Hedera settlement.
            </div>
          </div>
        ) : (
          <section className="pt-5 relative rail">
            {messages.map((m) => {
              if (m.role === "user") {
                const text = m.parts.filter(isTextUIPart).map((p) => p.text).join(" ");
                const isClaim = text.startsWith("New trade-promotion claim");
                const uploadId = text.match(UPLOAD_REF_RE)?.[1];
                const replyNote = text.replace(/Attaching a clearer proof photo as additional evidence\.?/, "").replace(UPLOAD_REF_RE, "").trim();
                return (
                  <TimelineRow key={m.id} kind="submission" time="analyst">
                    {isClaim && active ? (
                      <EvidencePanel scenario={active} highlightClause={highlightedClause} />
                    ) : uploadId ? (
                      <div className="rounded-[4px] p-3" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
                        <div className="mono text-[10px] uppercase tracking-[0.14em] mb-2" style={{ color: "var(--blue)" }}>Additional evidence · clearer photo submitted</div>
                        <div className="flex items-start gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/uploads/${uploadId}`} alt="submitted evidence photo" className="h-20 w-20 object-cover rounded-[3px]" style={{ boxShadow: "inset 0 0 0 1px var(--keyline-2)" }} />
                          {replyNote && <div className="text-[13px] leading-snug" style={{ color: "var(--ink-2)" }}>{replyNote}</div>}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[4px] p-3 text-[13px]" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)", color: "var(--ink-2)" }}>
                        {text}
                      </div>
                    )}
                  </TimelineRow>
                );
              }
              return (
                <div key={m.id}>
                  {m.parts.map((part, i) => {
                    if (isTextUIPart(part)) {
                      return part.text ? (
                        <TimelineRow key={i} kind="reason" time="agent narrative">
                          <div className="px-1">
                            <ProseMarkdown>{part.text}</ProseMarkdown>
                          </div>
                        </TimelineRow>
                      ) : null;
                    }
                    if (isToolOrDynamicToolUIPart(part)) {
                      const name = getToolOrDynamicToolName(part);
                      const tp = part as ToolPart;
                      const out = parseJSON(tp.output);
                      if (name === "adjudicate_claim" && tp.state === "output-available" && out && header) {
                        const revised = adjudicationsSeen++ > 0;
                        return (
                          <TimelineRow key={i} kind="verdict" time="finding">
                            <VerdictCard
                              assessment={out as unknown as ComplianceAssessmentType}
                              scenario={header}
                              revised={revised}
                              provenance={(out as { provenance?: { model: string; adjudicated_at: string; evidence_hash: string } }).provenance}
                              onClauseClick={setHighlightedClause}
                            />
                          </TimelineRow>
                        );
                      }
                      return (
                        <TimelineRow key={i} kind="tool" time="tool call">
                          <LiveToolChip name={name} part={tp} />
                        </TimelineRow>
                      );
                    }
                    return null;
                  })}
                </div>
              );
            })}

            {awaitingEvidence && (
              <TimelineRow kind="evidence" time="negotiation">
                <EvidenceRequestPanel requested={lastAdj?.evidence_requested} onSend={(t) => sendMessage({ text: t })} busy={busy} />
              </TimelineRow>
            )}

            {pending && !settlement && header && !busy && (
              <TimelineRow kind="settle" time="awaiting approval">
                <PreSettlement
                  amount={pending.amount_hbar}
                  scenario={{ ...header, maxHbar: pending.max_settlement_hbar, contractId: header.claimId }}
                  onApprove={() => sendMessage({ text: "Approved. Settle on-chain now — mint the receipt and transfer the HBAR." })}
                />
              </TimelineRow>
            )}

            {settlement && header && (
              <TimelineRow kind="settle" time="settled" last>
                <SettlementReceipt proposal={settlement.proposal} scenario={header} partial={settlement.partial} links={settlement.links} />
              </TimelineRow>
            )}

            {busy && (
              <div className="flex items-center gap-2 mono text-[10.5px] uppercase tracking-[0.14em] pl-10 pb-4" style={{ color: "var(--emerald)" }}>
                <i className="block w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--emerald)" }} />
                PromoProof is working…
              </div>
            )}
          </section>
        )}
      </main>

      <AuditLedger refreshKey={auditTick} />

      <div className="hairline-t" style={{ background: "var(--paper-2)" }}>
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
          <div className="flex-1 flex items-stretch rounded-[4px]" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)", opacity: busy ? 0.6 : 1 }}>
            <input
              className="field-bare flex-1 px-3 py-2.5 text-[13px]"
              placeholder={busy ? "PromoProof is working…" : "Approve & settle, or provide more evidence (e.g. a POS timestamp)…"}
              value={input}
              disabled={busy}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && send()}
            />
          </div>
          <button onClick={send} disabled={busy || !input.trim()} className="mono text-[11px] uppercase tracking-[0.14em] font-semibold px-4 py-2.5 rounded-[3px]" style={{ background: input.trim() && !busy ? "var(--emerald)" : "var(--paper-sunken)", color: input.trim() && !busy ? "white" : "var(--ink-faint)", cursor: input.trim() && !busy ? "pointer" : "not-allowed" }}>
            Send
          </button>
        </div>
      </div>
    </>
  );
}
