import { describe, it, expect } from "vitest";
import { computeSettlement } from "../lib/plugins/tpp-evaluator/settlement";

describe("computeSettlement", () => {
  it("approve → 100% of the contract maximum", () => {
    const r = computeSettlement({
      decision: "approve",
      recommended_credit_pct: 0,
      max_settlement_hbar: 25,
    });
    expect(r.amount_hbar).toBe(25);
    expect(r.partial_credit_pct).toBe(100);
  });

  it("partial_credit → recommended % of the maximum", () => {
    const r = computeSettlement({
      decision: "partial_credit",
      recommended_credit_pct: 60,
      max_settlement_hbar: 25,
    });
    expect(r.amount_hbar).toBeCloseTo(15);
    expect(r.partial_credit_pct).toBe(60);
  });

  it("reject / request_more_evidence / escalate_human → 0", () => {
    for (const decision of [
      "reject",
      "request_more_evidence",
      "escalate_human",
    ] as const) {
      const r = computeSettlement({
        decision,
        recommended_credit_pct: 99,
        max_settlement_hbar: 25,
      });
      expect(r.amount_hbar).toBe(0);
      expect(r.partial_credit_pct).toBe(0);
    }
  });

  it("clamps a >100% recommendation to the contract maximum", () => {
    const r = computeSettlement({
      decision: "partial_credit",
      recommended_credit_pct: 150,
      max_settlement_hbar: 25,
    });
    expect(r.amount_hbar).toBe(25);
  });

  it("no-drain: a huge contract maximum cannot exceed the global hard cap", () => {
    const r = computeSettlement({
      decision: "approve",
      recommended_credit_pct: 100,
      max_settlement_hbar: 100_000,
    });
    expect(r.amount_hbar).toBe(50); // SETTLEMENT_HARD_CAP_HBAR default
  });
});
