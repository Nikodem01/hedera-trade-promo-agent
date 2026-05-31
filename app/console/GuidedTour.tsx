"use client";
// The guided public tour — "The Life of a Claim". A single, continuous vertical flow (no
// pagination): a global run-mode switch at the top drives the whole timeline. "Verified
// run" stacks every scene of the frozen featured run top-to-bottom; "Live testnet sandbox"
// swaps the timeline for a streaming column that calls the real LLM + Hedera and appends
// each Agent Kit call as it happens. Reuses the real verdict/diff/evidence components so
// the artifacts are the genuine ones.
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
import { RunModeBar, type RunMode, LegalDisclaimer, SceneFrame } from "./guided/GuidedScene";
import {
  FlowDiagram,
  ClaimInputs,
  OnChainOffChainSplit,
  VerifyReplay,
  SettleReplay,
  Recap,
  LiveColumn,
} from "./guided/artifacts";

const SETTLING = new Set(["approve", "partial_credit"]);

export default function GuidedTour({ embedded }: { embedded?: boolean } = {}) {
  const claim = FEATURED;
  const [mode, setMode] = useState<RunMode>("verified");

  const finalAssessment = claim.revisedAssessment ?? claim.assessment;
  const hasNegotiation = !!claim.revisedAssessment;
  const settled = !!claim.settlement && SETTLING.has(finalAssessment.decision);
  const phases = buildPhases({ hasNegotiation });
  const ctx: NarrateCtx = { decision: finalAssessment.decision, settled, hasNegotiation };

  return (
    <>
      {!embedded && <Header />}
      <RunModeBar mode={mode} onChange={setMode} />
      <main className="flex-1 w-full">
        {mode === "verified" ? (
          <div className="flex flex-col">
            {phases.map((phase, i) => (
              <SceneFrame key={phase} copy={narrate(phase, ctx)} stepIndex={i} stepCount={phases.length}>
                <SceneArtifact phase={phase} claim={claim} />
              </SceneFrame>
            ))}
          </div>
        ) : (
          <LiveColumn />
        )}
      </main>
      <LegalDisclaimer />
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
      return <CachedAnchorTools />;

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

/** The cached-anchor lane: the agent's plugin tools replayed from the captured run, with
 * the three custom tools flagged as the Hedera Agent Kit plugin. The live lane now lives
 * in its own global mode (the "Live testnet sandbox" view), not a sibling card. */
function CachedAnchorTools() {
  return (
    <div className="rounded-[5px] p-4 md:p-5" style={{ background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--keyline)" }}>
      <div className="mono text-[10px] uppercase tracking-[0.16em] font-medium mb-3" style={{ color: "var(--ink-faint)" }}>
        Cached anchor
      </div>
      <div className="text-[13px] font-semibold mb-2">A real run replayed from captured Hedera artifacts</div>
      <ToolChipList chips={featuredToolScript("initial")} />
      <div className="mt-3 pt-3 hairline-t">
        <div className="mono text-[9.5px] uppercase tracking-[0.14em] mb-2" style={{ color: "var(--ink-faint)" }}>After evidence</div>
        <ToolChipList chips={featuredToolScript("after_evidence")} />
      </div>
      <div className="mt-3 pt-3 hairline-t flex items-center gap-2 flex-wrap">
        <span className="mono text-[9.5px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-sm" style={{ color: "var(--emerald)", background: "var(--emerald-bg)", boxShadow: "inset 0 0 0 1px rgba(11,93,59,0.18)" }}>
          cached proof
        </span>
        <span className="mono text-[11px]" style={{ color: "var(--ink-mute)" }}>
          frozen from a successful run; switch to the Live testnet sandbox above to watch fresh Agent Kit calls
        </span>
      </div>
    </div>
  );
}
