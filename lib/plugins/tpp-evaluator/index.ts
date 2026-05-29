import type { Context, Plugin } from "@hashgraph/hedera-agent-kit";
import adjudicateTool, { ADJUDICATE_CLAIM } from "./adjudicate";
import settlementTool, { COMPUTE_SETTLEMENT } from "./settlement";
import proposeSettlementTool, { PROPOSE_SETTLEMENT } from "./propose-settlement";

/**
 * tpp-evaluator — the load-bearing adjudication plugin.
 *
 * Two tools: `adjudicate_claim` (Opus 4.7 multimodal judgement) and
 * `compute_settlement` (deterministic, capped enforcement). Everything on-chain
 * is handled by the kit's built-in HCS/HTS/HBAR tools.
 */
export const tppEvaluatorPlugin: Plugin = {
  name: "tpp-evaluator",
  version: "1.0.0",
  description:
    "Trade-promotion proof-of-performance adjudication: multimodal claim evaluation with clause-cited reasoning, plus deterministic capped settlement computation.",
  tools: (context: Context) => [adjudicateTool(context), settlementTool(context), proposeSettlementTool(context)],
};

export const tppEvaluatorToolNames = {
  ADJUDICATE_CLAIM,
  COMPUTE_SETTLEMENT,
  PROPOSE_SETTLEMENT,
} as const;

export default { tppEvaluatorPlugin, tppEvaluatorToolNames };
