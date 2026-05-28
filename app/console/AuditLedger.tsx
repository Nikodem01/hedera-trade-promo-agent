"use client";
// Reads the immutable decision ledger back from Hedera's Mirror Node (via
// /api/audit) and renders it — closing the "verifiable" loop. These records are
// fetched from the chain, independent of the agent run that wrote them.
import { useCallback, useEffect, useState } from "react";
import type { ComplianceAssessmentType } from "@/lib/plugins/tpp-evaluator/schemas";
import { topicUrl } from "@/lib/hedera/hashscan";
import { DecisionBadge, ExternalIcon, truncMid } from "./primitives";

type Decision = ComplianceAssessmentType["decision"];

type AuditEntry = {
  sequenceNumber: number;
  consensusTimestamp: string;
  record: Record<string, unknown> | string;
};

const DECISIONS = ["approve", "partial_credit", "reject", "request_more_evidence", "escalate_human"];
const isDecision = (v: unknown): v is Decision => typeof v === "string" && DECISIONS.includes(v);

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

export function AuditLedger({ refreshKey }: { refreshKey?: number }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
              const decision = rec && isDecision(rec.decision) ? rec.decision : null;
              const retailer = (rec?.retailer as string) || null;
              const promotion = (rec?.promotion as string) || (rec?.claim as string) || null;
              const model = (rec?.model as string) || null;
              const hash = (rec?.evidence_hash as string) || null;
              const hook = typeof r === "string" ? parseHookRecord(r) : null;
              return (
                <div key={e.sequenceNumber} className="px-5 md:px-6 py-3 grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1 items-center" style={{ boxShadow: "inset 0 -1px 0 var(--keyline-soft)" }}>
                  <span className="mono text-[11px] tabular-nums px-2 py-0.5 rounded-sm" style={{ background: "var(--paper-2)", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
                    #{e.sequenceNumber}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium truncate" style={{ color: "var(--ink)" }}>
                      {decision ? (
                        `${retailer ?? "Claim"}${promotion ? ` · ${promotion}` : ""}`
                      ) : hook ? (
                        <span className="mono text-[12px]">⛓ {hook.tool}</span>
                      ) : (
                        typeof r === "string" ? truncMid(r, 48, 0) : "record"
                      )}
                    </div>
                    <div className="mono text-[10px] tracking-[0.04em] mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: "var(--ink-faint)" }}>
                      <span>{fmtConsensus(e.consensusTimestamp)}</span>
                      {model && <span>· {model}</span>}
                      {hash && <span title={hash}>· hash {truncMid(hash, 8, 6)}</span>}
                      {hook && <span>· enforced audit hook</span>}
                    </div>
                  </div>
                  <div className="justify-self-end">
                    {decision ? (
                      <DecisionBadge decision={decision} size="sm" />
                    ) : hook ? (
                      <span className="mono text-[9.5px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-sm" style={{ color: "var(--emerald)", background: "var(--emerald-bg, rgba(11,93,59,0.08))", boxShadow: "inset 0 0 0 1px rgba(11,93,59,0.18)" }}>
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
