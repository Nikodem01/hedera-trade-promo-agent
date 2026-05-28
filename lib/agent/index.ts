import { AgentMode } from "@hashgraph/hedera-agent-kit";
import {
  allCorePlugins,
  MINT_FUNGIBLE_TOKEN_TOOL,
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
 * Agent Kit tools execute on-chain in AUTONOMOUS mode. The HcsAuditTrailHook
 * enforces an immutable HCS audit entry for every fund-moving / token-minting
 * tool call, independent of what the model decides to log.
 */
export function runAgent(messages: ModelMessage[]) {
  const client = getOperatorClient();

  const topicId = process.env.HCS_TOPIC_ID;
  // HcsAuditTrailHook is hard-coded to read .transactionId from the tool result,
  // so it only works on transactional tools (transfer/mint). It throws on
  // query-only tools like adjudicate_claim — we log those via an explicit
  // submit_topic_message call from the prompt instead. (Filed as Day-5 feedback.)
  const hooks = topicId
    ? [new HcsAuditTrailHook([TRANSFER_HBAR_TOOL, MINT_FUNGIBLE_TOKEN_TOOL], topicId)]
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
