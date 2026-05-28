// Small reusable bits: decision/status chips, badges, meters, seals, photo.
import type { ComplianceAssessmentType } from "@/lib/plugins/tpp-evaluator/schemas";

type Decision = ComplianceAssessmentType["decision"];
type CriterionStatus = ComplianceAssessmentType["criteria"][number]["status"];
type ColorKey = "emerald" | "amber" | "red" | "blue" | "violet" | "slate";

export const DECISION_META: Record<Decision, { label: string; short: string; color: ColorKey }> = {
  approve: { label: "APPROVE", short: "Approve", color: "emerald" },
  partial_credit: { label: "PARTIAL CREDIT", short: "Partial", color: "amber" },
  reject: { label: "REJECT", short: "Reject", color: "red" },
  request_more_evidence: { label: "REQUEST MORE EVIDENCE", short: "Needs evidence", color: "blue" },
  escalate_human: { label: "ESCALATE TO HUMAN", short: "Escalate", color: "violet" },
};

export const STATUS_META: Record<CriterionStatus, { label: string; color: ColorKey }> = {
  met: { label: "Met", color: "emerald" },
  partial: { label: "Partial", color: "amber" },
  unmet: { label: "Unmet", color: "red" },
  indeterminate: { label: "Indeterminate", color: "slate" },
};

export const COLORS: Record<ColorKey, { fg: string; bg: string; bg2: string }> = {
  emerald: { fg: "var(--emerald)", bg: "var(--emerald-bg)", bg2: "var(--emerald-bg-2)" },
  amber: { fg: "var(--amber)", bg: "var(--amber-bg)", bg2: "#F6E1B7" },
  red: { fg: "var(--red)", bg: "var(--red-bg)", bg2: "#F3CFCF" },
  blue: { fg: "var(--blue)", bg: "var(--blue-bg)", bg2: "#CFDAF6" },
  violet: { fg: "var(--violet)", bg: "var(--violet-bg)", bg2: "#DDCDF5" },
  slate: { fg: "var(--slate)", bg: "var(--slate-bg)", bg2: "#D8DCE1" },
};

export function DecisionBadge({ decision, size = "lg" }: { decision: Decision; size?: "lg" | "sm" }) {
  const meta = DECISION_META[decision];
  const c = COLORS[meta.color];
  if (size === "sm") {
    return (
      <span
        className="mono inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10.5px] font-medium uppercase tracking-[0.06em]"
        style={{ color: c.fg, background: c.bg, boxShadow: `inset 0 0 0 1px ${c.fg}22` }}
      >
        <i className="block w-1.5 h-1.5 rounded-full" style={{ background: c.fg }} />
        {meta.short}
      </span>
    );
  }
  return (
    <div className="inline-flex items-stretch select-none" style={{ filter: "drop-shadow(0 1px 0 rgba(22,22,26,0.04))" }}>
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-l-[3px]" style={{ background: c.fg, color: "white" }}>
        <i className="block w-2 h-2 rounded-full" style={{ background: "white", opacity: 0.95 }} />
        <span className="mono text-[12px] font-semibold uppercase tracking-[0.14em]">{meta.label}</span>
      </div>
      <div className="px-3 py-2.5 mono text-[10.5px] uppercase tracking-[0.12em] rounded-r-[3px] flex items-center" style={{ background: c.bg, color: c.fg }}>
        Finding
      </div>
    </div>
  );
}

export function StatusChip({ status }: { status: CriterionStatus }) {
  const meta = STATUS_META[status];
  const c = COLORS[meta.color];
  return (
    <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm text-[11px] font-medium leading-none" style={{ color: c.fg, background: c.bg }}>
      <i className="block w-1.5 h-1.5 rounded-full" style={{ background: c.fg }} />
      {meta.label}
    </span>
  );
}

export function ClauseChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="mono inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] font-medium" style={{ background: "var(--paper-2)", color: "var(--ink)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
      {children}
    </span>
  );
}

export function ConfidenceMeter({ value, color = "emerald" }: { value: number; color?: ColorKey }) {
  const c = COLORS[color];
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.14em] mono font-medium" style={{ color: "var(--ink-faint)" }}>Confidence</span>
        <span className="mono text-[13px] font-semibold tabular-nums" style={{ color: c.fg }}>
          {value.toFixed(2)}<span className="text-[10px]" style={{ color: "var(--ink-faint)" }}> / 1.00</span>
        </span>
      </div>
      <div className="relative h-[8px] w-full rounded-[2px] overflow-hidden" style={{ background: "var(--paper-sunken)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
        {[0.25, 0.5, 0.75].map((t) => (
          <i key={t} className="absolute top-0 bottom-0 w-px" style={{ left: `${t * 100}%`, background: "var(--keyline-2)" }} />
        ))}
        <div className="absolute inset-y-0 left-0 anim-bar" style={{ width: `${pct}%`, background: c.fg }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, unit, mono = false, accent = false }: { label: string; value: string; unit?: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.14em] mono font-medium" style={{ color: "var(--ink-faint)" }}>{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={(mono ? "mono " : "") + "text-[22px] font-semibold tabular-nums leading-none"} style={{ color: accent ? "var(--emerald)" : "var(--ink)" }}>
          {value}
        </span>
        {unit && <span className="mono text-[11px] font-medium" style={{ color: "var(--ink-faint)" }}>{unit}</span>}
      </div>
    </div>
  );
}

