"use client";
// The basis of the judgement, made inspectable: the proof photo the vision model
// saw (click to enlarge), the bespoke contract it judged against, and the
// retailer's narrative. Clause findings in the verdict cross-link here — clicking
// a finding highlights the exact clause it rests on.
import { useEffect, useRef, useState } from "react";
import type { Scenario } from "@/app/components/Console";

/** The negotiation moment, live: the agent's precise evidence ask + an inline
 * reply that accepts written evidence AND/OR a clearer proof photo. An attached
 * photo is uploaded out-of-band (/api/upload) and referenced by id; the agent
 * re-judges that new image against the original contract. */
export function EvidenceRequestPanel({
  requested,
  onSend,
  busy,
}: {
  requested?: string;
  onSend: (text: string) => void;
  busy: boolean;
}) {
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f: File | null) {
    setErr(null);
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit() {
    if (busy || uploading || (!note.trim() && !file)) return;
    let msg = note.trim();
    if (file) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "upload failed");
        msg = `${msg ? msg + "\n\n" : ""}Attaching a clearer proof photo as additional evidence.\nNEW_IMAGE_REF: ${data.ref}`;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "upload failed");
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    onSend(msg);
    setNote("");
    pick(null);
  }

  const canSend = !busy && !uploading && (!!note.trim() || !!file);

  return (
    <div className="rounded-[4px] overflow-hidden" style={{ background: "var(--blue-bg, rgba(29,78,216,0.05))", boxShadow: "inset 0 0 0 1px rgba(29,78,216,0.25)" }}>
      <div className="px-4 md:px-5 py-3 flex items-center gap-2.5 hairline-b" style={{ background: "rgba(29,78,216,0.06)" }}>
        <i className="block w-2 h-2 rounded-full" style={{ background: "var(--blue)" }} />
        <span className="mono text-[10.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--blue)" }}>Negotiation · evidence requested</span>
      </div>
      <div className="px-4 md:px-5 py-4">
        {requested && <p className="text-[14.5px] leading-snug font-medium mb-3" style={{ color: "var(--ink)" }}>{requested}</p>}

        <div className="flex items-stretch gap-2 rounded-[3px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
          <input
            className="field-bare flex-1 px-3 py-2.5 text-[13px]"
            placeholder="Type written evidence (e.g. a POS timestamp), and/or attach a clearer photo…"
            value={note}
            disabled={busy || uploading}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <label className="mono text-[11px] uppercase tracking-[0.12em] font-medium px-3 flex items-center cursor-pointer" style={{ color: "var(--blue)", borderLeft: "1px solid var(--keyline)" }} title="Attach a clearer proof photo">
            + photo
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy || uploading} onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
          <button onClick={submit} disabled={!canSend} className="mono text-[11px] uppercase tracking-[0.14em] font-medium px-3" style={{ background: canSend ? "var(--blue)" : "var(--paper-sunken)", color: canSend ? "white" : "var(--ink-faint)", cursor: canSend ? "pointer" : "not-allowed" }}>
            {uploading ? "uploading…" : "Send"}
          </button>
        </div>

        {preview && (
          <div className="mt-2 flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="attached evidence preview" className="h-12 w-12 object-cover rounded-[3px]" style={{ boxShadow: "inset 0 0 0 1px var(--keyline-2)" }} />
            <span className="mono text-[11px]" style={{ color: "var(--ink-mute)" }}>{file?.name}</span>
            <button onClick={() => pick(null)} className="mono text-[10.5px] underline" style={{ color: "var(--ink-faint)" }}>remove</button>
          </div>
        )}
        {err && <div className="mt-2 text-[12px]" style={{ color: "var(--red)" }}>{err}</div>}
      </div>
    </div>
  );
}

/** Strip clause prefixes so "Section 2.1" matches "2.1" in the contract text. */
function clauseToken(ref: string): string {
  return ref.replace(/§|sections?|clauses?|articles?|paragraphs?|nos?\.?/gi, "").trim();
}

