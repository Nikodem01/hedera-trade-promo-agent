import { describe, it, expect } from "vitest";
import { computeSettlement } from "../lib/plugins/tpp-evaluator/settlement";

/**
 * Adversarial / no-drain proof. The retailer narrative and photo are
 * attacker-controllable; if a manipulated assessment reaches compute_settlement,
 * the deterministic layer must still refuse to over-pay. These assertions hold
 * regardless of what the LLM was steered to recommend.
 */
describe("settlement is injection-proof", () => {
  it("a rejected claim pays zero even with a 100% recommendation and a huge contract max", () => {
    const r = computeSettlement({
      decision: "reject",
      recommended_credit_pct: 100,
      max_settlement_hbar: 1_000_000,
    });
    expect(r.amount_hbar).toBe(0);
  });

  it("an approved claim cannot exceed the global hard cap, however large the 'contract max'", () => {
    const r = computeSettlement({
      decision: "approve",
      recommended_credit_pct: 100,
      max_settlement_hbar: 1_000_000,
    });
    expect(r.amount_hbar).toBe(50); // SETTLEMENT_HARD_CAP_HBAR default
  });

  it("a partial credit above 100% is clamped, never inflating the payout", () => {
    const r = computeSettlement({
      decision: "partial_credit",
      recommended_credit_pct: 999,
      max_settlement_hbar: 10,
    });
    expect(r.amount_hbar).toBe(10);
  });

  it("request_more_evidence / escalate_human never settle", () => {
    for (const decision of ["request_more_evidence", "escalate_human"] as const) {
      expect(
        computeSettlement({ decision, recommended_credit_pct: 100, max_settlement_hbar: 30 })
          .amount_hbar,
      ).toBe(0);
    }
  });
});
