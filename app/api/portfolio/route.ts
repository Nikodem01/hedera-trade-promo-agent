// Operator-side portfolio stats, derived from the CONFIDENTIAL off-chain dossiers
// (never from the chain — outcomes and amounts are not public). This is the private
// counterpart to the public commitment ledger: decision mix + settled value the
// operator sees, computed from data that never left the server.
import { allDossiers } from "@/lib/dossier-store";
import { requireAccess } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const field = (d: { fields: { label: string; value: string }[] }, label: string) =>
  d.fields.find((f) => f.label === label)?.value;

export async function GET(req: Request) {
  const denied = requireAccess(req, { rate: { name: "portfolio", limit: 40, windowMs: 60_000 } });
  if (denied) return denied;
  const ds = await allDossiers();
  const mix: Record<string, number> = {};
  let settledValue = 0;
  let recovered = 0; // $ withheld vs naively paying every resolved claim in full
  let flagged = 0; // claims where a deduction was caught (any amount withheld)
  let resolved = 0; // claims with a final settlement outcome (approve/partial/reject)
  // exclude access-log / override commitments — only real adjudications carry a decision
  const adj = ds.filter((d) => field(d, "decision") && field(d, "model"));
  for (const d of adj) {
    const decision = field(d, "decision") as string;
    mix[decision] = (mix[decision] ?? 0) + 1;
    const max = Number(field(d, "max_settlement_hbar")) || 0;
    if (decision === "approve" || decision === "partial_credit") {
      resolved++;
      const pct = decision === "approve" ? 100 : Number(field(d, "recommended_credit_pct")) || 0;
      const settled = (pct / 100) * max;
      settledValue += settled;
      const withheld = max - settled;
      recovered += withheld; // the partial-credit shortfall avoided
      if (withheld > 0) flagged++;
    } else if (decision === "reject") {
      resolved++;
      recovered += max; // a full invalid claim not paid
      flagged++;
    }
  }
  // Deduction-management framing (the buyer's language): the share of resolved claims
  // where AI caught an over-claim and prevented overpayment.
  const catchRate = resolved > 0 ? flagged / resolved : 0;
  return Response.json({ count: adj.length, mix, settledValue, recovered, flagged, catchRate });
}
