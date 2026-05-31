import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { convertToModelMessages, type UIMessage } from "ai";
import { runAgent } from "@/lib/agent";
import { requirePublicAccess } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LIVE_SANDBOX = {
  id: "live-sandbox-01",
  contractFile: "01-oreo-endcap-q2.txt",
  retailer: "Retailer_W",
  promotion: "Brand_O floor display",
  imageRef: "oreo.jpg",
  narrative:
    "Freestanding OREO display tower installed beside the dairy case for all of May, with the branded OREO header card and well over four facings across the unit, fully stocked. Photo attached.",
};

export async function POST(req: Request) {
  const denied = requirePublicAccess(req, {
    rate: { name: "public-live-demo", limit: 3, windowMs: 10 * 60_000 },
  });
  if (denied) return denied;

  const contract = await readFile(
    join(process.cwd(), "examples", "contracts", LIVE_SANDBOX.contractFile),
    "utf8",
  );
  const text =
    `LIVE SANDBOX CLAIM ${LIVE_SANDBOX.id}. Adjudicate it and prepare the proof-only Hedera artifacts.\n\n` +
    `Retailer display label: ${LIVE_SANDBOX.retailer}\n` +
    `Promotion display label: ${LIVE_SANDBOX.promotion}\n\n` +
    `CONTRACT:\n${contract}\n\n` +
    `IMAGE_REF: ${LIVE_SANDBOX.imageRef}\n` +
    `NARRATIVE: ${LIVE_SANDBOX.narrative}`;

  const messages: UIMessage[] = [
    {
      id: "public-live-sandbox",
      role: "user",
      parts: [{ type: "text", text }],
    },
  ];

  const modelMessages = await convertToModelMessages(messages);
  return runAgent(modelMessages).toUIMessageStreamResponse();
}
