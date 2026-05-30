"use client";
// Raise a dispute / chargeback against a settled or rejected claim. The dispute is
// anchored as a proof-only commitment LINKED to the original decision — so years later
// both sides have a tamper-proof record neither can alter or backdate. Re-adjudication
// then runs through the normal agent loop (submit the new evidence). Gated: only the
// operator can raise one; the public view shows the capability, not the action.
import { useState } from "react";
import { topicUrl } from "@/lib/hedera/hashscan";
import { ExternalIcon, truncMid } from "./primitives";

type Result = { commitment: string; anchor?: { topicId: string; sequenceNumber: number } | null };

export function Dispute({ canAct }: { canAct?: boolean }) {
  const [commitment, setCommitment] = useState("");
  const [by, setBy] = useState<"retailer" | "brand">("retailer");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const ready = commitment.trim().length > 0 && reason.trim().length > 0;

  async function raise() {
    if (!ready) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/dispute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ original_commitment: commitment.trim(), disputed_by: by, reason: reason.trim(), new_evidence: evidence.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `dispute failed (${r.status})`);
      setRes(j); setReason(""); setEvidence("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    }
    setBusy(false);
  }

  const fieldStyle = { background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" } as const;

  return (
    <section className="max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-2 pb-4">
      <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
        <div className="px-5 md:px-6 py-2.5 hairline-b flex items-center justify-between gap-2.5 flex-wrap" style={{ background: "linear-gradient(180deg, var(--paper-2), var(--paper))" }}>
          <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>Dispute / chargeback · linked on-chain</span>
          <span className="mono text-[9.5px]" style={{ color: "var(--ink-faint)" }}>the &ldquo;resurfaces years later&rdquo; case, made provable</span>
        </div>
        <div className="px-5 md:px-6 py-4 flex flex-col gap-3">
          {!canAct && (
            <div className="mono text-[10.5px] uppercase tracking-[0.12em] px-3 py-2 rounded-[3px]" style={{ color: "var(--ink-mute)", background: "var(--paper-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
              Operator access required to raise a dispute · viewing the capability
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <input value={commitment} onChange={(e) => setCommitment(e.target.value)} disabled={!canAct} placeholder="original decision commitment (64-hex)" className="field-bare flex-1 min-w-[260px] mono text-[12px] px-3 py-2 rounded-[3px]" style={fieldStyle} />
            <div className="flex rounded-[3px] overflow-hidden" style={{ boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
              {(["retailer", "brand"] as const).map((p) => (
                <button key={p} onClick={() => setBy(p)} disabled={!canAct} className="mono text-[10px] uppercase tracking-[0.12em] px-3 py-2" style={{ background: by === p ? "var(--ink)" : "transparent", color: by === p ? "white" : "var(--ink-mute)", cursor: canAct ? "pointer" : "not-allowed" }}>{p}</button>
              ))}
            </div>
          </div>
          <input value={reason} onChange={(e) => setReason(e.target.value)} disabled={!canAct} placeholder="reason for the dispute" className="field-bare mono text-[12px] px-3 py-2 rounded-[3px]" style={fieldStyle} />
          <input value={evidence} onChange={(e) => setEvidence(e.target.value)} disabled={!canAct} placeholder="new evidence (optional) — e.g. a dated POS report" className="field-bare mono text-[12px] px-3 py-2 rounded-[3px]" style={fieldStyle} />
          <div className="flex items-center gap-3">
            <button onClick={raise} disabled={!canAct || !ready || busy} className="mono text-[11px] uppercase tracking-[0.14em] font-semibold px-4 py-2 rounded-[3px]" style={{ background: canAct && ready && !busy ? "var(--amber)" : "var(--paper-sunken)", color: canAct && ready && !busy ? "white" : "var(--ink-faint)", cursor: canAct && ready && !busy ? "pointer" : "not-allowed" }}>
              {busy ? "anchoring…" : "Raise dispute"}
            </button>
            {err && <span className="text-[11px]" style={{ color: "var(--red)" }}>{err}</span>}
            {res && (
              <span className="mono text-[10.5px] flex items-center gap-2" style={{ color: "var(--emerald)" }}>
                dispute anchored · commit {truncMid(res.commitment, 8, 6)}
                {res.anchor && (
                  <a href={topicUrl(res.anchor.topicId)} target="_blank" rel="noreferrer" className="flex items-center gap-1">seq #{res.anchor.sequenceNumber}<ExternalIcon size={10} /></a>
                )}
              </span>
            )}
          </div>
          <span className="mono text-[9px]" style={{ color: "var(--ink-faint)" }}>The dispute links to the original decision&rsquo;s commitment; re-adjudicate by submitting the new evidence to the agent. Original → dispute → revised outcome form an immutable, selectively-disclosable chain.</span>
        </div>
      </div>
    </section>
  );
}
