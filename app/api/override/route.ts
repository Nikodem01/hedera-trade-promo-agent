// Human oversight, on the record. An analyst can overturn the AI decision; the
// override is captured as its own confidential dossier and anchored to HCS as a
// proof-only commitment that LINKS to the original decision's commitment. This is
// tamper-proof evidence of human-in-command oversight (EU AI Act, Art. 14) — who
// changed what, and when — verifiable later without exposing the reasoning.
import { getOperatorClient } from "@/lib/hedera/client";
import { TopicMessageSubmitTransaction } from "@hiero-ledger/sdk";
import { buildCommitment } from "@/lib/dossier";
import { putDossier } from "@/lib/dossier-store";
import { requireAccess } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = requireAccess(req, { rate: { name: "override", limit: 20, windowMs: 60_000 } });
  if (denied) return denied;
  const b = (await req.json()) as {
    original_commitment?: string;
    prior_decision?: string;
    new_decision?: string;
    reason?: string;
    analyst?: string;
  };
  if (!b.original_commitment || !b.new_decision || !b.reason) {
    return Response.json({ error: "original_commitment, new_decision and reason are required" }, { status: 400 });
  }
  const ts = new Date().toISOString();
  const dossier = buildCommitment(
    [
      { label: "kind", value: "human-override" },
      { label: "original_commitment", value: b.original_commitment },
      { label: "prior_decision", value: b.prior_decision ?? "" },
      { label: "new_decision", value: b.new_decision },
      { label: "reason", value: b.reason },
      { label: "analyst", value: b.analyst ?? "analyst" },
      { label: "overridden_at", value: ts },
    ],
    ts,
  );
  await putDossier(dossier);

  const topicId = process.env.HCS_TOPIC_ID;
  let anchor: { topicId: string; sequenceNumber: number } | null = null;
  if (topicId) {
    const client = getOperatorClient();
    // proof-only: links the override commitment to the original decision commitment;
    // the new decision + reason stay off-chain in the dossier (selective disclosure).
    const rec = JSON.stringify({ schema: "PromoProof/v2", kind: "override", commitment: dossier.commitment, links_to: b.original_commitment, ts });
    const resp = await new TopicMessageSubmitTransaction({ topicId, message: rec }).execute(client);
    const r = await resp.getReceipt(client);
    anchor = { topicId, sequenceNumber: Number(r.topicSequenceNumber ?? 0) };
  }

  return Response.json({ commitment: dossier.commitment, anchor, ts });
}
