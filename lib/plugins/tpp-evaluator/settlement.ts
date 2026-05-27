import { z } from "zod";
import { BaseTool, type Context } from "@hashgraph/hedera-agent-kit";
import type { Client } from "@hiero-ledger/sdk";
import { decisionEnum, type SettlementProposalType } from "./schemas";

export const COMPUTE_SETTLEMENT = "compute_settlement";

/** Global safety ceiling, independent of any single contract. Even if a contract
 * (or a manipulated assessment) names a larger max, the payout is capped here. */
const HARD_CAP_HBAR = Number(process.env.SETTLEMENT_HARD_CAP_HBAR ?? 50);

const settlementParameters = (_context: Context = {}) =>
  z.object({
    decision: decisionEnum.describe("The adjudicated decision from adjudicate_claim."),
    recommended_credit_pct: z
      .number()
      .min(0)
      .max(100)
      .describe("The recommended credit percentage from adjudicate_claim (used for partial_credit)."),
    max_settlement_hbar: z
      .number()
      .min(0)
      .describe("The contract's maximum settlement amount in HBAR, from adjudicate_claim."),
  });

type SettlementParams = z.infer<ReturnType<typeof settlementParameters>>;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Deterministic settlement rule. The LLM recommends; this enforces. approve -> 100%,
 * partial_credit -> recommended %, everything else -> 0. Capped at the contract
 * maximum and the global hard cap, so the payout can never be inflated. */
export function computeSettlement(params: {
  decision: z.infer<typeof decisionEnum>;
  recommended_credit_pct: number;
  max_settlement_hbar: number;
}): SettlementProposalType {
  const pct =
    params.decision === "approve"
      ? 100
      : params.decision === "partial_credit"
        ? clamp(params.recommended_credit_pct, 0, 100)
        : 0;

  const uncapped = (pct / 100) * params.max_settlement_hbar;
  const amount_hbar = Math.min(uncapped, params.max_settlement_hbar, HARD_CAP_HBAR);

  return {
    amount_hbar,
    partial_credit_pct: pct,
    max_settlement_hbar: params.max_settlement_hbar,
    justification:
      params.decision === "approve"
        ? "Full compliance — 100% of the contracted amount, within caps."
        : params.decision === "partial_credit"
          ? `Partial compliance — ${pct}% credit applied, capped at the contract maximum (${params.max_settlement_hbar} HBAR) and the ${HARD_CAP_HBAR} HBAR safety cap.`
          : "No settlement: the claim was not approved.",
  };
}

export class ComputeSettlementTool extends BaseTool {
  method = COMPUTE_SETTLEMENT;
  name = "Compute Settlement";
  description: string;
  parameters: ReturnType<typeof settlementParameters>;

  constructor(context: Context) {
    super();
    this.description =
      "Deterministically compute the HBAR settlement from an adjudicated decision. approve -> 100%, partial_credit -> the recommended %, all other decisions -> 0. The amount is hard-capped at the contract maximum and a global safety ceiling, so it can never exceed what the contract allows regardless of the recommendation. Call this after adjudicate_claim, before settling on-chain.";
    this.parameters = settlementParameters(context);
  }

  async normalizeParams(params: SettlementParams, _context: Context, _client: Client) {
    return params;
  }

  async coreAction(params: SettlementParams, _context: Context, _client: Client) {
    return computeSettlement(params);
  }

  async shouldSecondaryAction() {
    return false;
  }

  async secondaryAction(_request: unknown, _client: Client, _context: Context): Promise<never> {
    throw new Error(
      "compute_settlement is a deterministic calculation and has no transaction to submit.",
    );
  }
}

const tool = (context: Context): BaseTool => new ComputeSettlementTool(context);
export default tool;
