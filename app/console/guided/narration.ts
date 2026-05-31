// The guided-tour narration engine. PURE (no JSX, no imports of UI or data) so the
// copy is unit-testable and decoupled — it maps a workflow PHASE + the real decision
// to plain-language copy, and works on ANY claim (the featured capture today, a fresh
// contract + photo tomorrow). Copy is workflow-first by design: lead with what the
// agent did and why it matters to the business; the mechanism is a short aside, never
// a lecture. (Founder steer: "a real enterprise workflow," not "a course on Merkle
// trees.")
import type { ComplianceAssessmentType } from "@/lib/plugins/tpp-evaluator/schemas";

export type Phase =
  | "frame"
  | "inputs"
  | "agent"
  | "verdict"
  | "negotiate"
  | "commit"
  | "verify"
  | "settle"
  | "recap";

type Decision = ComplianceAssessmentType["decision"];

/** A short, optional aside rendered as a calm callout under the artifact. One idea. */
export type Annotation = { tag: string; body: string };

export type SceneCopy = {
  /** Short label for the journey rail ("you are here"). */
  stepLabel: string;
  heading: string;
  /** One or two plain sentences: what's happening + why it matters. */
  plain: string;
  annotation?: Annotation;
};

export type NarrateCtx = {
  decision: Decision;
  /** A settlement exists (approve / partial_credit) vs a zero-pay (reject / escalate). */
  settled: boolean;
  /** The agent asked for more evidence and re-judged — insert the negotiation beat. */
  hasNegotiation: boolean;
};

/** The ordered scene list for a claim. The list is stable; only the settle/verdict
 * CONTENT changes by outcome, so the journey reads the same shape every time. The
 * negotiation beat is inserted only when the agent genuinely asked for more evidence. */
export function buildPhases(ctx: { hasNegotiation: boolean }): Phase[] {
  return [
    "frame",
    "inputs",
    "agent",
    "verdict",
    ...(ctx.hasNegotiation ? (["negotiate"] as Phase[]) : []),
    "commit",
    "verify",
    "settle",
    "recap",
  ];
}

export function narrate(phase: Phase, ctx: NarrateCtx): SceneCopy {
  switch (phase) {
    case "frame":
      return {
        stepLabel: "The problem",
        heading: "Brands spend ~$30B a year on store promotions. Proving they happened is done by hand.",
        plain:
          "A brand pays a retailer to run a promotion — an end-cap, a display tower. Before any money changes hands, someone has to confirm the store actually did it, against a contract written just for that deal. Today that's manual: settlement drags 60–120 days and disputes resurface years later. PromoProof is an AI agent that does it in seconds — and makes every decision provable.",
      };

    case "inputs":
      return {
        stepLabel: "The claim",
        heading: "One claim: a contract, a proof photo, and the retailer's word.",
        plain:
          "Here's what lands on the desk. A bespoke promotion contract in plain legal prose, an in-store photo as proof, and the retailer's short narrative claiming they complied. Every retailer's contract is different — which is exactly why this is slow and manual today.",
      };

    case "agent":
      return {
        stepLabel: "It reads & judges",
        heading: "The agent reads the contract, then judges the photo against it.",
        plain:
          "Watch it work. It pulls the contract and the photo, then reasons in phases — observe the photo, pull out each contract requirement, reconcile them, decide — and a second, independent model double-checks the verdict before anything can move.",
        annotation: {
          tag: "Hedera Agent Kit v4 plugin",
          body: "adjudicate_claim, compute_settlement and propose_settlement are custom tools this agent exposes through the Hedera Agent Kit — the plugin doing the work you're watching.",
        },
      };

    case "verdict":
      return {
        stepLabel: "The verdict",
        heading: "Judgement, not OCR — every finding cites a clause and points to the photo.",
        plain:
          "This is the part that's hard to fake. For each requirement, the agent gives a met / partial / unmet call, cites the exact contract clause it's judging against, and shows you where in the photo it saw the evidence — hover any finding to light up its spot. Its confidence and the second model's agreement sit right alongside.",
      };

    case "negotiate":
      return {
        stepLabel: "It negotiates",
        heading: "When the proof falls short, it asks for exactly what's missing — it doesn't just reject.",
        plain:
          "One clause couldn't be settled from the photo alone. Instead of guessing or denying, the agent asked the retailer for the single piece of evidence that would resolve it. They supplied it, and the agent re-judged — updating only the clause that changed. That's a negotiation, not a rubber stamp.",
      };

    case "commit":
      return {
        stepLabel: "Recorded, privately",
        heading: "Why this lives on Hedera, and not just in a database.",
        plain:
          "The instant it decides, the verdict is sealed. But look at what's public versus private. Everything sensitive — the contract, the photo, the amount, the reasoning — stays encrypted on our side. The only thing written to Hedera is a one-way fingerprint of the decision and a timestamp.",
        annotation: {
          tag: "On-chain vs your database",
          body: "A database row can be quietly edited or backdated by whoever owns it. This record can't — not by us, not by anyone. That's the difference Hedera makes.",
        },
      };

    case "verify":
      return {
        stepLabel: "Provable to anyone",
        heading: "Prove any single fact against that public record — and reveal nothing else.",
        plain:
          "Here's the payoff. Years later, in a dispute, you can take one line of the private file — the decision, or the amount — and prove it's genuine and unaltered against the fingerprint on Hedera. The contract and the photo never have to leave your vault. Sealed in public, provable on demand, confidential always.",
      };

    case "settle":
      if (ctx.settled) {
        return {
          stepLabel: "Settled safely",
          heading: "The money moves only when both sides sign — the agent can't touch it.",
          plain:
            "Now payment. The agent proposes the transfer, but it holds no key that can release funds. The money moves only once the brand and the retailer both sign on-chain — enforced by Hedera itself, not by our code. On execution, an attestation NFT is minted as the receipt.",
        };
      }
      return {
        stepLabel: "On the record",
        heading: "Rejected — no money moves, but the decision is still provable.",
        plain:
          "This claim missed a threshold requirement, so nothing is paid. Even so, the rejection is sealed on Hedera exactly like an approval would be — so a 'no' is just as auditable as a 'yes', and just as hard to dispute later.",
      };

    case "recap":
      return {
        stepLabel: "End to end",
        heading: "A real enterprise workflow, start to finish.",
        plain:
          "The agent read a bespoke contract, judged a real photo against it, negotiated for the evidence it needed, and settled value on-chain — every step provable, nothing confidential exposed. This run is live on Hedera testnet; the records below are real.",
      };
  }
}
