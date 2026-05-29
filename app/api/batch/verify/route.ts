// Prove a single decision commitment belongs to an on-chain batch root: find its
// batch, recompute its Merkle path, verify against the root, and confirm the root is
// on the Mirror Node ledger.
import { allBatches, proveInBatch } from "@/lib/batch-store";
import { fetchAuditEntries } from "@/lib/hedera/mirror";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { commitment } = (await req.json()) as { commitment?: string };
  if (!commitment) return Response.json({ error: "commitment required" }, { status: 400 });

  const batch = (await allBatches()).find((b) => b.commitments.includes(commitment));
  if (!batch) return Response.json({ inBatch: false });

  const p = proveInBatch(batch, commitment);
  const { entries } = await fetchAuditEntries(100);
  const onChain = entries.find((e) => {
    const r = typeof e.record === "object" && e.record !== null ? (e.record as Record<string, unknown>) : null;
    return r && r.kind === "batch" && r.root === batch.root;
  });

  return Response.json({
    inBatch: true,
    root: batch.root,
    batchSize: batch.commitments.length,
    proofValid: p?.valid ?? false,
    onChain: onChain ? { sequenceNumber: onChain.sequenceNumber, consensusTimestamp: onChain.consensusTimestamp } : null,
  });
}
