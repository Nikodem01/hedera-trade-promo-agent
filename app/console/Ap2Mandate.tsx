"use client";
// Export a settlement as an AP2 (Agent Payments Protocol) payment mandate — a verifiable,
// non-repudiable payment authorization in the emerging agent-payments standard, backed by
// our on-chain mutual consent. Operator-gated (it carries amount/parties).
import { useState } from "react";

export function Ap2Mandate({ canAct }: { canAct?: boolean }) {
  const [commitment, setCommitment] = useState("");
  const ready = /^[0-9a-f]{64}$/.test(commitment.trim());
  function exportMandate() {
    if (!ready) return;
    window.open(`/api/mandate?commitment=${encodeURIComponent(commitment.trim())}`, "_blank");
  }
  return (
    <section className="max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-2 pb-4">
      <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
        <div className="px-5 md:px-6 py-2.5 hairline-b flex items-center justify-between gap-2.5 flex-wrap" style={{ background: "linear-gradient(180deg, var(--paper-2), var(--paper))" }}>
          <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>AP2 payment mandate · agent-payments standard</span>
          <span className="mono text-[9.5px]" style={{ color: "var(--ink-faint)" }}>verifiable, consensus-backed authorization</span>
        </div>
        <div className="px-5 md:px-6 py-4 flex flex-col gap-2.5">
          <p className="text-[12px] leading-snug" style={{ color: "var(--ink-mute)" }}>
            Export this settlement as an{" "}
            <a href="https://ap2-protocol.org/specification/" target="_blank" rel="noreferrer" style={{ color: "var(--emerald)" }}>AP2</a>{" "}
            CartMandate + PaymentMandate (W3C Verifiable Credential) — the agent-payments standard for verifiable,
            non-repudiable payment authorization. Ours is backed by <b>Hedera consensus</b> (both parties&rsquo; on-chain
            signatures), not merely asserted.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <input value={commitment} onChange={(e) => setCommitment(e.target.value)} disabled={!canAct} placeholder="settlement commitment (64-hex)" className="field-bare flex-1 min-w-[260px] mono text-[12px] px-3 py-2 rounded-[3px]" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }} />
            <button onClick={exportMandate} disabled={!canAct || !ready} className="mono text-[10.5px] uppercase tracking-[0.12em] font-semibold px-4 py-2 rounded-[3px]" style={{ background: canAct && ready ? "var(--ink)" : "var(--paper-sunken)", color: canAct && ready ? "white" : "var(--ink-faint)", cursor: canAct && ready ? "pointer" : "not-allowed" }}>
              {canAct ? "Export AP2 mandate" : "Operator only"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
