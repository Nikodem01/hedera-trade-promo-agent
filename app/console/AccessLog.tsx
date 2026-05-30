"use client";
// The provable access & oversight log. Reads the audit topic back from the Mirror Node
// (/api/audit) and surfaces the GOVERNANCE events — every confidential-data disclosure,
// every human override, every dispute — each a proof-only HCS commitment linked to the
// decision it touched. The who/what/when detail is sealed off-chain (selectively
// disclosable); only the tamper-proof commitment is public. A hosted DB log is editable
// by its host — a consensus-anchored one is not. This is the SOC2/ISO-42001 access
// control, made unforgeable.
import { useCallback, useEffect, useState } from "react";
import { topicUrl } from "@/lib/hedera/hashscan";
import { ExternalIcon, truncMid } from "./primitives";

type Entry = { sequenceNumber: number; consensusTimestamp: string; record: Record<string, unknown> | string };
type Event = { seq: number; ts: string; kind: string; commitment: string; linksTo?: string };

const KIND_META: Record<string, { label: string; color: string; bg: string }> = {
  "access-log": { label: "Data access", color: "var(--blue)", bg: "var(--blue-bg)" },
  override: { label: "Human override", color: "var(--violet)", bg: "var(--violet-bg)" },
  dispute: { label: "Dispute raised", color: "var(--amber)", bg: "var(--amber-bg)" },
};

function fmt(ts: string): string {
  const secs = Number(ts.split(".")[0]);
  if (!Number.isFinite(secs)) return ts;
  return new Date(secs * 1000).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

export function AccessLog({ refreshKey }: { refreshKey?: number }) {
  const [rows, setRows] = useState<Event[]>([]);
  const [topicId, setTopicId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await (await fetch("/api/audit", { cache: "no-store" })).json();
      setTopicId(d.topicId ?? null);
      const out: Event[] = [];
      for (const e of (d.entries ?? []) as Entry[]) {
        const r = typeof e.record === "object" && e.record ? (e.record as Record<string, unknown>) : null;
        const kind = r?.kind as string | undefined;
        if (kind && KIND_META[kind]) {
          out.push({
            seq: e.sequenceNumber,
            ts: e.consensusTimestamp,
            kind,
            commitment: String(r!.commitment ?? ""),
            linksTo: r!.links_to ? String(r!.links_to) : undefined,
          });
        }
      }
      setRows(out.sort((a, b) => b.seq - a.seq));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <section className="max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-2 pb-4">
      <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
        <div className="px-5 md:px-6 py-2.5 hairline-b flex items-center justify-between gap-2.5 flex-wrap" style={{ background: "linear-gradient(180deg, var(--paper-2), var(--paper))" }}>
          <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>Provable access &amp; oversight log · on-chain</span>
          <span className="mono text-[9.5px]" style={{ color: "var(--ink-faint)" }}>who touched what, when — tamper-proof</span>
        </div>
        {rows.length === 0 ? (
          <div className="px-5 md:px-6 py-6 text-[12.5px] leading-snug" style={{ color: "var(--ink-mute)" }}>
            No access, override, or dispute events yet. Disclosing a decision, overriding it, or raising a dispute anchors a proof-only event here — verifiable by anyone, exposing nothing confidential.
          </div>
        ) : (
          <ul>
            {rows.map((r) => {
              const meta = KIND_META[r.kind];
              return (
                <li key={r.seq} className="px-5 md:px-6 py-3 hairline-b flex items-center gap-x-4 gap-y-1.5 flex-wrap">
                  <span className="mono text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-sm font-medium" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                  <span className="mono text-[11px]" style={{ color: "var(--ink-mute)" }}>commit {truncMid(r.commitment, 8, 6)}</span>
                  {r.linksTo && <span className="mono text-[11px]" style={{ color: "var(--ink-faint)" }}>→ decision {truncMid(r.linksTo, 8, 6)}</span>}
                  <span className="mono text-[10.5px] ml-auto" style={{ color: "var(--ink-faint)" }}>{fmt(r.ts)}</span>
                  {topicId && (
                    <a href={topicUrl(topicId)} target="_blank" rel="noreferrer" className="mono text-[10.5px] flex items-center gap-1" style={{ color: "var(--emerald)" }}>
                      seq #{r.seq}<ExternalIcon size={10} />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="px-5 md:px-6 py-2 hairline-t">
          <span className="mono text-[9px]" style={{ color: "var(--ink-faint)" }}>Each event is a proof-only HCS commitment (no business data on-chain); the detail is sealed off-chain and selectively disclosable.</span>
        </div>
      </div>
    </section>
  );
}
