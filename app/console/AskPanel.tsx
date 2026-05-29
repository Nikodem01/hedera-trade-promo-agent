"use client";
// Conversational audit query over the confidential portfolio (off-chain). The
// analyst asks in natural language; the agent answers from the structured records.
import { useState } from "react";

const SUGGESTIONS = [
  "Which claims did we reject, and how much did we withhold?",
  "What's our total approved settlement and the approval rate?",
  "Any retailer with repeated borderline claims?",
];

export function AskPanel() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setAnswer(null);
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) });
      const j = await r.json();
      setAnswer(r.ok ? j.answer : j.error || "query failed");
    } catch {
      setAnswer("query failed");
    }
    setBusy(false);
  }

  return (
    <section className="max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-2 pb-2">
      <div className="rounded-[5px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
        <div className="px-5 md:px-6 py-2.5 hairline-b" style={{ background: "linear-gradient(180deg, var(--paper-2), var(--paper))" }}>
          <span className="mono text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>Ask the portfolio · natural-language audit</span>
        </div>
        <div className="px-5 md:px-6 py-4">
          <div className="flex items-stretch gap-2 rounded-[3px] overflow-hidden" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }}>
            <input
              className="field-bare flex-1 px-3 py-2.5 text-[13px]"
              placeholder="e.g. which claims did we reject and how much did we withhold?"
              value={q}
              disabled={busy}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(q)}
            />
            <button onClick={() => ask(q)} disabled={busy || !q.trim()} className="mono text-[11px] uppercase tracking-[0.14em] font-medium px-4" style={{ background: q.trim() && !busy ? "var(--ink)" : "var(--paper-sunken)", color: q.trim() && !busy ? "white" : "var(--ink-faint)", cursor: q.trim() && !busy ? "pointer" : "not-allowed" }}>
              {busy ? "…" : "Ask"}
            </button>
          </div>
          {!answer && !busy && (
            <div className="flex flex-wrap gap-2 mt-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => { setQ(s); ask(s); }} className="text-[11px] px-2 py-1 rounded-[3px]" style={{ color: "var(--ink-mute)", background: "var(--paper-2)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>{s}</button>
              ))}
            </div>
          )}
          {answer && (
            <div className="mt-3 text-[13px] leading-snug whitespace-pre-wrap" style={{ color: "var(--ink)" }}>{answer}</div>
          )}
        </div>
      </div>
    </section>
  );
}
