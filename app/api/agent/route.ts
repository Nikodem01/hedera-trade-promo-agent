import { convertToModelMessages, type UIMessage } from "ai";
import { runAgent } from "@/lib/agent";

// Hedera SDK uses gRPC and Node APIs — must run on the Node.js runtime, not Edge.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const modelMessages = await convertToModelMessages(messages);
  return runAgent(modelMessages).toUIMessageStreamResponse();
}
