"use client";
// Scripted artifacts for the guided tour's public retelling. These render the FROZEN
// featured run (real photo, real boxes, real on-chain ids) without invoking the live
// agent — so the public read-only URL is truthful and bulletproof for recording. The
// operator/live path reuses the real interactive components instead (see Stage 5).
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolOrDynamicToolName,
  isTextUIPart,
  isToolOrDynamicToolUIPart,
} from "ai";
import type { FeaturedClaim } from "../data";
import { HASHSCAN } from "../data";
import { buildPaymentMandate } from "@/lib/ap2";
import { LIVE_SANDBOX } from "@/lib/live-sandbox";
import type {
  ComplianceAssessmentType,
  ReviewerAssessmentType,
  SettlementProposalType,
} from "@/lib/plugins/tpp-evaluator/schemas";
import { VerdictCard, type CardScenario } from "../components";
import { DocSeal, ExternalIcon, truncMid } from "../primitives";
import { ProofLink, Spinner } from "./GuidedScene";

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <span className="mono text-[9.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>{children}</span>
);

/** Scene 0 — a calm labeled flow so the viewer holds the whole shape before the detail. */
export function FlowDiagram() {
  const steps = ["Contract + Photo", "Agent", "Verdict", "Commit", "Verify", "Settle"];
  return (
    <div className="rounded-[5px] p-5 md:p-6" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
      <Lbl>How one claim flows</Lbl>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span
              className="mono text-[11px] tracking-[0.04em] px-2.5 py-1.5 rounded-[3px]"
              style={{
                background: i === 1 || i === 2 ? "var(--emerald-bg)" : "var(--paper-2)",
                color: i === 1 || i === 2 ? "var(--emerald)" : "var(--ink-2)",
                boxShadow: `inset 0 0 0 1px ${i === 1 || i === 2 ? "rgba(11,93,59,0.2)" : "var(--keyline)"}`,
              }}
            >
              {s}
            </span>
            {i < steps.length - 1 && <span style={{ color: "var(--ink-faint)" }}>→</span>}
          </span>
        ))}
      </div>
      <p className="text-[12px] leading-snug mt-4 max-w-[640px]" style={{ color: "var(--ink-faint)" }}>
        This demo has two lanes: a cached anchor from a successful end-to-end run, and a live sandbox that calls the LLM and Hedera testnet when quota is available. Settlement is in <b style={{ color: "var(--ink-mute)" }}>pUSDC</b>, a USD-pegged demo token; HBAR only pays network fees.
      </p>
    </div>
  );
}

