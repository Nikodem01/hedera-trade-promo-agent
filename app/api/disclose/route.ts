// Operator-side: build a selective-disclosure package from a confidential dossier.
// Given a commitment (the on-chain anchor) and the field labels to reveal, returns
// just those leaves + their salts + Merkle proofs. This package is what an operator
// hands a counterparty or auditor to prove specific facts — and nothing else —
// against the immutable on-chain commitment. The dossier itself never leaves the server.
import { discloseFields } from "@/lib/dossier";
import { getDossier } from "@/lib/dossier-store";
import { logAccess } from "@/lib/access-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { commitment, labels, actor_role, scope } = (await req.json()) as {
    commitment?: string;
    labels?: string[];
    actor_role?: string;
    scope?: string;
  };
  if (!commitment) return Response.json({ error: "missing commitment" }, { status: 400 });

  const dossier = await getDossier(commitment);
  if (!dossier) return Response.json({ error: "no dossier for that commitment" }, { status: 404 });

  // Default: disclose every field (the operator's own full view). A counterparty
  // package would pass a narrower `labels` subset.
  const chosen = labels && labels.length ? labels : dossier.fields.map((f) => f.label);
  const disclosure = discloseFields(dossier, chosen);

  // Provable access log: the disclosure itself is recorded — who (role), what (scope),
  // when — sealed off-chain with only a proof-only commitment anchored on HCS. Best-effort
  // so a logging failure never blocks the disclosure the operator requested.
  const access = await logAccess({
    action: "disclose",
    target_commitment: commitment,
    actor_role: actor_role ?? "operator",
    scope: scope ?? (labels && labels.length ? "selective" : "full"),
    labels: chosen,
  }).catch(() => null);

  return Response.json({ ...disclosure, access });
}
