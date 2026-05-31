// Model Risk & Quality report — the evidence a financial-services AI buyer diligences
// (OCC-style model-risk management): validation, independent review, monitoring,
// explainability, model lineage. Aggregated LIVE from the confidential off-chain
// dossiers (never the chain).
import { allDossiers } from "@/lib/dossier-store";
import type { Dossier } from "@/lib/dossier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const field = (d: Dossier, label: string) => d.fields.find((f) => f.label === label)?.value;
const parse = <T,>(s: string | undefined): T | null => {
  try { return s ? (JSON.parse(s) as T) : null; } catch { return null; }
};
type Review = { agrees?: boolean; recommended_action?: string };
type Gate = { gated?: boolean };
type Citation = { verified?: boolean };

export async function GET() {
  const ds = await allDossiers();
  // Adjudication dossiers carry both a decision and a model leaf; override and
  // access-log commitments do not, so this cleanly selects real adjudications.
  const adj = ds.filter((d) => field(d, "decision") && field(d, "model"));

  const mix: Record<string, number> = {};
  const confByDecision: Record<string, { sum: number; n: number }> = {};
  let confSum = 0, confN = 0;
  let reviewerN = 0, reviewerAgree = 0;
  let gatedN = 0;
  let citTotal = 0, citVerified = 0;
  const models: Record<string, number> = {};
  const thinking: Record<string, number> = {};

  for (const d of adj) {
    const decision = field(d, "decision") as string;
    mix[decision] = (mix[decision] ?? 0) + 1;

    const conf = Number(field(d, "confidence"));
    if (Number.isFinite(conf)) {
      confSum += conf; confN++;
      const c = confByDecision[decision] ?? { sum: 0, n: 0 };
      c.sum += conf; c.n++;
      confByDecision[decision] = c;
    }

    const review = parse<Review>(field(d, "reviewer"));
    if (review && typeof review.agrees === "boolean") { reviewerN++; if (review.agrees) reviewerAgree++; }

    if (parse<Gate>(field(d, "safety_gate"))?.gated) gatedN++;

    const cits = parse<Citation[]>(field(d, "citations"));
    if (Array.isArray(cits)) for (const c of cits) { citTotal++; if (c.verified) citVerified++; }

    const model = field(d, "model"); if (model) models[model] = (models[model] ?? 0) + 1;
    const ts = field(d, "thinking_settings"); if (ts) thinking[ts] = (thinking[ts] ?? 0) + 1;
  }

  const meanConfByDecision: Record<string, number> = {};
  for (const [k, v] of Object.entries(confByDecision)) meanConfByDecision[k] = v.n ? v.sum / v.n : 0;

  return Response.json({
    count: adj.length,
    decision_mix: mix,
    mean_confidence: confN ? confSum / confN : null,
    mean_confidence_by_decision: meanConfByDecision,
    reviewer_concurrence_rate: reviewerN ? reviewerAgree / reviewerN : null,
    reviewer_reviewed: reviewerN,
    safety_gate_escalations: gatedN,
    citation_integrity_rate: citTotal ? citVerified / citTotal : null,
    citations_checked: citTotal,
    model_registry: models,
    thinking_settings: thinking,
    validation: null,
  });
}
