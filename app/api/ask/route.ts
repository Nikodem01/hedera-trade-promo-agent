// Conversational audit: answer a natural-language question over the (confidential,
// off-chain) decision portfolio — "show every retailer claim we rejected for a missing
// date this quarter and the value withheld". Uses ONLY the structured records; never the
// chain (the chain holds no business data).
import { generateText } from "ai";
import { orchestratorModel } from "@/lib/agent/model";
import { allDossiers } from "@/lib/dossier-store";
import { requireAccess } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const field = (d: { fields: { label: string; value: string }[] }, label: string) => d.fields.find((f) => f.label === label)?.value ?? "";

export async function POST(req: Request) {
  const denied = requireAccess(req, { rate: { name: "ask", limit: 15, windowMs: 60_000 } });
  if (denied) return denied;
  const { question } = (await req.json()) as { question?: string };
  if (!question || !question.trim()) return Response.json({ error: "question required" }, { status: 400 });

  const rows = (await allDossiers())
    .filter((d) => field(d, "decision"))
    .map((d) => ({
      date: d.created_at,
      retailer: field(d, "retailer"),
      promotion: field(d, "promotion"),
      decision: field(d, "decision"),
      recommended_credit_pct: field(d, "recommended_credit_pct"),
      max_settlement_hbar: field(d, "max_settlement_hbar"),
      commitment: d.commitment.slice(0, 12),
    }));
  if (rows.length === 0) return Response.json({ answer: "No adjudicated claims yet — run a claim first.", recordCount: 0 });

  const { text } = await generateText({
    model: orchestratorModel(),
    system:
      "You answer questions about a CPG trade-promotion adjudication portfolio for a revenue-management analyst. Use ONLY the provided JSON records. Be concise and specific; compute totals when asked (settled = max_settlement_hbar × pct/100; approve=100%, reject/escalate/request=0%). If the records cannot answer, say so plainly. Currency is pUSDC.",
    prompt: `RECORDS (JSON):\n${JSON.stringify(rows)}\n\nQUESTION: ${question.trim()}`,
    maxRetries: 3,
  });
  return Response.json({ answer: text, recordCount: rows.length });
}
