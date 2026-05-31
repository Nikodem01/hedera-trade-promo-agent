// Export settled decisions for the brand's ERP / AP-AR reconciliation. CSV for
// spreadsheets, or an EDI-812-shaped JSON (the standard "Credit/Debit Adjustment"
// retailers and CPGs exchange for deductions). Each row references the on-chain
// commitment, so finance can independently verify any line years later.
import { allDossiers } from "@/lib/dossier-store";
import { requireAccess } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const field = (d: { fields: { label: string; value: string }[] }, label: string) => d.fields.find((f) => f.label === label)?.value ?? "";

type Row = { date: string; retailer: string; promotion: string; decision: string; settled: number; max: number; commitment: string };

function rows(ds: { fields: { label: string; value: string }[]; commitment: string; created_at: string }[]): Row[] {
  return ds
    .filter((d) => field(d, "decision"))
    .map((d) => {
      const decision = field(d, "decision");
      const max = Number(field(d, "max_settlement_hbar")) || 0;
      const pct = decision === "approve" ? 100 : decision === "partial_credit" ? Number(field(d, "recommended_credit_pct")) || 0 : 0;
      return { date: d.created_at, retailer: field(d, "retailer"), promotion: field(d, "promotion"), decision, settled: (pct / 100) * max, max, commitment: d.commitment };
    });
}

export async function GET(req: Request) {
  const denied = requireAccess(req, { rate: { name: "export", limit: 20, windowMs: 60_000 } });
  if (denied) return denied;
  const format = new URL(req.url).searchParams.get("format") ?? "csv";
  const data = rows(await allDossiers());

  if (format === "edi") {
    // EDI-812-shaped Credit/Debit Adjustment payload (JSON representation).
    const body = data.map((r, i) => ({
      transactionSet: "812",
      cad01_adjustmentNumber: `PP-${i + 1}`,
      date: r.date,
      customer: r.retailer,
      promotion: r.promotion,
      adjustmentReasonCode: r.decision === "approve" ? "AA" : r.decision === "partial_credit" ? "59" : "81",
      amount: Number(r.settled.toFixed(2)),
      currency: "pUSDC",
      reference_commitment: r.commitment,
    }));
    return Response.json({ standard: "EDI-812 (JSON)", count: body.length, adjustments: body });
  }

  const header = "date,retailer,promotion,decision,settled_pusdc,contract_max,commitment";
  const csv = [header, ...data.map((r) => [r.date, r.retailer, r.promotion, r.decision, r.settled.toFixed(2), r.max, r.commitment].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
  return new Response(csv, { headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="promoproof-settlements.csv"' } });
}
