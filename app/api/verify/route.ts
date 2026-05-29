// Verify a selective-disclosure package against the chain — the dispute artifact.
// Given a disclosure (revealed leaves + Merkle proofs + the commitment), this:
//   1. Re-derives each revealed leaf and checks its Merkle proof against the
//      commitment — proving the field is authentic, exposing no sibling.
//   2. Confirms that commitment exists on the immutable Mirror Node ledger
//      (returns its consensus seq # + timestamp).
//   3. Flags proof reuse: the same image fingerprint anchored under a DIFFERENT
//      commitment — detectable from the public chain, exposing nothing.
import { verifyDisclosure, type Disclosure } from "@/lib/dossier";
import { fetchAuditEntries } from "@/lib/hedera/mirror";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const disc = (await req.json()) as Partial<Disclosure>;
  if (!disc.commitment || !Array.isArray(disc.revealed)) {
    return Response.json({ error: "missing commitment or revealed fields" }, { status: 400 });
  }

  // 1. Cryptographic check of each revealed field against the commitment.
  const fields = verifyDisclosure(disc as Disclosure);
  const allFieldsOk = fields.length > 0 && fields.every((f) => f.ok);

  // 2 + 3. Read the immutable ledger back from the chain.
  const { topicId, entries, error } = await fetchAuditEntries(100);
  let onChain: { sequenceNumber: number; consensusTimestamp: string; image_fp?: string } | null = null;
  const reuse: { sequenceNumber: number; consensusTimestamp: string }[] = [];

  // locate this commitment's record + its anchored image fingerprint
  for (const e of entries) {
    const r = typeof e.record === "object" && e.record !== null ? (e.record as Record<string, unknown>) : null;
    if (r && r.commitment === disc.commitment) {
      onChain = { sequenceNumber: e.sequenceNumber, consensusTimestamp: e.consensusTimestamp, image_fp: r.image_fp as string | undefined };
      break;
    }
  }
  if (onChain?.image_fp) {
    for (const e of entries) {
      const r = typeof e.record === "object" && e.record !== null ? (e.record as Record<string, unknown>) : null;
      if (r && r.image_fp === onChain.image_fp && r.commitment !== disc.commitment) {
        reuse.push({ sequenceNumber: e.sequenceNumber, consensusTimestamp: e.consensusTimestamp });
      }
    }
  }

  return Response.json({
    topicId,
    onChain: onChain ? { sequenceNumber: onChain.sequenceNumber, consensusTimestamp: onChain.consensusTimestamp } : null,
    fields,
    allFieldsOk,
    reuse: { detected: reuse.length > 0, hits: reuse },
    mirrorError: error,
  });
}
