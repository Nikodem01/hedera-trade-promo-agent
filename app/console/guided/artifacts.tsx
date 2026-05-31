"use client";
// Scripted artifacts for the guided tour's public retelling. These render the FROZEN
// featured run (real photo, real boxes, real on-chain ids) without invoking the live
// agent — so the public read-only URL is truthful and bulletproof for recording. The
// operator/live path reuses the real interactive components instead (see Stage 5).
import { useState } from "react";
import type { FeaturedClaim } from "../data";
import { HASHSCAN } from "../data";
import { DocSeal, ExternalIcon, truncMid } from "../primitives";
import { ProofLink } from "./GuidedScene";

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
        Settlement is in <b style={{ color: "var(--ink-mute)" }}>pUSDC</b>, a USD-pegged stablecoin — the trade dollars. (Hedera&rsquo;s own coin, HBAR, just pays the network&rsquo;s fractions-of-a-cent fees.)
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
          <div className="mono text-[10px]" style={{ color: "var(--ink-faint)" }}>No amounts, parties, or reasoning — ever.</div>
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

/** Scene 6 — selective disclosure. Defaults to the frozen "proven" result (bulletproof
 * for recording); "Re-verify now" genuinely proves the captured disclosure against the
 * live chain via the public /api/verify route. */
export function VerifyReplay({ claim }: { claim: FeaturedClaim }) {
  const [live, setLive] = useState<"idle" | "loading" | "ok" | "soft">("idle");
  const [seq, setSeq] = useState<number | null>(null);

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
        setLive("ok");
      } else {
        setLive("soft");
      }
    } catch {
      setLive("soft");
    }
  }

  const niceLabel: Record<string, string> = {
    decision: "Decision",
    recommended_credit_pct: "Credit %",
    max_settlement_hbar: "Contract max",
  };

  return (
    <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--emerald-bg)", boxShadow: "inset 0 0 0 1px rgba(11,93,59,0.22)" }}>
      <div className="px-5 py-3 hairline-b flex items-center justify-between gap-2 flex-wrap" style={{ background: "rgba(11,93,59,0.06)" }}>
        <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--emerald)" }}>Selective disclosure · prove one fact, reveal nothing else</span>
        <span className="mono text-[10px]" style={{ color: "var(--ink-faint)" }}>scope: counterparty</span>
      </div>
      <div className="px-5 py-4 bg-[var(--paper)]">
        <div className="flex flex-col gap-2">
          {claim.disclosure.revealed.map((r) => (
            <div key={r.label} className="flex items-center gap-2.5 text-[12.5px]">
              <span style={{ color: "var(--emerald)" }}>✓</span>
              <span className="mono" style={{ color: "var(--ink-faint)" }}>{niceLabel[r.label] ?? r.label}</span>
              <span className="mono font-medium" style={{ color: "var(--ink)" }}>{r.value.replace(/_/g, " ")}</span>
              <span className="mono text-[10.5px]" style={{ color: "var(--ink-faint)" }}>proven against seq #{seq ?? claim.seq}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <span className="text-[12px]" style={{ color: "var(--ink-mute)" }}>Everything else — the contract, the photo, the reasoning — stays sealed.</span>
          <button onClick={reverify} disabled={live === "loading"} className="mono text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-[3px]" style={{ background: "transparent", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline-2)", cursor: live === "loading" ? "wait" : "pointer" }}>
            {live === "loading" ? "verifying…" : live === "ok" ? "✓ verified live on Hedera" : "Re-verify against Hedera now"}
          </button>
        </div>
        {live === "soft" && (
          <div className="mt-2 mono text-[10.5px]" style={{ color: "var(--ink-faint)" }}>Live re-verification runs against the deployed testnet record.</div>
        )}
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
          And for the enterprise buyer who digs deeper: model-risk evidence, a provable access log, dispute handling, and an AP2 payment mandate all live in the operator console.
        </p>
      </div>
    </div>
  );
}
