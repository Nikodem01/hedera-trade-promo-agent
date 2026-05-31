import { convertToModelMessages, type UIMessage } from "ai";
import { runAgent } from "@/lib/agent";
import { requirePublicAccess } from "@/lib/guard";
import { liveSandboxPrompt } from "@/lib/live-sandbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const denied = requirePublicAccess(req, {
    rate: { name: "public-live-demo", limit: 3, windowMs: 10 * 60_000 },
  });
  if (denied) return denied;

  const messages: UIMessage[] = [
    {
      id: "public-live-sandbox",
      role: "user",
      parts: [{ type: "text", text: liveSandboxPrompt() }],
    },
  ];

  const modelMessages = await convertToModelMessages(messages);
  return runAgent(modelMessages).toUIMessageStreamResponse();
}
