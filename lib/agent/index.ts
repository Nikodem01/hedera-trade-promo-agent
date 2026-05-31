import { AgentMode } from "@hashgraph/hedera-agent-kit";
import {
  allCorePlugins,
  MINT_FUNGIBLE_TOKEN_TOOL,
  MINT_NON_FUNGIBLE_TOKEN_TOOL,
  TRANSFER_HBAR_TOOL,
} from "@hashgraph/hedera-agent-kit/plugins";
import { HcsAuditTrailHook } from "@hashgraph/hedera-agent-kit/hooks";
import { HederaAIToolkit } from "@hashgraph/hedera-agent-kit-ai-sdk";
import {
  streamText,
  stepCountIs,
  wrapLanguageModel,
  type ModelMessage,
} from "ai";
import { getOperatorClient } from "@/lib/hedera/client";
import { buildSystemPrompt } from "@/lib/agent/prompts";
import { orchestratorModel } from "@/lib/agent/model";
import { tppEvaluatorPlugin } from "@/lib/plugins/tpp-evaluator";

/**
 * The single agent loop. The orchestrator model drives the tool-loop; the Hedera
 * Agent Kit tools execute on-chain in AUTONOMOUS mode. Public ledger payloads stay
 * proof-only: the custom adjudication tool anchors a salted commitment, and the
 * prompt can call core Hedera Agent Kit tools for proof-only HCS/NFT artifacts.
 */
export function runAgent(messages: ModelMessage[]) {
  const client = getOperatorClient();

  const topicId = process.env.HCS_TOPIC_ID;
  // Verbose tool audit logs include tool names/params. Keep them opt-in so the public
  // demo topic remains proof-only by default (commitment hashes + consensus metadata).
  const hooks = topicId && process.env.ENABLE_VERBOSE_HCS_TOOL_AUDIT === "1"
    ? [new HcsAuditTrailHook([TRANSFER_HBAR_TOOL, MINT_FUNGIBLE_TOKEN_TOOL, MINT_NON_FUNGIBLE_TOKEN_TOOL], topicId)]
    : [];

  const toolkit = new HederaAIToolkit({
    client,
    configuration: {
      tools: [],
      plugins: [...allCorePlugins, tppEvaluatorPlugin],
      context: {
        mode: AgentMode.AUTONOMOUS,
        accountId: process.env.HEDERA_ACCOUNT_ID,
        hooks,
      },
    },
  });

  const model = wrapLanguageModel({
    model: orchestratorModel(),
    middleware: toolkit.middleware(),
  });

  return streamText({
    model,
    system: buildSystemPrompt(),
    messages,
    tools: toolkit.getTools(),
    stopWhen: stepCountIs(12),
    maxRetries: 4,
  });
}