/** Scene 1 — the basis of the judgement: the real photo, the narrative, the contract. */
export function ClaimInputs({ claim }: { claim: FeaturedClaim }) {
  const [showContract, setShowContract] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const src = `/proofs/${claim.imageRef}`;
  return (
    <div className="rounded-[5px] p-4 md:p-5 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-5" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
      <div className="flex flex-col gap-1.5">
        <button onClick={() => setLightbox(true)} className="block rounded-[4px] overflow-hidden relative group" style={{ boxShadow: "inset 0 0 0 1px var(--keyline-2)" }} title="Click to enlarge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`Proof photo — ${claim.promotion}`} className="w-full h-[200px] object-cover" />
          <span className="absolute bottom-1.5 right-1.5 mono text-[8.5px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-sm" style={{ background: "rgba(22,22,26,0.72)", color: "white" }}>⤢ enlarge</span>
        </button>
        <Lbl>Proof photo · the evidence</Lbl>
      </div>
      <div className="min-w-0 flex flex-col gap-2.5">
        <div>
          <Lbl>Analyst submission</Lbl>
          <div className="text-[15px] font-semibold mt-0.5">{claim.retailer} · {claim.promotion}</div>
          <div className="mono text-[11px] mt-0.5" style={{ color: "var(--ink-faint)" }}>{claim.promoSub}</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
          <KV label="Contract" value={claim.contractId} />
          <KV label="Max settle" value="25 pUSDC" />
          <KV label="Claim" value={claim.claimId} />
        </div>
        <blockquote className="serif pl-3 text-[13px] leading-snug border-l-2 italic" style={{ borderColor: "var(--keyline-2)", color: "var(--ink-2)" }}>
          “{claim.narrative}”
        </blockquote>
        <button onClick={() => setShowContract((v) => !v)} className="self-start mono text-[10.5px] uppercase tracking-[0.14em] font-medium px-2.5 py-1 rounded-[3px] inline-flex items-center gap-1.5" style={{ background: "var(--paper-2)", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
          {showContract ? "−" : "+"} The bespoke contract
        </button>
        {showContract && (
          <div className="rounded-[3px] p-3 max-h-[280px] overflow-auto" style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
            <pre className="mono text-[11px] leading-[1.55] whitespace-pre-wrap" style={{ color: "var(--ink-2)" }}>{claim.contractText}</pre>
          </div>
        )}
      </div>
      {lightbox && (
        <div onClick={() => setLightbox(false)} className="fixed inset-0 z-50 flex items-center justify-center p-6 cursor-zoom-out" style={{ background: "rgba(22,22,26,0.82)" }}>
          <figure className="max-w-[92vw] max-h-[90vh] flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Proof photo — ${claim.promotion}`} className="max-w-full max-h-[82vh] object-contain rounded-[3px]" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }} />
            <figcaption className="mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.85)" }}>{claim.retailer} · {claim.promotion} — the photo the model judged · click to close</figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}

function parseJSON(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object") return v as Record<string, unknown>;
  if (typeof v !== "string") return null;
  try {
    return JSON.parse(v) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toolResult(name: string, out: Record<string, unknown> | null, state?: string): string {
  if (state === "input-available" || state === "input-streaming") return "running...";
  if (!out) return state ?? "";
  if (name === "adjudicate_claim") return `decision: ${out.decision ?? "returned"} · confidence ${out.confidence ?? "n/a"}`;
  if (name === "submit_topic_message_tool") return `HCS submitted · tx ${typeof out.transactionId === "string" ? truncMid(out.transactionId, 10, 6) : "complete"}`;
  if (name === "compute_settlement") return `${out.amount_hbar ?? out.amount ?? "0"} pUSDC · ${out.partial_credit_pct ?? 0}%`;
  if (name === "propose_settlement") return `schedule ${out.scheduleId ?? "created"} · awaiting signatures`;
  if (name === "mint_non_fungible_token_tool") return "proof-only attestation minted";
  if (typeof out.humanMessage === "string") return out.humanMessage.split("\n")[0];
  return JSON.stringify(out).slice(0, 90);
}

function toolArgs(name: string, input: unknown): string {
  if (name === "adjudicate_claim") return "prepared contract + proof photo";
  if (name === "submit_topic_message_tool") return "proof-only commitment";
  if (name === "mint_non_fungible_token_tool") return "commitment metadata only";
  if (input == null) return "";
  const s = typeof input === "string" ? input : JSON.stringify(input);
  return s.length > 90 ? s.slice(0, 90) + "..." : s;
}

/** Plain-language "what's happening right now" while each Agent Kit tool runs. */
const RUNNING_LABEL: Record<string, string> = {
  adjudicate_claim: "Reading the contract & judging the photo…",
  compute_settlement: "Computing the capped settlement…",
  propose_settlement: "Proposing the Scheduled Transaction on Hedera…",
  submit_topic_message_tool: "Anchoring the proof-only commitment to HCS…",
  mint_non_fungible_token_tool: "Minting the attestation NFT…",
};

const LEDGER_TOOLS = new Set([
  "adjudicate_claim",
  "compute_settlement",
  "propose_settlement",
  "submit_topic_message_tool",
  "mint_non_fungible_token_tool",
]);

type LiveToolPart = { state?: string; input?: unknown; output?: unknown; errorText?: string };
type ToolUIPart = Parameters<typeof getToolOrDynamicToolName>[0];
type StreamPart = Parameters<typeof isToolOrDynamicToolUIPart>[0];
type LiveNftAttestation =
  | { status: "idle" | "resolving" | "not_found" | "error"; data?: null }
  | {
      status: "found";
      data: {
        found: true;
        tokenId: string;
        serialNumber: string;
        accountId: string | null;
        createdTimestamp: string | null;
        metadata: string;
        mirrorUrl: string;
      };
    };

/** One streamed tool call — a spinner + live "Invoking Hedera Agent Kit…" line while it
 * runs, resolving to a checked result row when the output lands. */
function LiveToolRow({ part }: { part: ToolUIPart }) {
  const name = getToolOrDynamicToolName(part);
  const tp = part as LiveToolPart;
  const running = tp.state === "input-streaming" || tp.state === "input-available";
  const errored = tp.state === "output-error";
  const out = parseJSON(tp.output);
  return (
    <div className="anim-stream-in grid grid-cols-[18px_1fr] gap-3">
      <div className="pt-0.5">
        {running ? (
          <Spinner size={13} />
        ) : (
          <i
            className="block w-2.5 h-2.5 rounded-full mt-1"
            style={{ background: errored ? "var(--red)" : "var(--emerald)", boxShadow: `0 0 0 3px var(--paper), 0 0 0 4px ${errored ? "var(--red-bg)" : "rgba(11,93,59,0.18)"}` }}
          />
        )}
      </div>
      <div className="min-w-0 pb-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="mono text-[12.5px] font-semibold" style={{ color: errored ? "var(--red)" : "var(--ink)" }}>{name}</span>
          {LEDGER_TOOLS.has(name) && (
            <span className="mono text-[8.5px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-sm" style={{ color: "var(--blue)", background: "var(--blue-bg)" }}>Hedera Agent Kit</span>
          )}
        </div>
        <div className="mono text-[11.5px] mt-0.5 break-words" style={{ color: running ? "var(--blue)" : errored ? "var(--red)" : "var(--ink-mute)" }}>
          {running ? (RUNNING_LABEL[name] ?? "Invoking Hedera Agent Kit…") : errored ? (tp.errorText ?? "tool error") : toolResult(name, out, tp.state)}
        </div>
        {!running && !errored && toolArgs(name, tp.input) && (
          <div className="mono text-[10.5px] mt-0.5 break-words" style={{ color: "var(--ink-faint)" }}>← {toolArgs(name, tp.input)}</div>
        )}
      </div>
    </div>
  );
}

function LiveTextBubble({ text }: { text: string }) {
  return (
    <div className="anim-stream-in rounded-[4px] p-3 text-[12.5px] leading-[1.55]" style={{ background: "var(--paper-2)", color: "var(--ink-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
      {text}
    </div>
  );
}

type LiveProvenance = { commitment: string; image_fp?: string; model?: string; adjudicated_at?: string };
type LiveAnchor = { topicId?: string; sequenceNumber?: number; transactionId?: string };

function useLiveNftAttestation(commitment: string | undefined, enabled: boolean): LiveNftAttestation {
  const [state, setState] = useState<LiveNftAttestation>({ status: "idle" });

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (!enabled || !commitment) {
      setState({ status: "idle" });
      return () => { alive = false; };
    }

    async function resolve(attempt: number) {
      if (!alive || !commitment) return;
      setState((s) => (s.status === "found" ? s : { status: "resolving" }));
      try {
        const res = await fetch("/api/demo/nft-attestation", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ commitment }),
        });
        const json = await res.json();
        if (!alive) return;
        if (res.ok && json?.found) {
          setState({ status: "found", data: json });
          return;
        }
        if (res.status === 404 && attempt < 15) {
          timer = setTimeout(() => resolve(attempt + 1), 2000);
          return;
        }
        setState({ status: res.status === 404 ? "not_found" : "error" });
      } catch {
        if (!alive) return;
        if (attempt < 15) {
          timer = setTimeout(() => resolve(attempt + 1), 2000);
          return;
        }
        setState({ status: "error" });
      }
    }

    resolve(0);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [commitment, enabled]);

  return state;
}

function isAssessment(out: Record<string, unknown> | null): out is ComplianceAssessmentType & {
  provenance?: LiveProvenance;
  anchor?: LiveAnchor | null;
  citations?: { ref: string; verified: boolean }[];
  review?: ReviewerAssessmentType;
} {
  return !!out &&
    typeof out.decision === "string" &&
    typeof out.confidence === "number" &&
    typeof out.recommended_credit_pct === "number" &&
    typeof out.max_settlement_hbar === "number" &&
    Array.isArray(out.criteria) &&
    typeof out.reasoning_summary === "string";
}

function liveToolOutput(parts: StreamPart[], name: string): Record<string, unknown> | null {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (!isToolOrDynamicToolUIPart(p)) continue;
    if (getToolOrDynamicToolName(p) !== name) continue;
    const out = parseJSON((p as LiveToolPart).output);
    if (out) return out;
  }
  return null;
}

function numberField(out: Record<string, unknown> | null, key: string): number | null {
  const v = out?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function stringField(out: Record<string, unknown> | null, key: string): string | null {
  const v = out?.[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function LiveSettlementCard({
  assessment,
  settlement,
  proposal,
  nft,
}: {
  assessment: ComplianceAssessmentType;
  settlement: SettlementProposalType | null;
  proposal: Record<string, unknown> | null;
  nft: Record<string, unknown> | null;
}) {
  const settling = assessment.decision === "approve" || assessment.decision === "partial_credit";
  const scheduleId = stringField(proposal, "scheduleId");
  const amount = settlement?.amount_hbar ?? numberField(settlement, "amount") ?? null;
  if (!settling && !scheduleId && !nft) return null;
  return (
    <div className="anim-stream-in rounded-[5px] overflow-hidden" style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
      <div className="px-5 py-3 hairline-b flex items-center justify-between gap-2 flex-wrap" style={{ background: "linear-gradient(180deg, var(--emerald-bg), var(--paper))" }}>
        <div className="flex flex-col leading-tight">
          <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--emerald)" }}>Live settlement artifacts</span>
          <span className="text-[13px] font-semibold mt-0.5">
            {amount == null ? "Settlement computed" : <><span className="mono tabular-nums">{amount}</span> pUSDC</>} · mutual-consent schedule
          </span>
        </div>
        {scheduleId && (
          <a href={HASHSCAN.scheduleUrl(scheduleId)} target="_blank" rel="noreferrer" className="mono text-[11px] flex items-center gap-1.5" style={{ color: "var(--emerald)" }}>
            schedule {scheduleId}<ExternalIcon size={11} />
          </a>
        )}
      </div>
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-[4px] p-3" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
          <Lbl>Computed amount</Lbl>
          <div className="mono text-[16px] font-semibold mt-1">{amount ?? "—"} pUSDC</div>
          <div className="mono text-[9.5px] mt-1" style={{ color: "var(--ink-faint)" }}>{assessment.recommended_credit_pct}% credit · cap {assessment.max_settlement_hbar}</div>
        </div>
        <div className="rounded-[4px] p-3" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
          <Lbl>Scheduled transfer</Lbl>
          <div className="mono text-[12px] font-semibold mt-1">{scheduleId ?? "awaiting tool output"}</div>
          <div className="mono text-[9.5px] mt-1" style={{ color: "var(--ink-faint)" }}>agent proposes; humans sign</div>
        </div>
        <div className="rounded-[4px] p-3" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
          <Lbl>Proof-only attestation</Lbl>
          <div className="mono text-[12px] font-semibold mt-1">{nft ? "minted" : "pending"}</div>
          <div className="mono text-[9.5px] mt-1" style={{ color: "var(--ink-faint)" }}>NFT metadata is commitment-only</div>
        </div>
      </div>
    </div>
  );
}

function LiveProofSummary({ assessment }: { assessment: ReturnType<typeof liveToolOutput> }) {
  if (!assessment) return null;
  const provenance = assessment.provenance && typeof assessment.provenance === "object" ? assessment.provenance as LiveProvenance : null;
  const anchor = assessment.anchor && typeof assessment.anchor === "object" ? assessment.anchor as LiveAnchor : null;
  const commitment = provenance?.commitment;
  if (!commitment && !anchor) return null;
  return (
    <div className="anim-stream-in rounded-[5px] p-4 grid grid-cols-1 sm:grid-cols-3 gap-2" style={{ background: "var(--emerald-bg)", boxShadow: "inset 0 0 0 1px rgba(11,93,59,0.22)" }}>
      <div>
        <Lbl>Live Merkle root</Lbl>
        <div className="mono text-[11.5px] break-all mt-1" title={commitment}>{commitment ? truncMid(commitment, 14, 10) : "computed"}</div>
      </div>
      <div>
        <Lbl>HCS anchor</Lbl>
        <div className="mono text-[11.5px] mt-1">{anchor?.sequenceNumber ? `seq #${anchor.sequenceNumber}` : "proof-only submit streamed"}</div>
      </div>
      <div>
        <Lbl>Image fingerprint</Lbl>
        <div className="mono text-[11.5px] break-all mt-1" title={provenance?.image_fp}>{provenance?.image_fp ? truncMid(provenance.image_fp, 12, 8) : "keyed hash"}</div>
      </div>
    </div>
  );
}

function LiveStep({
  step,
  label,
  title,
  children,
}: {
  step: number;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--blue)" }}>{label}</span>
        <span className="mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>Step {step} of 9</span>
      </div>
      <div className="text-[18px] md:text-[20px] font-semibold tracking-[-0.01em] leading-tight">{title}</div>
      {children}
    </div>
  );
}

function LiveInputAssets({ src, busy, ran, onRun }: { src: string; busy: boolean; ran: boolean; onRun: () => void }) {
  return (
    <div className="rounded-[5px] p-4 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
      <div className="rounded-[4px] overflow-hidden" style={{ boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`Proof photo — ${LIVE_SANDBOX.promotion}`} className="w-full h-[140px] object-cover" />
      </div>
      <div className="min-w-0 flex flex-col gap-3">
        <div>
          <Lbl>Prepared claim</Lbl>
          <div className="text-[14px] font-semibold mt-0.5">{LIVE_SANDBOX.retailer} · {LIVE_SANDBOX.promotion}</div>
        </div>
        <blockquote className="serif pl-3 text-[12.5px] leading-snug border-l-2 italic" style={{ borderColor: "var(--keyline-2)", color: "var(--ink-2)" }}>
          “{LIVE_SANDBOX.narrative}”
        </blockquote>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <details className="rounded-[4px] overflow-hidden" style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
            <summary className="cursor-pointer px-3 py-2 mono text-[10.5px] uppercase tracking-[0.14em] font-semibold" style={{ color: "var(--ink)" }}>
              [ 📄 THE BESPOKE CONTRACT ]
            </summary>
            <pre className="mono text-[10.5px] leading-[1.55] max-h-[280px] overflow-auto px-3 pb-3 whitespace-pre-wrap" style={{ color: "var(--ink-2)" }}>{LIVE_SANDBOX.contractText}</pre>
          </details>
          <details open className="rounded-[4px] overflow-hidden" style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
            <summary className="cursor-pointer px-3 py-2 mono text-[10.5px] uppercase tracking-[0.14em] font-semibold" style={{ color: "var(--ink)" }}>
              [ 📝 RETAILER NARRATIVE ]
            </summary>
            <div className="serif italic text-[12.5px] leading-snug px-3 pb-3" style={{ color: "var(--ink-2)" }}>{LIVE_SANDBOX.narrative}</div>
          </details>
        </div>
        <button
          onClick={onRun}
          disabled={busy}
          className="self-start mt-1 mono text-[11px] uppercase tracking-[0.14em] font-semibold px-4 py-2.5 rounded-[3px] inline-flex items-center gap-2"
          style={{
            background: busy ? "var(--paper-sunken)" : "var(--ink)",
            color: busy ? "var(--ink-faint)" : "white",
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? <><Spinner size={12} color="var(--ink-faint)" /> Running…</> : ran ? "↻ Run again" : "▶ Run live adjudication"}
        </button>
      </div>
    </div>
  );
}

function LiveNegotiationStatus({ assessment }: { assessment: ComplianceAssessmentType }) {
  const needsEvidence = assessment.decision === "request_more_evidence";
  return (
    <div className="rounded-[5px] p-4" style={{ background: needsEvidence ? "var(--blue-bg)" : "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
      <Lbl>{needsEvidence ? "Evidence negotiation opened" : "No evidence gap found"}</Lbl>
      <p className="text-[12.5px] leading-snug mt-2" style={{ color: "var(--ink-mute)" }}>
        {needsEvidence
          ? assessment.evidence_requested ?? "The agent requested a targeted follow-up artifact before settlement."
          : "The live inputs satisfied the timing, placement, branding, facings, and stock checks. The agent can proceed from adjudication to proof-only commitment and settlement proposal without a follow-up evidence round."}
      </p>
    </div>
  );
}

function LivePrivatePublicSplit({ assessment }: { assessment: ReturnType<typeof liveToolOutput> }) {
  const provenance = assessment?.provenance && typeof assessment.provenance === "object" ? assessment.provenance as LiveProvenance : null;
  const anchor = assessment?.anchor && typeof assessment.anchor === "object" ? assessment.anchor as LiveAnchor : null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
        <div className="px-5 py-3 hairline-b" style={{ background: "var(--paper-2)" }}>
          <Lbl>Off-chain · encrypted decision dossier</Lbl>
          <div className="text-[13px] font-semibold mt-0.5">Inputs, criteria, reasoning, and salts stay private</div>
        </div>
        <div className="px-5 py-4 flex flex-col gap-2 text-[12.5px]" style={{ color: "var(--ink-2)" }}>
          <span>🔒 bespoke contract and retailer narrative</span>
          <span>🔒 proof photo and keyed image fingerprint preimage</span>
          <span>🔒 per-field salts and full clause-level reasoning</span>
          <span className="mono text-[10px] mt-1" style={{ color: "var(--ink-faint)" }}>Selective disclosure reveals only chosen leaves.</span>
        </div>
      </div>
      <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1.5px var(--emerald)" }}>
        <div className="px-5 py-3 hairline-b flex items-center justify-between gap-2" style={{ background: "linear-gradient(180deg, var(--emerald-bg), var(--paper))" }}>
          <div>
            <span className="mono text-[9.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--emerald)" }}>On-chain · proof-only HCS record</span>
            <div className="text-[13px] font-semibold mt-0.5">Commitment and timestamp, not business data</div>
          </div>
          <DocSeal />
        </div>
        <div className="px-5 py-4 flex flex-col gap-2.5">
          <Field label="Live salted Merkle root" value={provenance?.commitment ? truncMid(provenance.commitment, 14, 10) : "computing"} title={provenance?.commitment} />
          <Field label="Live image fingerprint" value={provenance?.image_fp ? truncMid(provenance.image_fp, 14, 10) : "keyed hash"} title={provenance?.image_fp} />
          <Field label="HCS sequence" value={anchor?.sequenceNumber ? `#${anchor.sequenceNumber}` : "Waiting for live HCS sequence..."} />
          <a href={HASHSCAN.hcsAudit} target="_blank" rel="noreferrer" className="self-start mt-1 mono text-[11px] flex items-center gap-1.5" style={{ color: "var(--emerald)" }}>
            view topic {HASHSCAN.hcsAuditId} on HashScan <ExternalIcon size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}

type LiveVerifyState = {
  disclosure: FeaturedClaim["disclosure"] | null;
  seq: number | null;
  consensusTs: string | null;
  error: string | null;
  checking: boolean;
};

function formatMirrorTs(ts: string): string {
  const secs = Number(ts.split(".")[0]);
  if (!Number.isFinite(secs)) return ts;
  return new Date(secs * 1000).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function formatNftMintTs(ts: string | null): string | null {
  if (!ts) return null;
  const secs = Number(ts.split(".")[0]);
  if (!Number.isFinite(secs)) return ts;
  const date = new Date(secs * 1000);
  const utc = date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  const local = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(date);
  return `${utc} · ${local}`;
}

function LiveNftReceiptBadge({ attestation }: { attestation: LiveNftAttestation }) {
  if (attestation.status === "found" && attestation.data) {
    const mintedAt = formatNftMintTs(attestation.data.createdTimestamp);
    return (
      <>
        <a href={attestation.data.mirrorUrl} target="_blank" rel="noreferrer" className="mono text-[10.5px] px-2 py-0.5 rounded-sm flex items-center gap-1" style={{ color: "var(--emerald)", background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--emerald)" }}>
          fresh NFT serial #{attestation.data.serialNumber}<ExternalIcon size={9} />
        </a>
        {mintedAt && <span className="mono text-[10.5px]" style={{ color: "var(--ink-faint)" }}>minted {mintedAt}</span>}
        <a href={HASHSCAN.nftAttestation} target="_blank" rel="noreferrer" className="mono text-[10.5px] px-2 py-0.5 rounded-sm flex items-center gap-1" style={{ color: "var(--ink-mute)", background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
          collection {attestation.data.tokenId}<ExternalIcon size={9} />
        </a>
      </>
    );
  }

  if (attestation.status === "resolving") {
    return (
      <span className="mono text-[10.5px] px-2 py-0.5 rounded-sm" style={{ color: "var(--blue)", background: "var(--blue-bg)", boxShadow: "inset 0 0 0 1px rgba(29,78,216,0.18)" }}>
        attestation mint submitted · resolving fresh serial…
      </span>
    );
  }

  if (attestation.status === "not_found" || attestation.status === "error") {
    return (
      <a href={HASHSCAN.nftAttestation} target="_blank" rel="noreferrer" className="mono text-[10.5px] px-2 py-0.5 rounded-sm flex items-center gap-1" style={{ color: "var(--ink-mute)", background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
        mint submitted · collection {HASHSCAN.nftAttestationId}<ExternalIcon size={9} />
      </a>
    );
  }

  return null;
}

function LiveVerifyReplay({ assessment }: { assessment: ReturnType<typeof liveToolOutput> }) {
  const provenance = assessment?.provenance && typeof assessment.provenance === "object" ? assessment.provenance as LiveProvenance : null;
  const anchor = assessment?.anchor && typeof assessment.anchor === "object" ? assessment.anchor as LiveAnchor : null;
  const [state, setState] = useState<LiveVerifyState>({ disclosure: null, seq: anchor?.sequenceNumber ?? null, consensusTs: null, error: null, checking: false });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const commitment = provenance?.commitment;
    if (!commitment) return;
    (async () => {
      for (let attempt = 0; attempt < 18 && alive; attempt++) {
        try {
          setState((s) => ({ ...s, checking: true, error: null, seq: s.seq ?? anchor?.sequenceNumber ?? null }));
          const dRes = await fetch("/api/demo/disclose", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ commitment }),
          });
          const disclosure = await dRes.json();
          if (!dRes.ok) throw new Error(disclosure.error || "disclosure unavailable");
          const vRes = await fetch("/api/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(disclosure),
          });
          const verified = await vRes.json();
          if (!alive) return;
          const consensusTs = verified.onChain?.consensusTimestamp ? formatMirrorTs(verified.onChain.consensusTimestamp) : null;
          setState({
            disclosure,
            seq: verified.onChain?.sequenceNumber ?? anchor?.sequenceNumber ?? null,
            consensusTs,
            error: null,
            checking: !consensusTs,
          });
          if (consensusTs) return;
        } catch (e) {
          if (!alive) return;
          setState((s) => ({
            ...s,
            error: attempt >= 17 ? (e instanceof Error ? e.message : "verification unavailable") : null,
            checking: attempt < 17,
          }));
        }
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
      if (alive) setState((s) => ({ ...s, checking: false }));
    })();
    return () => { alive = false; };
  }, [provenance?.commitment, anchor?.sequenceNumber]);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state.disclosure, state.seq, state.consensusTs, state.error]);

  if (!provenance?.commitment) {
    return <div className="rounded-[5px] p-4 mono text-[11px]" style={{ background: "var(--paper)", color: "var(--ink-faint)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>Waiting for the live adjudication commitment…</div>;
  }
  if (state.error) {
    return <div ref={ref} className="rounded-[5px] p-4 text-[12px]" style={{ background: "var(--amber-bg)", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>Live disclosure is still indexing on Mirror Node: {state.error}</div>;
  }
  if (!state.disclosure) {
    return <div ref={ref} className="rounded-[5px] p-4 mono text-[11px]" style={{ background: "var(--paper)", color: "var(--blue)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}><Spinner size={12} /> preparing selective disclosure proof…</div>;
  }

  return (
    <div ref={ref}>
      <VerifyReplay
        claim={{
          disclosure: state.disclosure,
          seq: state.seq ?? anchor?.sequenceNumber ?? 0,
          consensusTs: state.consensusTs ?? (state.checking ? "Waiting for Mirror Node consensus timestamp..." : "HCS sequence anchored; timestamp still indexing"),
        } as FeaturedClaim}
      />
    </div>
  );
}

function LiveSettleState({
  assessment,
  settlement,
  proposal,
  nft,
  nftAttestation,
}: {
  assessment: ComplianceAssessmentType;
  settlement: SettlementProposalType | null;
  proposal: Record<string, unknown> | null;
  nft: Record<string, unknown> | null;
  nftAttestation: LiveNftAttestation;
}) {
  const scheduleId = stringField(proposal, "scheduleId");
  const amount = settlement?.amount_hbar ?? numberField(settlement, "amount") ?? 0;
  const Sig = ({ label, who }: { label: string; who: string }) => (
    <div className="flex-1 rounded-[4px] p-3" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <Lbl>{label}</Lbl>
        <a href={who === HASHSCAN.brandId ? HASHSCAN.brand : HASHSCAN.retailer} target="_blank" rel="noreferrer" className="mono text-[10px] flex items-center gap-1" style={{ color: "var(--ink-faint)" }}>{who}<ExternalIcon size={9} /></a>
      </div>
      <div className="w-full mono text-[11px] uppercase tracking-[0.14em] font-semibold px-3 py-2 rounded-[3px] text-center" style={{ background: "var(--paper-2)", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>awaiting on-chain signature</div>
    </div>
  );
  return (
    <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1.5px var(--emerald)" }}>
      <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap hairline-b" style={{ background: "linear-gradient(180deg, var(--emerald-bg), var(--paper))" }}>
        <div className="flex flex-col leading-tight">
          <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--emerald)" }}>Settlement gate · mutual consent</span>
          <span className="text-[13px] font-semibold mt-0.5"><span className="mono tabular-nums">{amount || assessment.recommended_credit_pct}</span>{amount ? " pUSDC" : "% credit"} · brand → retailer</span>
        </div>
        {scheduleId && <a href={HASHSCAN.scheduleUrl(scheduleId)} target="_blank" rel="noreferrer" className="mono text-[11px] flex items-center gap-1.5" style={{ color: "var(--emerald)" }}>schedule {scheduleId}<ExternalIcon size={11} /></a>}
      </div>
      <div className="px-5 py-4">
        <p className="text-[12.5px] leading-snug mb-3" style={{ color: "var(--ink-mute)" }}>
          The live agent proposed the transfer as a Hedera Scheduled Transaction. The public sandbox stops at the safety gate: funds move only when the brand approver and retailer sign on-chain. The agent cannot release value by itself.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Sig label="Brand approver" who={HASHSCAN.brandId} />
          <Sig label="Retailer" who={HASHSCAN.retailerId} />
        </div>
        <div className="mt-3 rounded-[4px] px-3 py-2.5 flex items-center gap-2.5 flex-wrap" style={{ background: "var(--emerald-bg)", boxShadow: "inset 0 0 0 1px var(--emerald)" }}>
          <span className="text-[13px]" style={{ color: "var(--emerald)" }}>✓</span>
          <span className="text-[12.5px]" style={{ color: "var(--ink)" }}>Settlement proposal created on Hedera; signatures remain human-controlled.</span>
          {nft && <LiveNftReceiptBadge attestation={nftAttestation} />}
        </div>
      </div>
    </div>
  );
}

function LiveArtifactsRecap({ proposal, nftAttestation }: { proposal: Record<string, unknown> | null; nftAttestation: LiveNftAttestation }) {
  const scheduleId = stringField(proposal, "scheduleId");
  return (
    <div className="rounded-[5px] p-5" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
      <Lbl>Live Hedera artifacts · direct testnet links</Lbl>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
        <ProofLink label="HCS audit topic" id={HASHSCAN.hcsAuditId} sub="topic" href={HASHSCAN.hcsAudit} />
        {nftAttestation.status === "found" && nftAttestation.data && (
          <ProofLink label={`NFT serial #${nftAttestation.data.serialNumber}`} id={nftAttestation.data.tokenId} sub="fresh attestation" href={nftAttestation.data.mirrorUrl} />
        )}
        <ProofLink label="NFT collection" id={HASHSCAN.nftAttestationId} sub="token collection" href={HASHSCAN.nftAttestation} />
        <ProofLink label="pUSDC" id={HASHSCAN.pusdcId} sub="token" href={HASHSCAN.pusdc} />
        <ProofLink label="Brand treasury" id={HASHSCAN.brandId} sub="account" href={HASHSCAN.brand} />
        <ProofLink label="Retailer" id={HASHSCAN.retailerId} sub="account" href={HASHSCAN.retailer} />
        {scheduleId && <ProofLink label="Settlement schedule" id={scheduleId} sub="schedule" href={HASHSCAN.scheduleUrl(scheduleId)} />}
      </div>
    </div>
  );
}

function LiveGovernanceVault({
  assessment,
  rawAssessment,
  settlement,
  proposal,
  nft,
  nftAttestation,
  stream,
}: {
  assessment: ComplianceAssessmentType;
  rawAssessment: Record<string, unknown> | null;
  settlement: SettlementProposalType | null;
  proposal: Record<string, unknown> | null;
  nft: Record<string, unknown> | null;
  nftAttestation: LiveNftAttestation;
  stream: StreamPart[];
}) {
  const provenance = rawAssessment?.provenance && typeof rawAssessment.provenance === "object" ? rawAssessment.provenance as LiveProvenance : null;
  const anchor = rawAssessment?.anchor && typeof rawAssessment.anchor === "object" ? rawAssessment.anchor as LiveAnchor : null;
  const scheduleId = stringField(proposal, "scheduleId");
  const amount = settlement?.amount_hbar ?? numberField(settlement, "amount") ?? 0;
  const [hashes, setHashes] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    const encoder = new TextEncoder();
    const actions = [
      `live-adjudication:${provenance?.commitment ?? "pending"}:${assessment.decision}`,
      `live-hcs-anchor:${HASHSCAN.hcsAuditId}:${anchor?.sequenceNumber ?? "pending"}`,
      `live-schedule:${scheduleId ?? "pending"}:${amount}`,
      `live-nft-serial:${nftAttestation.status === "found" ? nftAttestation.data.serialNumber : nft ? "submitted" : "pending"}:${provenance?.commitment ?? "pending"}`,
    ];
    (async () => {
      const out = await Promise.all(actions.map(async (a) => {
        const digest = await crypto.subtle.digest("SHA-256", encoder.encode(a));
        return bytesToHex(new Uint8Array(digest));
      }));
      if (alive) setHashes(out);
    })();
    return () => { alive = false; };
  }, [provenance?.commitment, assessment.decision, anchor?.sequenceNumber, scheduleId, amount, nft, nftAttestation]);

  const toolNames = stream.filter(isToolOrDynamicToolUIPart).map((p) => getToolOrDynamicToolName(p));
  const mandate = buildPaymentMandate({
    commitment: provenance?.commitment ?? "pending-live-commitment",
    decision: assessment.decision,
    amount,
    network: "testnet",
    payerAccount: HASHSCAN.brandId,
    payeeAccount: HASHSCAN.retailerId,
    scheduleId: scheduleId ?? undefined,
    topicId: HASHSCAN.hcsAuditId,
    createdAt: provenance?.adjudicated_at ?? new Date().toISOString(),
  });

  return (
    <details open className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1.5px var(--emerald)" }}>
      <summary className="px-5 py-3 cursor-pointer select-none hairline-b" style={{ background: "linear-gradient(180deg, var(--emerald-bg), var(--paper))" }}>
        <span className="mono text-[10.5px] uppercase tracking-[0.14em] font-semibold" style={{ color: "var(--emerald)" }}>
          [ 🛡️ ENTERPRISE GOVERNANCE &amp; AUDIT VAULT (LIVE FORENSIC VIEW) ]
        </span>
      </summary>
      <div className="px-5 py-4 flex flex-col gap-4">
        <section>
          <Lbl>Model-risk evidence · live run</Lbl>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
            <VaultRow label="Decision" value={assessment.decision.replace(/_/g, " ")} sub={`confidence ${assessment.confidence}`} accent="emerald" />
            <VaultRow label="Credit" value={`${assessment.recommended_credit_pct}%`} sub={`max ${assessment.max_settlement_hbar} pUSDC`} />
            <VaultRow label="Criteria evaluated" value={String(assessment.criteria.length)} sub="clause-level findings with boxes" />
            <VaultRow label="Tool chain" value={`${toolNames.length} calls`} sub={toolNames.join(" → ")} accent="blue" />
            <VaultRow label="NFT receipt" value={nftAttestation.status === "found" && nftAttestation.data ? `serial #${nftAttestation.data.serialNumber}` : nft ? "submitted" : "not requested"} sub={nftAttestation.status === "found" && nftAttestation.data?.createdTimestamp ? `minted ${formatMirrorTs(nftAttestation.data.createdTimestamp)}` : "metadata = commitment only"} />
          </div>
          <pre className="mono text-[10.5px] leading-[1.45] max-h-[260px] overflow-auto mt-2 p-3 rounded-[4px] whitespace-pre-wrap" style={{ background: "var(--paper)", color: "var(--ink-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
            {JSON.stringify({ assessment, provenance, anchor, settlement, proposal, nft, nftAttestation }, null, 2)}
          </pre>
        </section>

        <section>
          <Lbl>Live access logs · cryptographic action hashes</Lbl>
          <div className="mt-2 rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
            {["adjudication dossier sealed", "proof-only HCS anchor written", "scheduled transfer proposed", "attestation serial resolved"].map((action, i) => (
              <div key={action} className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-2 px-4 py-2.5 hairline-b text-[11.5px]">
                <span style={{ color: "var(--ink-mute)" }}>{action}</span>
                <span className="mono truncate" title={hashes[i]} style={{ color: "var(--ink-faint)" }}>{hashes[i] ? `sha256:${truncMid(hashes[i], 14, 10)}` : "hashing…"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
          <div className="px-4 py-2.5 hairline-b" style={{ background: "var(--paper-2)" }}>
            <Lbl>Live AP2 payment mandate schema</Lbl>
          </div>
          <pre className="mono text-[10.5px] leading-[1.45] max-h-[340px] overflow-auto p-4 whitespace-pre-wrap" style={{ color: "var(--ink-2)" }}>
            {JSON.stringify(mandate, null, 2)}
          </pre>
        </section>
      </div>
    </details>
  );
}

/** Live testnet sandbox — the whole timeline as a streaming column. Hitting Run calls the
 * real LLM + Hedera testnet via /api/demo/live; each tool call and reasoning chunk appends
 * downward (chatbot-style) with active loading state, and the viewport auto-anchors to the
 * newest content as it generates. The verified run stays the stable proof if quota is out. */
export function LiveColumn() {
  const { messages, setMessages, sendMessage, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/demo/live" }),
  });
  const busy = status === "submitted" || status === "streaming";
  const ran = messages.length > 0;
  const stream = messages.filter((m) => m.role === "assistant").flatMap((m) => m.parts);
  const adjudicationOut = liveToolOutput(stream, "adjudicate_claim");
  const liveAssessment = isAssessment(adjudicationOut) ? adjudicationOut : null;
  const settlementOut = liveToolOutput(stream, "compute_settlement") as SettlementProposalType | null;
  const proposalOut = liveToolOutput(stream, "propose_settlement");
  const nftOut = liveToolOutput(stream, "mint_non_fungible_token_tool");
  const nftAttestation = useLiveNftAttestation(liveAssessment?.provenance?.commitment, !!nftOut);
  const quotaish = error && /429|rate|quota|too many/i.test(error.message);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scenario: CardScenario = {
    retailer: LIVE_SANDBOX.retailer,
    promotion: LIVE_SANDBOX.promotion,
    claimId: LIVE_SANDBOX.claimId,
    contractId: LIVE_SANDBOX.contractId,
    maxHbar: liveAssessment?.max_settlement_hbar ?? LIVE_SANDBOX.maxHbar,
  };

  // Auto-anchor the viewport to the newest content while the agent is streaming. The
  // signature changes as text grows, tool states advance, and rich verdict cards inject.
  const sig = stream
    .map((p) => (isTextUIPart(p) ? `t${p.text.length}` : isToolOrDynamicToolUIPart(p) ? `x${(p as LiveToolPart).state}` : ""))
    .join("|") + `|v${liveAssessment?.decision ?? ""}|s${stringField(proposalOut, "scheduleId") ?? ""}|n${nftOut ? "1" : "0"}`;
  useEffect(() => {
    if (ran) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [sig, ran]);

  function run() {
    clearError();
    setMessages([]);
    sendMessage({ text: "Run the prepared live sandbox claim." });
  }

  const src = `/proofs/${LIVE_SANDBOX.imageRef}`;
  return (
    <section className="max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-3 pb-10 anim-reveal">
      <div className="flex items-baseline gap-3 mb-2.5">
        <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--blue)" }}>Live testnet sandbox</span>
        <span className="mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>real run · streaming</span>
      </div>
      <h2 className="text-[20px] md:text-[23px] font-semibold tracking-[-0.015em] leading-[1.2] max-w-[820px]">
        Run the real agent against a prepared claim — live on Hedera testnet.
      </h2>
      <p className="text-[14.5px] leading-[1.6] mt-2.5 max-w-[680px]" style={{ color: "var(--ink-mute)" }}>
        This calls the live LLM and the Hedera testnet. Each step streams in below as it happens — the agent reads the contract, judges the photo, and writes proof-only artifacts to the ledger. The verified run keeps the stable proof if the free-tier model quota is unavailable.
      </p>

      <div className="mt-5 flex flex-col gap-7">
        <LiveStep step={1} label="Live inputs" title="The exact contract, narrative, and proof photo sent to the agent.">
          <LiveInputAssets src={src} busy={busy} ran={ran} onRun={run} />
        </LiveStep>

        {error && (
          <div className="rounded-[4px] px-4 py-3" style={{ background: quotaish ? "var(--amber-bg)" : "var(--red-bg)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
            <div className="mono text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: quotaish ? "var(--amber)" : "var(--red)" }}>
              {quotaish ? "Live sandbox quota reached" : "Live sandbox unavailable"}
            </div>
            <p className="text-[12px] leading-snug mt-1" style={{ color: "var(--ink-mute)" }}>
              Switch to the Verified run at the top — it’s the same workflow captured from a successful live run, with real testnet hashes and verification links.
            </p>
          </div>
        )}

        {ran && !error && (
          <LiveStep step={2} label="Agent tool stream" title="The real agent executes, tool by tool, against Hedera testnet.">
            <div className="rounded-[5px] p-4 md:p-5 flex flex-col gap-3" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
              <div className="flex items-center gap-2">
                <i className={"block w-1.5 h-1.5 rounded-full" + (busy ? " pulse-dot" : "")} style={{ background: busy ? "var(--blue)" : "var(--emerald)" }} />
                <Lbl>{busy ? "Live on Hedera testnet · streaming" : "Run complete"}</Lbl>
              </div>
              {stream.map((p, i) => {
                if (isTextUIPart(p)) return p.text.trim() ? <LiveTextBubble key={`t${i}`} text={p.text} /> : null;
                if (isToolOrDynamicToolUIPart(p)) return <LiveToolRow key={`x${i}`} part={p} />;
                return null;
              })}
              {busy && (
                <div className="grid grid-cols-[18px_1fr] gap-3 anim-stream-in">
                  <div className="pt-0.5"><Spinner size={13} /></div>
                  <div className="mono text-[11.5px]" style={{ color: "var(--blue)" }}>Invoking Hedera Agent Kit…</div>
                </div>
              )}
              {!busy && (
                <div className="mt-1 rounded-[4px] px-3 py-2.5 flex items-center gap-2.5 flex-wrap" style={{ background: "var(--emerald-bg)", boxShadow: "inset 0 0 0 1px var(--emerald)" }}>
                  <span className="text-[13px]" style={{ color: "var(--emerald)" }}>✓</span>
                  <span className="text-[12px]" style={{ color: "var(--ink)" }}>Live run complete — proof-only artifacts written to Hedera testnet, nothing confidential exposed.</span>
                </div>
              )}
            </div>
          </LiveStep>
        )}

        {liveAssessment && !error && (
          <>
            <LiveStep step={3} label="Compliance verdict" title="Judgement, visual grounding, and the full live criteria matrix.">
              <VerdictCard
                assessment={liveAssessment}
                scenario={scenario}
                imageSrc={src}
                citations={liveAssessment.citations}
                review={liveAssessment.review}
                unit="pUSDC"
              />
            </LiveStep>
            <LiveStep step={4} label="Negotiation gate" title="The agent decides whether more evidence is required before value can move.">
              <LiveNegotiationStatus assessment={liveAssessment} />
            </LiveStep>
            <LiveStep step={5} label="Recorded privately" title="The live dossier is sealed off-chain while Hedera receives only proof data.">
              <LivePrivatePublicSplit assessment={adjudicationOut} />
            </LiveStep>
            <LiveStep step={6} label="Hedera commitment" title="The live proof-only commitment and image fingerprint are anchored.">
              <LiveProofSummary assessment={adjudicationOut} />
            </LiveStep>
            <LiveStep step={7} label="Provable to anyone" title="The live verdict and reasoning string are proven against the public HCS record.">
              <LiveVerifyReplay assessment={adjudicationOut} />
            </LiveStep>
            <LiveStep step={8} label="Settled safely" title="The live scheduled transfer exposes the mutual-signature state.">
              <LiveSettleState assessment={liveAssessment} settlement={settlementOut} proposal={proposalOut} nft={nftOut} nftAttestation={nftAttestation} />
            </LiveStep>
            <LiveStep step={9} label="End to end" title="The live Hedera artifacts and forensic vault close the audit trail.">
              <div className="flex flex-col gap-3">
                <LiveArtifactsRecap proposal={proposalOut} nftAttestation={nftAttestation} />
                <LiveGovernanceVault assessment={liveAssessment} rawAssessment={adjudicationOut} settlement={settlementOut} proposal={proposalOut} nft={nftOut} nftAttestation={nftAttestation} stream={stream} />
              </div>
            </LiveStep>
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col leading-tight min-w-0">
      <Lbl>{label}</Lbl>
      <span className="mono text-[11.5px] truncate" style={{ color: "var(--ink)" }}>{value}</span>
    </div>
  );
}

/** Scene 5 — the signature beat. The on-chain vs off-chain split, drawn literally, so
 * "why Hedera and not a database" is something the viewer SEES, not a claim they read. */
export function OnChainOffChainSplit({ claim }: { claim: FeaturedClaim }) {
  const Private = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--ink-2)" }}>
      <span style={{ color: "var(--ink-faint)" }}>🔒</span>{children}
    </div>
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Off-chain (private) */}
      <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
        <div className="px-5 py-3 hairline-b" style={{ background: "var(--paper-2)" }}>
          <Lbl>Off-chain · your private store</Lbl>
          <div className="text-[13px] font-semibold mt-0.5">Everything sensitive — encrypted, on your side</div>
        </div>
        <div className="px-5 py-4 flex flex-col gap-2">
          <Private>The full contract</Private>
          <Private>The proof photo</Private>
          <Private>The settlement amount</Private>
          <Private>The agent&rsquo;s full reasoning</Private>
          <div className="mono text-[10px] mt-1.5" style={{ color: "var(--ink-faint)" }}>AES-256 encrypted · never leaves your servers</div>
        </div>
      </div>
      {/* On-chain (public) */}
      <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1.5px var(--emerald)" }}>
        <div className="px-5 py-3 hairline-b flex items-center justify-between gap-2" style={{ background: "linear-gradient(180deg, var(--emerald-bg), var(--paper))" }}>
          <div>
            <span className="mono text-[9.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--emerald)" }}>On-chain · Hedera (public)</span>
            <div className="text-[13px] font-semibold mt-0.5">One fingerprint + a timestamp — nothing else</div>
          </div>
          <DocSeal />
        </div>
        <div className="px-5 py-4 flex flex-col gap-2.5">
          <Field label="Decision commitment (salted hash)" value={truncMid(claim.commitment, 14, 10)} title={claim.commitment} />
          <Field label="Image fingerprint (keyed)" value={truncMid(claim.imageFp, 14, 10)} title={claim.imageFp} />
          <Field label="Consensus timestamp" value={`${claim.consensusTs} · seq #${claim.seq}`} />
          <a href={HASHSCAN.hcsAudit} target="_blank" rel="noreferrer" className="self-start mt-1 mono text-[11px] flex items-center gap-1.5" style={{ color: "var(--emerald)" }}>
            view topic {HASHSCAN.hcsAuditId} on HashScan <ExternalIcon size={11} />
          </a>
          <div className="mono text-[10px]" style={{ color: "var(--ink-faint)" }}>No plaintext amounts, parties, or reasoning — ever.</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Lbl>{label}</Lbl>
      <span className="mono text-[12px]" style={{ color: "var(--ink)" }} title={title}>{value}</span>
    </div>
  );
}

// ── Client-side salted-Merkle recomputation (mirrors lib/merkle.ts exactly) ───────────
// leaf = sha256(0x00 ‖ salt ‖ 0x1f ‖ label ‖ 0x1f ‖ value); node = sha256(0x01 ‖ L ‖ R).
// Recomputing in the browser lets the verify scene SHOW the off-chain fields folding into
// the exact root anchored on Hedera — the mapping is demonstrated, not asserted.
const TEXT = new TextEncoder();
const B_LEAF = Uint8Array.of(0x00);
const B_NODE = Uint8Array.of(0x01);
const B_SEP = Uint8Array.of(0x1f);

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
function cat(...arrs: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}
async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}
function normalizeMerkleText(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}
async function computeLeaf(saltHex: string, label: string, value: string): Promise<Uint8Array> {
  return sha256(cat(B_LEAF, hexToBytes(saltHex), B_SEP, TEXT.encode(label), B_SEP, TEXT.encode(normalizeMerkleText(value))));
}
async function foldToRoot(leaf: Uint8Array, proof: { hash: string; right: boolean }[]): Promise<Uint8Array> {
  let acc = leaf;
  for (const step of proof) {
    const sib = hexToBytes(step.hash);
    acc = step.right ? await sha256(cat(B_NODE, acc, sib)) : await sha256(cat(B_NODE, sib, acc));
  }
  return acc;
}

const NICE_LABEL: Record<string, string> = {
  decision: "Decision",
  recommended_credit_pct: "Credit %",
  max_settlement_hbar: "Contract max",
  reasoning_summary: "Reasoning / logic",
};

type ComputedRow = { label: string; value: string; salt: string; leafHex: string; rootHex: string; ok: boolean };

/** Connector between two pipeline stages — a captioned down-arrow. */
function Flow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-0.5">
      <span className="mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-sm" style={{ color: "var(--ink-faint)", background: "var(--paper-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>{label}</span>
      <span style={{ color: "var(--ink-faint)", lineHeight: 1, fontSize: 13 }}>↓</span>
    </div>
  );
}

/** Scene 6 — selective disclosure, made explicit. Shows the private off-chain fields
 * (value + secret salt) hashing into per-field leaves, the leaves folding through their
 * Merkle proofs into one root, and that root matching — bit for bit — the Salted Merkle
 * Root anchored on Hedera at a fixed HCS sequence. "Re-verify against Hedera now" pulls
 * the sequence + consensus back from the live Mirror Node via the public /api/verify. */
export function VerifyReplay({ claim }: { claim: FeaturedClaim }) {
  const [rows, setRows] = useState<ComputedRow[] | null>(null);
  const [live, setLive] = useState<"idle" | "loading" | "ok" | "soft">("idle");
  const [seq, setSeq] = useState<number | null>(null);
  const [consensusTs, setConsensusTs] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const computed = await Promise.all(
          claim.disclosure.revealed.map(async (r) => {
            const leaf = await computeLeaf(r.salt, r.label, r.value);
            const rootHex = bytesToHex(await foldToRoot(leaf, r.proof));
            return { label: r.label, value: r.value, salt: r.salt, leafHex: bytesToHex(leaf), rootHex, ok: rootHex === claim.disclosure.commitment };
          }),
        );
        if (alive) setRows(computed);
      } catch {
        if (alive) setRows([]);
      }
    })();
    return () => { alive = false; };
  }, [claim]);

  async function reverify() {
    setLive("loading");
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(claim.disclosure),
      });
      const j = await res.json();
      if (res.ok && j.onChain?.sequenceNumber != null && j.allFieldsOk) {
        setSeq(j.onChain.sequenceNumber);
        setConsensusTs(j.onChain.consensusTimestamp ? formatMirrorTs(j.onChain.consensusTimestamp) : null);
        setLive("ok");
      } else {
        setLive("soft");
      }
    } catch {
      setLive("soft");
    }
  }

  const allOk = !!rows && rows.length > 0 && rows.every((r) => r.ok);
  const computedRoot = rows && rows.length > 0 ? rows[0].rootHex : claim.disclosure.commitment;
  const seqShown = seq ?? claim.seq;
  const consensusShown = consensusTs ?? claim.consensusTs;

  return (
    <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--emerald-bg)", boxShadow: "inset 0 0 0 1px rgba(11,93,59,0.22)" }}>
      <div className="px-5 py-3 hairline-b flex items-center justify-between gap-2 flex-wrap" style={{ background: "rgba(11,93,59,0.06)" }}>
        <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--emerald)" }}>Selective disclosure · prove one fact, reveal nothing else</span>
        <span className="mono text-[10px]" style={{ color: "var(--ink-faint)" }}>scope: counterparty</span>
      </div>
      <div className="px-5 py-4 bg-[var(--paper)] flex flex-col">
        {/* Stage 1 — the private off-chain fields (value + the secret salt). */}
        <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
          <div className="px-4 py-2.5 hairline-b flex items-center gap-2" style={{ background: "var(--paper-2)" }}>
            <span style={{ color: "var(--ink-faint)" }}>🔒</span>
            <Lbl>Private off-chain dossier · the fields you choose to reveal</Lbl>
          </div>
          <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {claim.disclosure.revealed.map((r) => (
              <div key={r.label} className={"flex flex-col gap-1 rounded-[3px] p-2.5" + (r.label === "reasoning_summary" ? " sm:col-span-2 lg:col-span-1" : "")} style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
                <Lbl>{NICE_LABEL[r.label] ?? r.label}</Lbl>
                <span className={(r.label === "reasoning_summary" ? "serif italic text-[12.5px] leading-snug" : "mono text-[13px] font-semibold")} style={{ color: "var(--ink)" }}>{r.value.replace(/_/g, " ")}</span>
                <span className="mono text-[10px]" style={{ color: "var(--ink-faint)" }} title={r.salt}>salt&nbsp;{r.salt.slice(0, 8)}…{r.salt.slice(-4)}</span>
              </div>
            ))}
          </div>
          <div className="px-4 pb-3 mono text-[10px] leading-snug" style={{ color: "var(--ink-faint)" }}>
            Every other field — the full contract, the photo&rsquo;s hash, the model prompt, each clause finding — stays sealed off-chain. Their salts are never revealed.
          </div>
        </div>

        <Flow label="SHA-256 leaf · the salt blinds the value" />

        {/* Stage 2 — the per-field leaf hashes, recomputed live in the browser. */}
        <div className="rounded-[5px] px-4 py-3" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
          <Lbl>Leaf hash per field · recomputed in your browser</Lbl>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {(rows ?? claim.disclosure.revealed.map((r) => ({ label: r.label, leafHex: "" }))).map((r) => (
              <div key={r.label} className="mono text-[10.5px] truncate" style={{ color: "var(--ink-2)" }} title={"leafHex" in r ? r.leafHex : ""}>
                <span style={{ color: "var(--ink-faint)" }}>{NICE_LABEL[r.label] ?? r.label}: </span>
                {"leafHex" in r && r.leafHex ? `${r.leafHex.slice(0, 12)}…` : "hashing…"}
              </div>
            ))}
          </div>
          <div className="mono text-[9.5px] mt-2" style={{ color: "var(--ink-faint)" }}>leaf = SHA-256( 0x00 ‖ salt ‖ label ‖ value )</div>
        </div>

        <Flow label={`Merkle proof fold · ${claim.disclosure.revealed[0]?.proof.length ?? 0} sibling hashes per field`} />

        {/* Stage 3 — the recomputed Salted Merkle root. */}
        <div className="rounded-[5px] px-4 py-3 flex flex-col gap-1.5" style={{ background: "var(--emerald-bg)", boxShadow: "inset 0 0 0 1px rgba(11,93,59,0.22)" }}>
          <Lbl>Recomputed Salted Merkle root</Lbl>
          <div className="mono text-[12px] break-all" style={{ color: "var(--ink)" }}>{computedRoot}</div>
          <div className="mono text-[10px] flex items-center gap-1.5" style={{ color: allOk ? "var(--emerald)" : "var(--ink-faint)" }}>
            <span>{allOk ? "✓" : "…"}</span>
            <span>{allOk ? `all ${rows.length} inclusion proofs fold to this one root` : "computing…"}</span>
          </div>
        </div>

        {/* The match band — the computed root equals the anchored root, bit for bit. */}
        <div className="flex items-center gap-2 self-center my-2">
          <i className="block h-px w-8" style={{ background: "var(--emerald)" }} />
          <span className="mono text-[9.5px] uppercase tracking-[0.16em] font-semibold px-2 py-0.5 rounded-sm" style={{ color: allOk ? "var(--emerald)" : "var(--ink-faint)", background: allOk ? "var(--emerald-bg)" : "var(--paper-2)", boxShadow: `inset 0 0 0 1px ${allOk ? "var(--emerald)" : "var(--keyline)"}` }}>
            {allOk ? "✓ matches bit-for-bit" : "matches"}
          </span>
          <i className="block h-px w-8" style={{ background: "var(--emerald)" }} />
        </div>

        {/* Stage 4 — the immutable on-chain anchor (read back from the Mirror Node). */}
        <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1.5px var(--emerald)" }}>
          <div className="px-4 py-2.5 hairline-b flex items-center justify-between gap-2 flex-wrap" style={{ background: "linear-gradient(180deg, var(--emerald-bg), var(--paper))" }}>
            <span className="mono text-[9.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--emerald)" }}>On-chain · Hedera Mirror Node (immutable)</span>
            <DocSeal />
          </div>
          <div className="px-4 py-3 flex flex-col gap-2">
            <Field label="Salted Merkle root (anchored)" value={claim.disclosure.commitment} title={claim.disclosure.commitment} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="HCS sequence" value={`#${seqShown}`} />
              <Field label="Consensus timestamp" value={consensusShown} />
            </div>
            <div className="flex items-center gap-3 flex-wrap mt-1">
              <a href={HASHSCAN.hcsAudit} target="_blank" rel="noreferrer" className="mono text-[11px] flex items-center gap-1.5" style={{ color: "var(--emerald)" }}>
                view topic {HASHSCAN.hcsAuditId} on HashScan <ExternalIcon size={11} />
              </a>
              <button onClick={reverify} disabled={live === "loading"} className="mono text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-[3px]" style={{ background: "transparent", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline-2)", cursor: live === "loading" ? "wait" : "pointer" }}>
                {live === "loading" ? "verifying…" : live === "ok" ? `✓ confirmed live · seq #${seqShown}` : "Re-verify against Hedera now"}
              </button>
            </div>
            {live === "soft" && (
              <div className="mono text-[10.5px]" style={{ color: "var(--ink-faint)" }}>Live re-verification runs against the deployed testnet record.</div>
            )}
          </div>
        </div>

        <p className="text-[12px] leading-snug mt-3" style={{ color: "var(--ink-mute)" }}>
          The contract and the photo never leave your vault. The disclosed result fields and the agent&rsquo;s reasoning/logic block provably belong to the record anchored on Hedera at seq #{seqShown}.
        </p>
      </div>
    </div>
  );
}

/** Scene 7 (settled) — the no-drain payout, pre-executed: both signatures in, the pUSDC
 * transfer executed by Hedera, the attestation NFT minted. */
export function SettleReplay({ claim }: { claim: FeaturedClaim }) {
  const Sig = ({ label, who, href }: { label: string; who: string; href: string }) => (
    <div className="flex-1 rounded-[4px] p-3" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--emerald)" }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <Lbl>{label}</Lbl>
        <a href={href} target="_blank" rel="noreferrer" className="mono text-[10px] flex items-center gap-1" style={{ color: "var(--ink-faint)" }}>{who}<ExternalIcon size={9} /></a>
      </div>
      <div className="w-full mono text-[11px] uppercase tracking-[0.14em] font-semibold px-3 py-2 rounded-[3px] text-center" style={{ background: "var(--emerald-bg)", color: "var(--emerald)", boxShadow: "inset 0 0 0 1px var(--emerald)" }}>✓ signed on-chain</div>
    </div>
  );
  return (
    <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1.5px var(--emerald)" }}>
      <div className="px-5 md:px-6 py-3 flex items-center justify-between gap-3 flex-wrap hairline-b" style={{ background: "linear-gradient(180deg, var(--emerald-bg), var(--paper))" }}>
        <div className="flex flex-col leading-tight">
          <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--emerald)" }}>Settled · mutual consent</span>
          <span className="text-[13px] font-semibold mt-0.5"><span className="mono tabular-nums">{claim.amountPusdc}</span> pUSDC · brand → retailer</span>
        </div>
        <a href={HASHSCAN.scheduleUrl(claim.scheduleId ?? "")} target="_blank" rel="noreferrer" className="mono text-[11px] flex items-center gap-1.5" style={{ color: "var(--emerald)" }}>schedule {claim.scheduleId}<ExternalIcon size={11} /></a>
      </div>
      <div className="px-5 md:px-6 py-4">
        <p className="text-[12.5px] leading-snug mb-3" style={{ color: "var(--ink-mute)" }}>
          The agent <b>proposed</b> this payout as a Hedera Scheduled Transaction. It executed <b>only</b> once both parties signed on-chain — the brand authorized the spend, the retailer accepted. No single key, and not the agent, could release the funds.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Sig label="Brand approver" who={HASHSCAN.brandId} href={HASHSCAN.brand} />
          <Sig label="Retailer" who={HASHSCAN.retailerId} href={HASHSCAN.retailer} />
        </div>
        <div className="mt-3 rounded-[4px] px-3 py-2.5 flex items-center gap-2.5 flex-wrap" style={{ background: "var(--emerald-bg)", boxShadow: "inset 0 0 0 1px var(--emerald)" }}>
          <span className="text-[13px]" style={{ color: "var(--emerald)" }}>✓</span>
          <span className="text-[12.5px]" style={{ color: "var(--ink)" }}>Executed by Hedera on both signatures — {claim.amountPusdc} pUSDC settled to the retailer.</span>
          {claim.nftSerial && (
            <a href={HASHSCAN.nftAttestation} target="_blank" rel="noreferrer" className="mono text-[10.5px] px-2 py-0.5 rounded-sm flex items-center gap-1" style={{ color: "var(--emerald)", background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--emerald)" }}>attestation NFT #{claim.nftSerial}<ExternalIcon size={9} /></a>
          )}
        </div>
      </div>
    </div>
  );
}

