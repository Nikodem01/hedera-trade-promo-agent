"use client";
// The guided public tour — "The Life of a Claim". One scene at a time over the frozen
// featured run, narrated workflow-first. This is the public read-only front door: it
// proves the agent's judgement and negotiation FIRST, then reveals the auditability,
// settlement, and Hedera mechanics as the payoff that makes the workflow trustworthy.
// Reuses the real verdict/diff/evidence components so the artifacts are the genuine ones.
import { useState } from "react";
import { FEATURED, featuredToolScript, type FeaturedClaim } from "./data";
import {
  Header,
  ToolChipList,
  VerdictCard,
  RevisionDiff,
  EvidenceRequest,
  RejectAuditCard,
  type CardScenario,
} from "./components";
import { buildPhases, narrate, type Phase, type NarrateCtx } from "./guided/narration";
import { JourneyRail, SceneFrame, TourFooter } from "./guided/GuidedScene";
import {
  FlowDiagram,
  ClaimInputs,
  OnChainOffChainSplit,
  VerifyReplay,
  SettleReplay,
  Recap,
} from "./guided/artifacts";

const SETTLING = new Set(["approve", "partial_credit"]);

export default function GuidedTour({ embedded }: { embedded?: boolean } = {}) {
  const claim = FEATURED;
  const finalAssessment = claim.revisedAssessment ?? claim.assessment;
  const hasNegotiation = !!claim.revisedAssessment;
  const settled = !!claim.settlement && SETTLING.has(finalAssessment.decision);

  const phases = buildPhases({ hasNegotiation });
  const [idx, setIdx] = useState(0);
  const phase = phases[idx];

  const ctx: NarrateCtx = { decision: finalAssessment.decision, settled, hasNegotiation };
  const labels = phases.map((p) => narrate(p, ctx).stepLabel);
  const copy = narrate(phase, ctx);

  const back = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(phases.length - 1, i + 1));
  const restart = () => setIdx(0);

  return (
    <>
      {!embedded && <Header />}
      <JourneyRail labels={labels} current={idx} />
      <main className="flex-1 w-full">
        {/* key on phase so each scene reveals smoothly */}
        <SceneFrame key={phase} copy={copy} stepIndex={idx} stepCount={phases.length}>
          <SceneArtifact phase={phase} claim={claim} />
        </SceneFrame>
      </main>
      <TourFooter stepIndex={idx} stepCount={phases.length} onBack={back} onContinue={next} onRestart={restart} />
    </>
  );
}

function SceneArtifact({ phase, claim }: { phase: Phase; claim: FeaturedClaim }) {
  const card: CardScenario = {
    retailer: claim.retailer,
    promotion: claim.promotion,
    claimId: claim.claimId,
    contractId: claim.contractId,
    maxHbar: claim.assessment.max_settlement_hbar,
  };
  const img = `/proofs/${claim.imageRef}`;

  switch (phase) {
    case "frame":
      return <FlowDiagram />;

    case "inputs":
      return <ClaimInputs claim={claim} />;

    case "agent":
      return <AgentTools />;

    case "verdict":
      return (
        <VerdictCard
          assessment={claim.assessment}
          scenario={card}
          imageSrc={img}
          citations={claim.citations}
          review={claim.review}
          unit="pUSDC"
        />
      );

    case "negotiate":
      return (
        <div className="flex flex-col gap-4">
          <EvidenceRequest text={claim.assessment.evidence_requested} replied onSend={() => {}} />
          {claim.revisedAssessment && (
            <>
              <RevisionDiff prior={claim.assessment} current={claim.revisedAssessment} />
              <VerdictCard
                assessment={claim.revisedAssessment}
                scenario={card}
                imageSrc={img}
                citations={claim.citations}
                review={claim.review}
                revised
                unit="pUSDC"
              />
            </>
          )}
        </div>
      );

    case "commit":
      return <OnChainOffChainSplit claim={claim} />;

    case "verify":
      return <VerifyReplay claim={claim} />;

    case "settle":
      return claim.settlement ? <SettleReplay claim={claim} /> : <RejectAuditCard scenario={card} />;

    case "recap":
      return <Recap claim={claim} />;
  }
}

/** The agent's plugin tools in action — the streaming tool calls, with the three custom
 * tools flagged as the Hedera Agent Kit plugin. */
function AgentTools() {
  return (
    <div className="rounded-[5px] p-4 md:p-5" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
      <div className="mono text-[10px] uppercase tracking-[0.16em] font-medium mb-3" style={{ color: "var(--ink-faint)" }}>
        Agent · tool calls
      </div>
      <ToolChipList chips={featuredToolScript("initial")} />
      <div className="mt-3 pt-3 hairline-t flex items-center gap-2 flex-wrap">
        <span className="mono text-[9.5px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-sm" style={{ color: "var(--emerald)", background: "var(--emerald-bg)", boxShadow: "inset 0 0 0 1px rgba(11,93,59,0.18)" }}>
          plugin tool
        </span>
        <span className="mono text-[11px]" style={{ color: "var(--ink-mute)" }}>
          adjudicate_claim · compute_settlement · propose_settlement — exposed through the Hedera Agent Kit v4 plugin
        </span>
      </div>
    </div>
  );
}