function lineMatchesClause(line: string, clause: string | null | undefined): boolean {
  if (!clause) return false;
  const tok = clauseToken(clause);
  if (!tok) return false;
  return line.includes(tok);
}

export function EvidencePanel({
  scenario,
  highlightClause,
}: {
  scenario: Scenario;
  highlightClause?: string | null;
}) {
  const [showContract, setShowContract] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const hitRef = useRef<HTMLDivElement | null>(null);
  const src = `/proofs/${scenario.imageRef}`;

  // A clause was clicked in the verdict: open the contract and scroll the match in.
  useEffect(() => {
    if (highlightClause) {
      setShowContract(true);
      const t = setTimeout(() => hitRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
      return () => clearTimeout(t);
    }
  }, [highlightClause]);

  const lines = scenario.contractText.split("\n");
  let firstHit = true;

  return (
    <div className="rounded-[4px] p-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
      <div className="flex flex-col gap-1.5">
        <button onClick={() => setLightbox(true)} className="block rounded-[3px] overflow-hidden relative group" style={{ boxShadow: "inset 0 0 0 1px var(--keyline-2)" }} title="Click to enlarge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`Proof photo — ${scenario.promo}`} className="w-full h-[120px] object-cover" />
          <span className="absolute bottom-1 right-1 mono text-[8.5px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-sm" style={{ background: "rgba(22,22,26,0.72)", color: "white" }}>
            ⤢ enlarge
          </span>
        </button>
        <span className="mono text-[9px] uppercase tracking-[0.12em]" style={{ color: "var(--ink-faint)" }}>Proof photo · evidence</span>
      </div>

      <div className="min-w-0 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.14em] mono font-medium" style={{ color: "var(--ink-faint)" }}>Analyst submission · evidence on record</div>
            <div className="text-[14px] font-semibold mt-0.5">{scenario.retailer} · {scenario.promo}</div>
          </div>
        </div>

        <blockquote className="serif pl-3 text-[13px] leading-snug border-l-2 italic" style={{ borderColor: "var(--keyline-2)", color: "var(--ink-2)" }}>
          “{scenario.narrative}”
        </blockquote>

        <button onClick={() => setShowContract((v) => !v)} className="self-start mono text-[10.5px] uppercase tracking-[0.14em] font-medium px-2.5 py-1 rounded-[3px] inline-flex items-center gap-1.5" style={{ background: "var(--paper-2)", color: "var(--ink-mute)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
          {showContract ? "−" : "+"} Bespoke contract · {lines.length} lines
        </button>

        {showContract && (
          <div className="rounded-[3px] p-3 max-h-[320px] overflow-auto" style={{ background: "var(--paper-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
            <pre className="mono text-[11px] leading-[1.55] whitespace-pre-wrap" style={{ color: "var(--ink-2)" }}>
              {lines.map((line, i) => {
                const hit = lineMatchesClause(line, highlightClause);
                const attachRef = hit && firstHit;
                if (attachRef) firstHit = false;
                return (
                  <div
                    key={i}
                    ref={attachRef ? hitRef : undefined}
                    style={hit ? { background: "var(--amber-bg, rgba(180,83,9,0.12))", borderRadius: 2, boxShadow: "inset 2px 0 0 var(--amber, #B45309)", paddingLeft: 6, marginLeft: -6 } : undefined}
                  >
                    {line || " "}
                  </div>
                );
              })}
            </pre>
          </div>
        )}
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(false)} className="fixed inset-0 z-50 flex items-center justify-center p-6 cursor-zoom-out" style={{ background: "rgba(22,22,26,0.82)" }}>
          <figure className="max-w-[92vw] max-h-[90vh] flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Proof photo — ${scenario.promo}`} className="max-w-full max-h-[82vh] object-contain rounded-[3px]" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }} />
            <figcaption className="mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.85)" }}>
              {scenario.retailer} · {scenario.promo} — the photo the model judged · click to close
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
