import { discloseFields } from "@/lib/dossier";
import { getDossier } from "@/lib/dossier-store";
import { requirePublicAccess } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIVE_DISCLOSURE_LABELS = [
  "decision",
  "recommended_credit_pct",
  "max_settlement_hbar",
  "reasoning_summary",
];

export async function POST(req: Request) {
  const denied = requirePublicAccess(req, {
    rate: { name: "public-live-disclose", limit: 20, windowMs: 10 * 60_000 },
  });
  if (denied) return denied;

  const { commitment } = (await req.json()) as { commitment?: string };
  if (!commitment) return Response.json({ error: "missing commitment" }, { status: 400 });

  const dossier = await getDossier(commitment);
  if (!dossier) return Response.json({ error: "live dossier not found yet" }, { status: 404 });

  return Response.json(discloseFields(dossier, LIVE_DISCLOSURE_LABELS));
}
