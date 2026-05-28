"use client";
// Interactive PromoProof console. Drives the adjudication timeline through its
// run states. Today it plays the scenario scripts (demo-ready, with real
// HashScan links); the same prop-driven surfaces accept a live agent stream
// once ANTHROPIC_API_KEY is wired (see lib/agent).
import { useMemo, useState } from "react";
import {
  SCENARIOS,
  buildToolScript,
  type Scenario,
  type ToolCall,
} from "./data";
import {
  Header,
  ClaimPicker,
  TimelineRow,
  ClaimSubmission,
  ToolChipList,
  ReasoningBlock,
  VerdictCard,
  EvidenceRequest,
  PreSettlement,
  SettlementReceipt,
  RejectAuditCard,
  Composer,
  EmptyState,
} from "./components";

type RunState =
  | "empty"
  | "streaming"
  | "verdict"
  | "evidence"
  | "revised_verdict"
  | "pre_settle"
  | "settled"
  | "audit_recorded";

const RUN_STATES: Record<string, RunState[]> = {
  oreo: ["empty", "streaming", "verdict", "pre_settle", "settled"],
  cadbury: ["empty", "streaming", "verdict", "evidence", "revised_verdict", "pre_settle", "settled"],
  ritz: ["empty", "streaming", "verdict", "audit_recorded"],
};

function composerStateOf(runState: RunState): "empty" | "streaming" | "verdict" | "evidence" | "settled" {
  if (runState === "empty") return "empty";
  if (runState === "streaming") return "streaming";
  if (runState === "evidence") return "evidence";
  if (runState === "settled" || runState === "audit_recorded") return "settled";
  return "verdict";
}

export default function Console() {
  const [scenarioId, setScenarioId] = useState<string>("oreo");
  const [runState, setRunState] = useState<RunState>("empty");

  const scenario = SCENARIOS[scenarioId];
  const allowed = RUN_STATES[scenarioId];

  const selectClaim = (id: string) => {
    setScenarioId(id);
    setRunState("streaming");
    setTimeout(() => setRunState("verdict"), 1400);
  };

  const onReset = () => setRunState("empty");
  const onAdvance = () => {
    const idx = allowed.indexOf(runState);
    if (idx >= 0 && idx < allowed.length - 1) setRunState(allowed[idx + 1]);
  };
  const onApproveFromComposer = () => {
    if (runState === "pre_settle") setRunState("settled");
    else if (runState === "verdict" && scenarioId === "oreo") {
      setRunState("pre_settle");
      setTimeout(() => setRunState("settled"), 500);
    } else if (scenarioId === "ritz") setRunState("audit_recorded");
    else setRunState("settled");
  };
  const onSendEvidence = () => {
    setRunState("revised_verdict");
    setTimeout(() => setRunState("pre_settle"), 600);
  };

  return (
    <>
      <Header />
      <ClaimPicker active={runState === "empty" ? null : scenarioId} onSelect={selectClaim} />
      <main className="flex-1 max-w-[1100px] w-full mx-auto px-6 md:px-8 pt-2 pb-10">
        {runState === "empty" ? (
          <EmptyState />
        ) : (
          <Workspace
            scenario={scenario}
            runState={runState}
            onApproveSettle={() => setRunState("settled")}
            onSendEvidence={onSendEvidence}
          />
        )}
      </main>
      <Composer
        working={runState === "streaming"}
        scenario={runState === "empty" ? null : scenario}
        runState={composerStateOf(runState)}
        onApprove={onApproveFromComposer}
        onAdvance={onAdvance}
        onReset={onReset}
      />
    </>
  );
}

