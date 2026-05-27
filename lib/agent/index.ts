import { AgentMode } from "@hashgraph/hedera-agent-kit";
import { allCorePlugins } from "@hashgraph/hedera-agent-kit/plugins";
import { HederaAIToolkit } from "@hashgraph/hedera-agent-kit-ai-sdk";
import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  stepCountIs,
  wrapLanguageModel,
  type ModelMessage,
} from "ai";
import { getOperatorClient } from "@/lib/hedera/client";
import { SYSTEM_PROMPT } from "@/lib/agent/prompts";
import { tppEvaluatorPlugin } from "@/lib/plugins/tpp-evaluator";

/**
 * The single agent loop. Sonnet 4.6 orchestrates; the Hedera Agent Kit tools
 * execute on-chain in AUTONOMOUS mode via the toolkit middleware. The toolkit
 * must be wired both ways — `middleware` (executes the tx) and `getTools`
 * (declares the tools to the model).
 */
export function runAgent(messages: ModelMessage[]) {
  const client = getOperatorClient();

  const toolkit = new HederaAIToolkit({
    client,
    configuration: {
      tools: [],
      plugins: [...allCorePlugins, tppEvaluatorPlugin],
      context: {
        mode: AgentMode.AUTONOMOUS,
        accountId: process.env.HEDERA_ACCOUNT_ID,
      },
    },
  });

  const model = wrapLanguageModel({
    model: anthropic("claude-sonnet-4-6"),
    middleware: toolkit.middleware(),
  });

  return streamText({
    model,
    system: SYSTEM_PROMPT,
    messages,
    tools: toolkit.getTools(),
    stopWhen: stepCountIs(12),
  });
}
