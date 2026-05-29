import { describe, it, expect } from "vitest";
import { evaluateSafetyGate } from "../lib/plugins/tpp-evaluator/safety-gate";

// The safety gate is defense-in-depth: it can only WITHHOLD (force escalate_human),
// never approve or raise a payout. These tests pin that contract.
describe("evaluateSafetyGate", () => {
  const confident = { decision: "approve", confidence: 0.9, reviewer: { recommended_action: "accept" as const, concern: "none" } };

  it("passes a confident, reviewer-accepted final decision through untouched (demo cases stay inert)", () => {
    const g = evaluateSafetyGate({ ...confident, floor: 0.5 });
    expect(g.gated).toBe(false);
    expect(g.effective_decision).toBe("approve");
    expect(g.reasons).toHaveLength(0);
  });

  it("escalates a final decision when the independent reviewer recommends escalation", () => {
    const g = evaluateSafetyGate({ decision: "approve", confidence: 0.9, reviewer: { recommended_action: "escalate", concern: "header not visible" }, floor: 0.5 });
    expect(g.gated).toBe(true);
    expect(g.effective_decision).toBe("escalate_human");
    expect(g.model_decision).toBe("approve");
    expect(g.reasons.join(" ")).toMatch(/reviewer/i);
  });

  it("escalates a final decision below the confidence floor", () => {
    const g = evaluateSafetyGate({ decision: "reject", confidence: 0.3, reviewer: { recommended_action: "accept", concern: "none" }, floor: 0.5 });
    expect(g.gated).toBe(true);
    expect(g.effective_decision).toBe("escalate_human");
  });

  it("never touches request_more_evidence — it is already a safe holding state (protects negotiation)", () => {
    const g = evaluateSafetyGate({ decision: "request_more_evidence", confidence: 0.2, reviewer: { recommended_action: "escalate", concern: "x" }, floor: 0.5 });
    expect(g.gated).toBe(false);
    expect(g.effective_decision).toBe("request_more_evidence");
  });

  it("does not re-flag a decision the model already escalated", () => {
    const g = evaluateSafetyGate({ decision: "escalate_human", confidence: 0.1, reviewer: { recommended_action: "escalate", concern: "x" }, floor: 0.5 });
    expect(g.gated).toBe(false);
    expect(g.effective_decision).toBe("escalate_human");
  });
});