function Workspace({
  scenario,
  runState,
  onSendEvidence,
  onApproveSettle,
}: {
  scenario: Scenario;
  runState: RunState;
  onSendEvidence: () => void;
  onApproveSettle: () => void;
}) {
  const phase1 = useMemo(() => buildToolScript(scenario, "initial"), [scenario]);
  const phase2 = useMemo(() => buildToolScript(scenario, "after_evidence"), [scenario]);

  let chipsPhase1: ToolCall[] = [];
  let runningIdxP1: number | null = null;
  if (runState === "streaming") {
    chipsPhase1 = phase1.slice(0, 3);
    runningIdxP1 = 2;
  } else {
    const adjIdx = phase1.findIndex((c) => c.verdict);
    if (["verdict", "evidence", "revised_verdict", "pre_settle"].includes(runState)) {
      chipsPhase1 = phase1.slice(0, adjIdx + 1);
    } else if (["settled", "audit_recorded"].includes(runState)) {
      chipsPhase1 = phase1;
    }
  }

  const showVerdict = ["verdict", "evidence", "revised_verdict", "pre_settle", "settled", "audit_recorded"].includes(runState);
  const showRevisedVerdict = ["revised_verdict", "pre_settle", "settled"].includes(runState) && scenario.id === "cadbury";
  const showEvidence = scenario.id === "cadbury" && ["evidence", "revised_verdict", "pre_settle", "settled"].includes(runState);
  const evidenceReplied = ["revised_verdict", "pre_settle", "settled"].includes(runState);
  const showPhase2Tools = scenario.id === "cadbury" && ["revised_verdict", "pre_settle", "settled"].includes(runState);
  const showPreSettle = runState === "pre_settle";
  const showSettled = runState === "settled";
  const showAuditRecorded = runState === "audit_recorded";
  const settlementAmount = scenario.settlement ? scenario.settlement.amount_hbar : 0;

  let idx = 0;
  return (
    <section className="pt-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <span className="mono text-[10.5px] uppercase tracking-[0.16em] font-medium" style={{ color: "var(--ink-faint)" }}>Run</span>
          <span className="mono text-[12px] font-medium" style={{ color: "var(--ink)" }}>{scenario.claimId}</span>
          <span className="mono text-[10.5px]" style={{ color: "var(--ink-faint)" }}>· started 2026-04-22 14:23:08 UTC</span>
        </div>
        {runState === "streaming" && (
          <div className="flex items-center gap-2 mono text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "var(--emerald)" }}>
            <i className="block w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--emerald)" }} />
            Adjudication in progress
          </div>
        )}
      </div>

      <div className="relative rail">
        <TimelineRow kind="submission" time="14:23:08 · analyst" idx={idx++}>
          <ClaimSubmission scenario={scenario} />
        </TimelineRow>

        <TimelineRow kind="tool" time="14:23:09 · tool calls" idx={idx++}>
          <ToolChipList chips={chipsPhase1} runningIdx={runningIdxP1} />
        </TimelineRow>

        {showVerdict && (
          <TimelineRow kind="reason" time="14:23:11 · reasoning" idx={idx++}>
            <ReasoningBlock>
              {scenario.id === "oreo" && <>Each of the four contracted clauses is observable in the photo and stocked at the contracted volume. No ambiguity; recommending full settlement.</>}
              {scenario.id === "cadbury" && <>Three of four clauses are observable. The fourth conditions payment on the display being live within a date window; the image has no timestamp. I&rsquo;ll request a narrow piece of evidence rather than reject outright.</>}
              {scenario.id === "ritz" && <>R-1 is a threshold condition — without checkout-lane placement, the rest of the clauses cannot rescue the claim. Recording the verdict for audit and paying zero.</>}
            </ReasoningBlock>
          </TimelineRow>
        )}

        {showVerdict && (
          <TimelineRow kind="verdict" time="14:23:13 · finding" idx={idx++}>
            <VerdictCard assessment={showRevisedVerdict ? scenario.revisedAssessment ?? scenario.assessment : scenario.assessment} scenario={scenario} revised={showRevisedVerdict} />
          </TimelineRow>
        )}

        {showEvidence && (
          <TimelineRow kind="evidence" time="14:23:14 · negotiation" idx={idx++}>
            <EvidenceRequest text={scenario.assessment.evidence_requested} replied={evidenceReplied} onSend={onSendEvidence} />
          </TimelineRow>
        )}

        {showPhase2Tools && (
          <TimelineRow kind="tool" time="14:28:12 · post-evidence tools" idx={idx++}>
            <ToolChipList chips={phase2.slice(0, showSettled || showPreSettle ? phase2.length : 2)} />
          </TimelineRow>
        )}

        {showPreSettle && (
          <TimelineRow kind="settle" time="14:31:02 · awaiting approval" idx={idx++}>
            <PreSettlement amount={settlementAmount} scenario={scenario} onApprove={onApproveSettle} />
          </TimelineRow>
        )}

        {showSettled && scenario.settlement && (
          <TimelineRow kind="settle" time="14:31:02 · settled" idx={idx++} last>
            <SettlementReceipt proposal={scenario.settlement} scenario={scenario} partial={scenario.id === "cadbury"} />
          </TimelineRow>
        )}

        {showAuditRecorded && (
          <TimelineRow kind="settle" time="14:23:15 · audit recorded" idx={idx++} last>
            <RejectAuditCard scenario={scenario} />
          </TimelineRow>
        )}
      </div>
    </section>
  );
}
