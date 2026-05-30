// Dispute / chargeback — the deductions-resurface-years-later case made provable. A
// counterparty (brand or retailer) contests a settled or rejected claim; the dispute is
// captured as its own confidential dossier and anchored to HCS as a proof-only commitment
// that LINKS to the original decision's commitment. Neither side can later alter or
// backdate it: the original decision, the dispute, and (on re-adjudication) the revised
// outcome form an immutable, selectively-disclosable chain.
//
// Distinct from a human override (internal oversight): this is a PARTY contesting an
// outcome. Resolution re-uses the existing agent negotiation loop — submit the new
// evidence to the agent and it re-adjudicates; the revised decision links to the original.
import { getOperatorClient } from "@/lib/hedera/client";
import { TopicMessageSubmitTransaction } from "@hiero-ledger/sdk";
import { buildCommitment } from "@/lib/dossier";
import { putDossier } from "@/lib/dossier-store";
import { requireAccess } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = requireAccess(req, { rate: { name: "dispute", limit: 20, windowMs: 60_000 } });
  if (denied) return denied;
  const b = (await req.json()) as {
    original_commitment?: string;
    original_decision?: string;
    disputed_by?: string; // "brand" | "retailer" (attribution; consent stays the on-chain keys)
    reason?: string;
    new_evidence?: string;
  };
  if (!b.original_commitment || !b.disputed_by || !b.reason) {
    return Response.json({ error: "original_commitment, disputed_by and reason are required" }, { status: 400 });
  }
  const ts = new Date().toISOString();
  const dossier = buildCommitment(
    [
      { label: "kind", value: "dispute" },
      { label: "original_commitment", value: b.original_commitment },
      { label: "original_decision", value: b.original_decision ?? "" },
      { label: "disputed_by", value: b.disputed_by },
      { label: "reason", value: b.reason },
      { label: "new_evidence", value: b.new_evidence ?? "" },
      { label: "raised_at", value: ts },
    ],
    ts,
  );
  await putDossier(dossier);

  const topicId = process.env.HCS_TOPIC_ID;
  let anchor: { topicId: string; sequenceNumber: number } | null = null;
  if (topicId) {
    const client = getOperatorClient();
    // proof-only: links the dispute commitment to the original decision; the reason +
    // new evidence stay off-chain in the dossier (selective disclosure).
    const rec = JSON.stringify({ schema: "PromoProof/v2", kind: "dispute", commitment: dossier.commitment, links_to: b.original_commitment, ts });
    const resp = await new TopicMessageSubmitTransaction({ topicId, message: rec }).execute(client);
    const r = await resp.getReceipt(client);
    anchor = { topicId, sequenceNumber: Number(r.topicSequenceNumber ?? 0) };
  }

  return Response.json({
    commitment: dossier.commitment,
    anchor,
    ts,
    status: "dispute_raised",
    note: "Re-adjudicate by submitting the new evidence to the agent; the revised decision links to the original commitment.",
  });
}
