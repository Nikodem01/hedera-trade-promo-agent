import type { ReviewerAssessmentType } from "./schemas";

/** Conservative confidence floor below which a FINAL decision is held for a human.
 * Tunable so a curated demo set that legitimately sits near the boundary can be
 * accommodated without weakening the control in production. */
export const CONFIDENCE_FLOOR = Number(process.env.CONFIDENCE_FLOOR ?? 0.5);

/** The decisions that either move money or finally deny a claim. request_more_evidence
 * and escalate_human are already safe holding states — gating them would only defeat
 * the negotiation loop and the human-review path, so they pass through untouched. */
const FINAL_DECISIONS = new Set(["approve", "partial_credit", "reject"]);

export type SafetyGate = {
  gated: boolean;
  effective_decision: string;
  model_decision: string;
  reasons: string[];
  floor: number;
};

/** Deterministic, code-side reliability control applied AFTER the model and the
 * independent reviewer, BEFORE any settlement. It makes the reviewer LOAD-BEARING
 * rather than advisory: if the reviewer recommends escalation, or confidence is below
 * the floor, a final decision is forced to escalate_human (compute_settlement then pays
 * 0 for it). Defense-in-depth — it can only WITHHOLD, never approve or move funds. */
export function evaluateSafetyGate(input: {
  decision: string;
  confidence: number;
  reviewer?: Pick<ReviewerAssessmentType, "recommended_action" | "concern">;
  floor?: number;
}): SafetyGate {
  const floor = input.floor ?? CONFIDENCE_FLOOR;
  const reasons: string[] = [];
  if (input.reviewer?.recommended_action === "escalate") {
    reasons.push(`independent reviewer recommended escalation: ${input.reviewer.concern || "material concern"}`);
  }
  if (input.confidence < floor) {
    reasons.push(`confidence ${input.confidence.toFixed(2)} below floor ${floor.toFixed(2)}`);
  }
  const gated = reasons.length > 0 && FINAL_DECISIONS.has(input.decision);
  return {
    gated,
    effective_decision: gated ? "escalate_human" : input.decision,
    model_decision: input.decision,
    reasons,
    floor,
  };
}