/** Scene 8 — recap: the real on-chain artifacts, the live URL, and a single quiet link
 * to the operator depth (never a governance lecture). */
function VaultRow({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "emerald" | "amber" | "blue" }) {
  const color = accent === "emerald" ? "var(--emerald)" : accent === "amber" ? "var(--amber)" : accent === "blue" ? "var(--blue)" : "var(--ink)";
  return (
    <div className="rounded-[4px] p-3 min-w-0" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
      <Lbl>{label}</Lbl>
      <div className="mono text-[12px] font-semibold mt-1 truncate" style={{ color }} title={value}>{value}</div>
      {sub && <div className="text-[11px] leading-snug mt-1" style={{ color: "var(--ink-faint)" }}>{sub}</div>}
    </div>
  );
}

function GovernanceVault({ claim }: { claim: FeaturedClaim }) {
  const assessment = claim.revisedAssessment ?? claim.assessment;
  const citationOk = claim.citations.filter((c) => c.verified).length;
  const mandate = buildPaymentMandate({
    commitment: claim.commitment,
    decision: assessment.decision,
    amount: claim.amountPusdc ?? 0,
    network: "testnet",
    payerAccount: HASHSCAN.brandId,
    payeeAccount: HASHSCAN.retailerId,
    scheduleId: claim.scheduleId ?? undefined,
    topicId: HASHSCAN.hcsAuditId,
    createdAt: "2026-05-31T10:23:02.009Z",
  });
  const access = [
    { actor: "Analyst_R", action: "opened sealed claim dossier", hash: "67c843b6fcb7c114666bd334cb0d8d31cd685d52407c301d68c7d91ca66ccadb" },
    { actor: "Auditor_A", action: "requested reasoning disclosure", hash: "17f7fa8e0b157e6de966c5b8fafe12091174e2aad5010ea7c91352b86a973647" },
    { actor: "BrandApprover_B", action: "signed settlement schedule", hash: "f1e69d31e92cd0863624972e601d10999ed47c090d59b4af21d660ba54218dc4" },
  ];

  return (
    <details open className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1.5px var(--emerald)" }}>
      <summary className="px-5 py-3 cursor-pointer select-none hairline-b" style={{ background: "linear-gradient(180deg, var(--emerald-bg), var(--paper))" }}>
        <span className="mono text-[10.5px] uppercase tracking-[0.14em] font-semibold" style={{ color: "var(--emerald)" }}>
          [ 🛡️ ENTERPRISE GOVERNANCE &amp; AUDIT VAULT (FORENSIC VIEW) ]
        </span>
      </summary>
      <div className="px-5 py-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[12.5px] leading-snug max-w-[760px]" style={{ color: "var(--ink-mute)" }}>
            Read-only forensic view for auditors: model-risk controls, access proofs, dispute posture, and AP2 mandate payload. Public ledger entries remain proof-only; sensitive contents stay in the sealed dossier.
          </p>
          <span className="mono text-[9.5px] uppercase tracking-[0.14em] px-2 py-1 rounded-sm" style={{ color: "var(--emerald)", background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--emerald)" }}>
            read-only
          </span>
        </div>

        <section>
          <Lbl>Model-risk evidence logs</Lbl>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
            <VaultRow label="Model lineage" value={claim.model} sub="captured with the adjudication dossier" />
            <VaultRow label="2nd-model review" value={claim.review.agrees ? "concurred" : claim.review.recommended_action} sub={claim.review.concern === "none" ? "no material concern" : claim.review.concern} accent="emerald" />
            <VaultRow label="Citation integrity" value={`${citationOk}/${claim.citations.length} clauses`} sub="contract references verified" accent={citationOk === claim.citations.length ? "emerald" : "amber"} />
            <VaultRow label="Human-control gate" value="mutual consent" sub="agent proposes; parties sign on-chain" accent="blue" />
          </div>
        </section>

        <section>
          <Lbl>Provable access logs · hashed actors and actions</Lbl>
          <div className="mt-2 rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
            {access.map((row, i) => (
              <div key={row.hash} className="grid grid-cols-1 md:grid-cols-[140px_1fr_260px] gap-2 px-4 py-2.5 hairline-b text-[11.5px]">
                <span className="mono font-semibold" style={{ color: "var(--ink)" }}>{row.actor}</span>
                <span style={{ color: "var(--ink-mute)" }}>{row.action}</span>
                <span className="mono truncate" title={row.hash} style={{ color: "var(--ink-faint)" }}>sha256:{i + 1}:{truncMid(row.hash, 12, 8)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-3">
          <div className="rounded-[5px] p-4" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
            <Lbl>Dispute handling metadata</Lbl>
            <div className="mt-3 flex flex-col gap-2">
              <Field label="Original commitment" value={truncMid(claim.commitment, 14, 10)} title={claim.commitment} />
              <Field label="Dispute status" value="none open · linked dispute route ready" />
              <Field label="Retention posture" value="crypto-shreddable off-chain dossier" />
              <Field label="Settlement evidence" value={claim.scheduleId ? `schedule ${claim.scheduleId}` : "not settled"} />
            </div>
          </div>
          <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
            <div className="px-4 py-2.5 hairline-b" style={{ background: "var(--paper-2)" }}>
              <Lbl>Raw AP2 payment mandate schema</Lbl>
            </div>
            <pre className="mono text-[10.5px] leading-[1.45] max-h-[320px] overflow-auto p-4 whitespace-pre-wrap" style={{ color: "var(--ink-2)" }}>
              {JSON.stringify(mandate, null, 2)}
            </pre>
          </div>
        </section>
      </div>
    </details>
  );
}

export function Recap({ claim }: { claim: FeaturedClaim }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[5px] p-5" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
        <Lbl>Real on-chain artifacts · Hedera testnet</Lbl>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
          <ProofLink label="HCS audit topic" id={HASHSCAN.hcsAuditId} sub="topic" href={HASHSCAN.hcsAudit} />
          <ProofLink label="Attestation NFT" id={HASHSCAN.nftAttestationId} sub="token" href={HASHSCAN.nftAttestation} />
          <ProofLink label="pUSDC" id={HASHSCAN.pusdcId} sub="token" href={HASHSCAN.pusdc} />
          <ProofLink label="Brand treasury" id={HASHSCAN.brandId} sub="account" href={HASHSCAN.brand} />
          <ProofLink label="Retailer" id={HASHSCAN.retailerId} sub="account" href={HASHSCAN.retailer} />
          {claim.scheduleId && <ProofLink label="Settlement schedule" id={claim.scheduleId} sub="schedule" href={HASHSCAN.scheduleUrl(claim.scheduleId)} />}
        </div>
      </div>
      <div className="rounded-[5px] px-5 py-4" style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
        <p className="text-[12.5px] leading-snug" style={{ color: "var(--ink-mute)" }}>
          Everything above ran on Hedera testnet — the topic, token, accounts, and schedule all resolve on HashScan. Want to watch it happen? Switch to the <b style={{ color: "var(--ink)" }}>Live testnet sandbox</b> at the top: the agent reads a fresh contract, judges the photo, and writes proof-only artifacts to the ledger in real time.
        </p>
      </div>
      <GovernanceVault claim={claim} />
    </div>
  );
}
