"use client";
// The PUBLIC commitment ledger: reads the audit topic back from Hedera's Mirror
// Node (via /api/audit). It shows ONLY the proof-only commitments anchored on-chain
// — no outcomes, amounts, parties, or reasoning. The confidential dossier lives
// off-chain; the operator's private console renders the business detail.
import { useCallback, useEffect, useState } from "react";
import { topicUrl } from "@/lib/hedera/hashscan";
import { ExternalIcon, truncMid } from "./primitives";

type AuditEntry = {
  sequenceNumber: number;
  consensusTimestamp: string;
  record: Record<string, unknown> | string;
};

/** "1779995141.226867720" (consensus seconds.nanos) → readable UTC. */
function fmtConsensus(ts: string): string {
  const secs = Number(ts.split(".")[0]);
  if (!Number.isFinite(secs)) return ts;
  return new Date(secs * 1000).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

/** The HcsAuditTrailHook auto-logs each fund-moving / minting call as free text:
 * "Agent executed tool {tool} ... Transaction Status: {status}". Parse it so the
 * ledger shows this second provenance layer cleanly alongside decision records. */
function parseHookRecord(text: string): { tool: string; status: string } | null {
  const tool = text.match(/Agent executed tool (\w+)/)?.[1];
  if (!tool) return null;
  const status = text.match(/Transaction Status:\s*(\w+)/)?.[1] ?? "submitted";
  return { tool: tool.replace(/_tool$/, ""), status };
}

function Metric({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>{label}</span>
      <span className="text-[20px] font-semibold tabular-nums leading-none" style={{ color: "var(--ink)" }}>{value}</span>
      {caption && <span className="mono text-[9.5px]" style={{ color: "var(--ink-faint)" }}>{caption}</span>}
    </div>
  );
}

/** Public-ledger stats. We only count the commitments anchored — outcomes, amounts,
 * parties and reasoning are NEVER on-chain, so they're deliberately absent here. */
function PortfolioStats({ entries }: { entries: AuditEntry[] }) {
  const count = entries.filter(
    (e) => typeof e.record === "object" && e.record !== null && "commitment" in (e.record as object),
  ).length;
  if (count === 0) return null;
  return (
    <div className="px-5 md:px-6 py-4 hairline-b flex flex-wrap items-end gap-x-9 gap-y-4" style={{ background: "var(--paper-2)" }}>
      <Metric label="Decisions committed" value={String(count)} caption="proof-only anchors" />
      <Metric label="Cycle time" value="seconds" caption="vs 60–120 days, by hand" />
      <div className="max-w-[440px]">
        <span className="mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>Public ledger · zero business data</span>
        <p className="text-[11.5px] leading-snug mt-1" style={{ color: "var(--ink-mute)" }}>
          Outcomes, amounts, parties and reasoning never touch the chain — only salted commitments. Any field is revealed &amp; proven on demand.
        </p>
      </div>
    </div>
  );
}

export function AuditLedger({ refreshKey }: { refreshKey?: number }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sealing, setSealing] = useState(false);
  const [sealed, setSealed] = useState<{ count: number; sequenceNumber?: number } | null>(null);

  async function seal() {
    setSealing(true);
    try {
      const r = await fetch("/api/batch/seal", { method: "POST" });
      const j = await r.json();
      if (r.ok) setSealed(j);
    } catch { /* ignore */ }
    setSealing(false);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/audit", { cache: "no-store" });
      const data = await res.json();
      setTopicId(data.topicId ?? null);
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      if (data.error) setErr(data.error);
    } catch {
      setErr("could not reach mirror node");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <section className="max-w-[1100px] w-full mx-auto px-6 md:px-8 pb-12">
      <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
        <div className="px-5 md:px-6 py-3 flex items-center justify-between gap-3 flex-wrap hairline-b" style={{ background: "linear-gradient(180deg, var(--paper-2), var(--paper))" }}>
          <div className="flex flex-col leading-tight">
            <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>
              On-chain audit ledger · read back from Hedera Mirror Node
            </span>
            <span className="text-[13px] font-semibold">Immutable decision record · every verdict, recorded</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={seal} disabled={sealing} className="mono text-[10.5px] uppercase tracking-[0.14em] font-medium px-3 py-1.5 rounded-[3px]" title="Roll all commitments into one Merkle batch root and anchor a single HCS message (scale + privacy)" style={{ background: "transparent", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline-2)", cursor: sealing ? "wait" : "pointer" }}>
              {sealing ? "sealing…" : sealed ? `✓ batch ${sealed.count}→1 (seq #${sealed.sequenceNumber ?? "—"})` : "seal batch"}
            </button>
            <button onClick={load} disabled={loading} className="mono text-[10.5px] uppercase tracking-[0.14em] font-medium px-3 py-1.5 rounded-[3px]" style={{ background: "transparent", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline-2)", cursor: loading ? "wait" : "pointer" }}>
              {loading ? "reading…" : "refresh"}
            </button>
            {topicId && (
              <a href={topicUrl(topicId)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 mono text-[11.5px] font-medium" style={{ color: "var(--emerald)" }}>
                {topicId}
                <ExternalIcon size={11} />
              </a>
            )}
          </div>
        </div>

        <PortfolioStats entries={entries} />

        {err && (
          <div className="px-5 md:px-6 py-3 text-[12px]" style={{ color: "var(--red)" }}>{err}</div>
        )}

        {entries.length === 0 && !loading && !err ? (
          <div className="px-5 md:px-6 py-8 text-center text-[13px]" style={{ color: "var(--ink-mute)" }}>
            No records yet. Adjudicate a claim — the verdict is written here, on-chain.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--keyline-soft)" }}>
            {entries.map((e) => {
              const r = e.record;
              const rec = typeof r === "object" && r !== null ? (r as Record<string, unknown>) : null;
              const commitment = (rec?.commitment as string) || null;
              const imageFp = (rec?.image_fp as string) || null;
              const hook = typeof r === "string" ? parseHookRecord(r) : null;
              return (
                <div key={e.sequenceNumber} className="px-5 md:px-6 py-3 grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1 items-center" style={{ boxShadow: "inset 0 -1px 0 var(--keyline-soft)" }}>
                  <span className="mono text-[11px] tabular-nums px-2 py-0.5 rounded-sm" style={{ background: "var(--paper-2)", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
                    #{e.sequenceNumber}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium truncate" style={{ color: "var(--ink)" }}>
                      {commitment ? (
                        <span className="mono text-[12px]">◆ decision commitment</span>
                      ) : hook ? (
                        <span className="mono text-[12px]">⛓ {hook.tool}</span>
                      ) : (
                        typeof r === "string" ? truncMid(r, 48, 0) : "record"
                      )}
                    </div>
                    <div className="mono text-[10px] tracking-[0.04em] mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: "var(--ink-faint)" }}>
                      <span>{fmtConsensus(e.consensusTimestamp)}</span>
                      {commitment && <span title={commitment}>· commit {truncMid(commitment, 8, 6)}</span>}
                      {imageFp && <span title={imageFp}>· img {truncMid(imageFp, 6, 4)}</span>}
                      {hook && <span>· enforced audit hook</span>}
                    </div>
                  </div>
                  <div className="justify-self-end">
                    {commitment ? (
                      <span className="mono text-[9.5px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-sm" style={{ color: "var(--emerald)", background: "var(--emerald-bg)", boxShadow: "inset 0 0 0 1px rgba(11,93,59,0.18)" }}>
                        committed
                      </span>
                    ) : hook ? (
                      <span className="mono text-[9.5px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-sm" style={{ color: "var(--emerald)", background: "var(--emerald-bg)", boxShadow: "inset 0 0 0 1px rgba(11,93,59,0.18)" }}>
                        {hook.status}
                      </span>
                    ) : (
                      <span className="mono text-[10px] uppercase" style={{ color: "var(--ink-faint)" }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
