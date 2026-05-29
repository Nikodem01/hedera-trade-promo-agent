// Operator-side portfolio stats, derived from the CONFIDENTIAL off-chain dossiers
// (never from the chain — outcomes and amounts are not public). This is the private
// counterpart to the public commitment ledger: decision mix + settled value the
// operator sees, computed from data that never left the server.
import { allDossiers } from "@/lib/dossier-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const field = (d: { fields: { label: string; value: string }[] }, label: string) =>
  d.fields.find((f) => f.label === label)?.value;

export async function GET() {
  const ds = await allDossiers();
  const mix: Record<string, number> = {};
  let settledValue = 0;
  let recovered = 0; // $ withheld vs naively paying every resolved claim in full
  for (const d of ds) {
    const decision = field(d, "decision");
    if (!decision) continue;
    mix[decision] = (mix[decision] ?? 0) + 1;
    const max = Number(field(d, "max_settlement_hbar")) || 0;
    if (decision === "approve" || decision === "partial_credit") {
      const pct = decision === "approve" ? 100 : Number(field(d, "recommended_credit_pct")) || 0;
      const settled = (pct / 100) * max;
      settledValue += settled;
      recovered += max - settled; // the partial-credit shortfall avoided
    } else if (decision === "reject") {
      recovered += max; // a full invalid claim not paid
    }
  }
  return Response.json({ count: ds.length, mix, settledValue, recovered });
}
