// Seal all not-yet-batched decision commitments into ONE Merkle batch root and
// anchor a single proof-only HCS message for the whole set — the scale/privacy
// pattern (one anchor for N decisions; per-decision timing/volume hidden).
import { getOperatorClient } from "@/lib/hedera/client";
import { TopicMessageSubmitTransaction } from "@hiero-ledger/sdk";
import { allDossiers } from "@/lib/dossier-store";
import { batchRoot, putBatch, sealedCommitments } from "@/lib/batch-store";
import { requireAccess } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = requireAccess(req, { rate: { name: "batch", limit: 10, windowMs: 60_000 } });
  if (denied) return denied;
  const sealed = await sealedCommitments();
  const commitments = (await allDossiers())
    .map((d) => d.commitment)
    .filter((c) => /^[0-9a-f]{64}$/.test(c) && !sealed.has(c));
  if (commitments.length === 0) return Response.json({ error: "no new commitments to seal" }, { status: 400 });

  const root = batchRoot(commitments);
  const ts = new Date().toISOString();

  let sequenceNumber: number | undefined;
  const topicId = process.env.HCS_TOPIC_ID;
  if (topicId) {
    const client = getOperatorClient();
    const rec = JSON.stringify({ schema: "PromoProof/v2", kind: "batch", root, count: commitments.length, ts });
    const resp = await new TopicMessageSubmitTransaction({ topicId, message: rec }).execute(client);
    sequenceNumber = Number((await resp.getReceipt(client)).topicSequenceNumber ?? 0);
  }
  await putBatch({ root, commitments, ts, sequenceNumber });

  return Response.json({ root, count: commitments.length, sequenceNumber });
}
