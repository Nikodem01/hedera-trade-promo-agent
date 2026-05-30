"use client";
// The on-chain accrual fund (escrow). Shows the brand's pre-funded pUSDC pool
// drawing down as mutually-consented settlements release to the retailer — the real
// trade-spend lifecycle (accrue up front, draw down on validated proof), on Hedera.
import { useCallback, useEffect, useState } from "react";
import { accountUrl } from "@/lib/hedera/hashscan";
import { ExternalIcon } from "./primitives";

type Escrow = { configured: boolean; token?: string; escrowAccount?: string; retailerAccount?: string; accrualBalance?: number; released?: number };

export function AccrualFund({ refreshKey, canAct = true }: { refreshKey?: number; canAct?: boolean }) {
  const [d, setD] = useState<Escrow | null>(null);
  const [refund, setRefund] = useState<{ scheduleId: string; refundAmount: number; executesAt: string } | null>(null);
  const [refunding, setRefunding] = useState(false);
  const load = useCallback(async () => {
    try { setD(await (await fetch("/api/escrow", { cache: "no-store" })).json()); } catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  async function doRefund() {
    setRefunding(true);
    try {
      const r = await fetch("/api/escrow/refund", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expirySeconds: 90 }) });
      const j = await r.json();
      if (r.ok) setRefund(j);
    } catch { /* ignore */ }
    setRefunding(false);
  }

  if (!d?.configured) return null;
  const remaining = d.accrualBalance ?? 0;
  const released = d.released ?? 0;
  const total = remaining + released;
  const pctReleased = total > 0 ? (released / total) * 100 : 0;

  return (
    <section className="max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-2 pb-2">
      <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
        <div className="px-5 md:px-6 py-2.5 hairline-b flex items-center justify-between gap-3 flex-wrap" style={{ background: "linear-gradient(180deg, var(--paper-2), var(--paper))" }}>
          <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>On-chain accrual fund · escrow (pUSDC)</span>
          {d.escrowAccount && (
            <a href={accountUrl(d.escrowAccount)} target="_blank" rel="noreferrer" className="mono text-[11px] flex items-center gap-1.5" style={{ color: "var(--emerald)" }}>
              {d.escrowAccount}<ExternalIcon size={11} />
            </a>
          )}
        </div>
        <div className="px-5 md:px-6 py-4 flex flex-wrap items-end gap-x-9 gap-y-3">
          <div className="flex flex-col gap-0.5">
            <span className="mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>Accrual remaining</span>
            <span className="text-[20px] font-semibold tabular-nums leading-none">{remaining.toFixed(0)} <span className="text-[12px] font-medium" style={{ color: "var(--ink-mute)" }}>pUSDC</span></span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>Released on consent</span>
            <span className="text-[20px] font-semibold tabular-nums leading-none" style={{ color: "var(--emerald)" }}>{released.toFixed(0)} <span className="text-[12px] font-medium" style={{ color: "var(--ink-mute)" }}>pUSDC</span></span>
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--paper-sunken)" }}>
              <div className="h-full" style={{ width: `${pctReleased}%`, background: "var(--emerald)" }} />
            </div>
            <span className="mono text-[9.5px] mt-1 inline-block" style={{ color: "var(--ink-faint)" }}>drawn down as mutually-consented claims settle · unspent refunds to brand at window end (HIP-423)</span>
          </div>
          <div className="flex flex-col gap-1 items-end">
            {refund ? (
              <span className="mono text-[10px]" style={{ color: "var(--emerald)" }}>↩ refund scheduled · {refund.refundAmount.toFixed(0)} pUSDC · executes {new Date(refund.executesAt).toISOString().replace("T", " ").replace(/\..*/, " UTC")} · sched {refund.scheduleId}</span>
            ) : (
              <button onClick={doRefund} disabled={refunding || !canAct} className="mono text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-[3px]" style={{ background: "transparent", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline-2)", cursor: refunding ? "wait" : canAct ? "pointer" : "not-allowed" }}>
                {refunding ? "scheduling…" : canAct ? "Close promo · refund unspent" : "Refund · operator only"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
