// Operator-side: build a selective-disclosure package from a confidential dossier.
// Given a commitment (the on-chain anchor) and the field labels to reveal, returns
// just those leaves + their salts + Merkle proofs. This package is what an operator
// hands a counterparty or auditor to prove specific facts — and nothing else —
// against the immutable on-chain commitment. The dossier itself never leaves the server.
import { discloseFields } from "@/lib/dossier";
import { getDossier } from "@/lib/dossier-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { commitment, labels } = (await req.json()) as { commitment?: string; labels?: string[] };
  if (!commitment) return Response.json({ error: "missing commitment" }, { status: 400 });

  const dossier = await getDossier(commitment);
  if (!dossier) return Response.json({ error: "no dossier for that commitment" }, { status: 404 });

  // Default: disclose every field (the operator's own full view). A counterparty
  // package would pass a narrower `labels` subset.
  const chosen = labels && labels.length ? labels : dossier.fields.map((f) => f.label);
  return Response.json(discloseFields(dossier, chosen));
}