export function TestnetPill() {
  return (
    <span className="inline-flex items-center gap-1.5 mono text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-sm" style={{ color: "var(--emerald)", background: "var(--emerald-bg)", boxShadow: "inset 0 0 0 1px rgba(11,93,59,0.22)" }}>
      <i className="block w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--emerald)" }} />
      Testnet · Live
    </span>
  );
}

export function ProofPhoto({ caption, tone = "warm", aspect = "4/5", small = false }: { caption: string; tone?: "warm" | "rose" | "slate"; aspect?: string; small?: boolean }) {
  const TONES = {
    warm: { a: "#E8DDCB", b: "#D9C8AF", txt: "#4A3A21" },
    rose: { a: "#E9D7D7", b: "#D9B9B9", txt: "#5C2E2E" },
    slate: { a: "#D9DEE5", b: "#BFC7D3", txt: "#293347" },
  };
  const T = TONES[tone] || TONES.warm;
  const stripe = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14'><path d='M-2 16 L16 -2 M-2 22 L22 -2 M-2 28 L28 -2' stroke='${T.b}' stroke-width='1.5' fill='none' opacity='0.5'/></svg>`,
  );
  return (
    <div
      className="relative overflow-hidden rounded-[3px] anim-reveal"
      style={{ aspectRatio: aspect, background: `${T.a} url("data:image/svg+xml;utf8,${stripe}")`, boxShadow: "inset 0 0 0 1px var(--keyline-2), inset 0 0 0 6px " + T.a }}
    >
      {["top-2 left-2 border-t border-l", "top-2 right-2 border-t border-r", "bottom-2 left-2 border-b border-l", "bottom-2 right-2 border-b border-r"].map((cls, i) => (
        <i key={i} className={`absolute ${cls} w-2.5 h-2.5`} style={{ borderColor: T.txt, opacity: 0.55 }} />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="mono text-[10.5px] uppercase tracking-[0.14em] px-2 py-1 rounded-sm text-center" style={{ color: T.txt, background: "rgba(255,253,247,0.7)", backdropFilter: "blur(2px)", boxShadow: "inset 0 0 0 1px " + T.txt + "33" }}>
          {small ? "proof photo" : caption}
        </span>
      </div>
    </div>
  );
}

export function ToolDot({ state }: { state: "running" | "done" | "error" | "queued" }) {
  if (state === "running") return <i className="block w-2 h-2 rounded-full pulse-dot" style={{ background: "var(--emerald)" }} />;
  if (state === "done") return <i className="block w-2 h-2 rounded-full" style={{ background: "var(--ink-mute)" }} />;
  if (state === "error") return <i className="block w-2 h-2 rounded-full" style={{ background: "var(--red)" }} />;
  return <i className="block w-2 h-2 rounded-full" style={{ background: "var(--keyline-2)" }} />;
}

export function ExternalIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4 2H2v8h8V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M6 2h4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10 2 5.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function DocSeal() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <circle cx="17" cy="17" r="15.5" fill="none" stroke="var(--emerald)" strokeWidth="1" />
      <circle cx="17" cy="17" r="12" fill="none" stroke="var(--emerald)" strokeWidth="0.5" opacity="0.5" />
      <path d="M11 17 L15.5 21 L24 12.5" stroke="var(--emerald)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WordmarkGlyph() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect x="1.5" y="1.5" width="25" height="25" rx="3" fill="var(--emerald)" />
      <rect x="1.5" y="1.5" width="25" height="25" rx="3" fill="none" stroke="rgba(0,0,0,0.15)" />
      <path d="M8 9 H16 a3 3 0 0 1 0 6 H10 v5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="square" />
      <circle cx="20" cy="20" r="2.2" fill="white" />
    </svg>
  );
}

export function truncMid(s: string, head = 10, tail = 6) {
  if (!s) return "";
  if (s.length <= head + tail + 1) return s;
  return s.slice(0, head) + "…" + s.slice(-tail);
}
