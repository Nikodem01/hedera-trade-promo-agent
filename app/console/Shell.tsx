"use client";
// The enterprise app shell: a workspace nav over the existing audit-grade design system.
// Adjudication is the centerpiece (live agent when unlocked; deterministic scripted demo
// for the public). Trust Center, Model Risk, and Settlement & Fund surface the depth.
//
// Public vs operator: /api/config says whether this is a public deployment. In public
// mode anonymous visitors get the scripted demo + read-only views; entering the operator
// token sets the op_token cookie (sent with requests → server-side guard authorizes) and
// unlocks the live agent + all on-chain actions for the session.
import { useCallback, useEffect, useState } from "react";
import { Header } from "@/app/console/components";
import AdjudicationLive, { type Scenario } from "@/app/components/Console";
import GuidedTour from "@/app/console/GuidedTour";
import { TrustCenter } from "./TrustCenter";
import { SettlementFund } from "./SettlementFund";
import { ModelRisk } from "./ModelRisk";
import { WorkspaceIntro } from "./workspace-ui";

type Workspace = "adjudication" | "trust" | "modelrisk" | "settlement";
const TABS: { id: Workspace; label: string }[] = [
  { id: "adjudication", label: "Adjudication" },
  { id: "trust", label: "Trust Center" },
  { id: "modelrisk", label: "Model Risk" },
  { id: "settlement", label: "Settlement & Fund" },
];

export function Shell({ scenarios, initialPublicReadonly = false }: { scenarios: Scenario[]; initialPublicReadonly?: boolean }) {
  const [ws, setWs] = useState<Workspace>("adjudication");
  // Seeded from the server so the public deploy renders the tour on first paint;
  // the client /api/config fetch below just confirms it (and lets an unlocked
  // operator session that set the cookie stay in operator mode).
  const [mode, setMode] = useState<"public" | "operator">(initialPublicReadonly ? "public" : "operator");
  const [publicReadonly, setPublicReadonly] = useState(initialPublicReadonly);
  const [refreshKey, setRefreshKey] = useState(0);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => {
        setPublicReadonly(!!c.publicReadonly);
        // Only force public when read-only; never downgrade an operator who unlocked.
        if (c.publicReadonly) setMode((m) => (m === "operator" ? m : "public"));
      })
      .catch(() => {});
  }, []);

  const onRunComplete = useCallback(() => setRefreshKey((k) => k + 1), []);
  const canAct = mode === "operator";

  function unlock() {
    const v = token.trim();
    if (!v) return;
    const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `op_token=${encodeURIComponent(v)}; path=/; SameSite=Strict; Max-Age=43200${secure}`;
    setMode("operator");
    setUnlockOpen(false);
    setToken("");
  }
  function lock() {
    document.cookie = "op_token=; path=/; Max-Age=0";
    setMode("public");
    setWs("adjudication");
  }

  // Public read-only: the guided tour is the WHOLE surface — a calm, self-explaining
  // walkthrough, no workspace tabs to get lost in. The "Public demo · read-only" badge
  // and the "Operator access" unlock stay, so a buyer can step into the live console.
  const publicTour = mode === "public";

  return (
    <>
      <Header />
      {/* In the public tour the guided RunModeBar is the sticky global control, so this
          nav stays in normal flow; operator mode keeps its sticky workspace tabs. */}
      <nav className={"hairline-b" + (publicTour ? "" : " sticky top-0 z-20")} style={{ background: "var(--paper-2)" }}>
        <div className="max-w-[1100px] mx-auto px-6 md:px-8 flex items-center gap-1 flex-wrap">
          {!publicTour &&
            TABS.map((t) => {
              const active = ws === t.id;
              return (
                <button key={t.id} onClick={() => setWs(t.id)} className="mono text-[11px] uppercase tracking-[0.12em] px-3 py-3 relative" style={{ color: active ? "var(--ink)" : "var(--ink-faint)", fontWeight: active ? 600 : 500, cursor: "pointer" }}>
                  {t.label}
                  {active && <i className="absolute left-3 right-3 bottom-0 h-[2px]" style={{ background: "var(--emerald)" }} />}
                </button>
              );
            })}
          {publicTour && (
            <span className="mono text-[11px] uppercase tracking-[0.12em] px-3 py-3" style={{ color: "var(--ink)", fontWeight: 600 }}>
              Interactive demo
            </span>
          )}
          {publicReadonly && (
            <div className="ml-auto flex items-center gap-2 py-1.5">
              {mode === "public" ? (
                <span className="mono text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-sm" style={{ color: "var(--blue)", background: "var(--blue-bg)" }}>Cached anchor + live sandbox</span>
              ) : (
                <>
                  <span className="mono text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-sm" style={{ color: "var(--emerald)", background: "var(--emerald-bg)" }}>Operator · live</span>
                  <button onClick={lock} className="mono text-[10px] uppercase tracking-[0.12em] px-2 py-1" style={{ color: "var(--ink-faint)", cursor: "pointer" }}>lock</button>
                </>
              )}
            </div>
          )}
        </div>
        {unlockOpen && mode === "public" && (
          <div className="max-w-[1100px] mx-auto px-6 md:px-8 pb-3 flex items-center gap-2 flex-wrap">
            <input value={token} onChange={(e) => setToken(e.target.value)} type="password" placeholder="operator access token" onKeyDown={(e) => e.key === "Enter" && unlock()} className="field-bare mono text-[12px] px-3 py-2 rounded-[3px] flex-1 max-w-[360px]" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline-2)" }} />
            <button onClick={unlock} className="mono text-[10.5px] uppercase tracking-[0.12em] px-3 py-2 rounded-[3px]" style={{ background: "var(--ink)", color: "white", cursor: "pointer" }}>Unlock live mode</button>
            <span className="mono text-[9.5px]" style={{ color: "var(--ink-faint)" }}>enables the live agent + on-chain actions for this session</span>
          </div>
        )}
      </nav>

      {publicTour ? (
        <GuidedTour embedded />
      ) : (
        <>
          <div hidden={ws !== "adjudication"}>
            <AdjudicationLive scenarios={scenarios} onRunComplete={onRunComplete} />
          </div>
          {ws === "trust" && <TrustCenter refreshKey={refreshKey} canAct={canAct} />}
          {ws === "modelrisk" && (
            <>
              <WorkspaceIntro title="Model Risk" body="Validation, independent review, live monitoring, explainability, and model lineage — the OCC-style evidence for trusting AI to move money." />
              <ModelRisk refreshKey={refreshKey} />
            </>
          )}
          {ws === "settlement" && <SettlementFund refreshKey={refreshKey} canAct={canAct} />}
        </>
      )}
    </>
  );
}
