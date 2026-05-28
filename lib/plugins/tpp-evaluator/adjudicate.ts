import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { generateObject } from "ai";
import { z } from "zod";
import { visionModel } from "@/lib/agent/model";
import { BaseTool, type Context } from "@hashgraph/hedera-agent-kit";
import type { Client } from "@hiero-ledger/sdk";
import { ComplianceAssessment, type ComplianceAssessmentType } from "./schemas";

export const ADJUDICATE_CLAIM = "adjudicate_claim";

const adjudicateParameters = (_context: Context = {}) =>
  z.object({
    contract_text: z
      .string()
      .describe("The full bespoke trade-promotion contract text to evaluate the claim against."),
    image_ref: z
      .string()
      .describe(
        "The proof photo: a filename in examples/proofs/ (e.g. '01-oreo-endcap-clean.jpg') or an https URL.",
      ),
    narrative: z
      .string()
      .describe("The retailer's narrative claim describing how the promotion was executed."),
    prior_evidence: z
      .string()
      .optional()
      .describe(
        "Additional evidence supplied in a follow-up turn (e.g. a POS timestamp or a description of a clearer photo), when re-adjudicating after requesting more evidence.",
      ),
  });

type AdjudicateParams = z.infer<ReturnType<typeof adjudicateParameters>>;

const ADJUDICATOR_SYSTEM = `You are the adjudication core of PromoProof, evaluating retailer proof-of-performance for trade promotions. You are given a bespoke promotion contract (prose), a proof photo, and the retailer's narrative. Reason — do not merely extract. Work through these phases in order:

PHASE 1 — OBSERVE (ground yourself in the image before you judge it):
- Describe the photo's layout by region (foreground/background; left/center/right; shelf levels or fixtures present).
- List only what is actually visible: products, brands, signage/headers, facing counts you can literally count, and the placement type (end-cap, freestanding display, in-aisle shelf, checkout lane, …).
- Note image-quality limits (lighting, angle, occlusion, resolution) and explicitly state what is NOT determinable from the image (e.g. dates, what is off-frame).
- Do not consult the contract in this phase. Report observations only.

PHASE 2 — EXTRACT:
- Read the contract and enumerate each distinct execution requirement, noting the exact clause reference it comes from.

PHASE 3 — RECONCILE:
- For each requirement, compare it strictly against your Phase 1 observations. Judge met / partial / unmet / indeterminate. Mark indeterminate when the photo genuinely cannot settle it (e.g. a date) — do not guess. Treat poor lighting/angle/occlusion as grounds for indeterminate or requesting evidence, never for a silent pass.

PHASE 4 — DECIDE — choose ONE overall decision:
  - approve: all material requirements clearly met.
  - partial_credit: some met, others not; recommend a fair credit percentage proportional to what was delivered.
  - reject: a material/threshold requirement clearly unmet.
  - request_more_evidence: borderline, and a specific obtainable piece of evidence would resolve it. State exactly what to provide.
  - escalate_human: genuinely too uncertain or out-of-policy to recommend.
Then extract the contract's maximum settlement amount in HBAR and write a concise, defensible reasoning summary that cites specific clauses.

ANTI-HALLUCINATION: never assert a product, facing count, brand, or signage that you did not explicitly identify in Phase 1. If you cannot see it, it is unmet or indeterminate — not met.`;

async function loadImage(
  ref: string,
): Promise<{ image: Buffer | URL; mediaType?: string }> {
  if (/^https?:\/\//i.test(ref)) return { image: new URL(ref) };
  const path = join(process.cwd(), "examples", "proofs", ref);
  const bytes = await readFile(path);
  const mediaType = ref.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  return { image: bytes, mediaType };
}

/** The load-bearing multimodal call: Opus 4.7 reads the contract, sees the photo,
 * weighs the narrative, and returns a typed, clause-cited assessment. */
export async function adjudicate(
  params: AdjudicateParams,
): Promise<ComplianceAssessmentType> {
  const { image, mediaType } = await loadImage(params.image_ref);

  const { object } = await generateObject({
    model: visionModel(),
    schema: ComplianceAssessment,
    system: ADJUDICATOR_SYSTEM,
    // HIGH thinking deepens multi-constraint compliance reasoning (Gemini 3.x);
    // ignored by providers that don't use the `google` namespace. maxRetries gives
    // exponential-backoff resilience against free-tier 429s.
    maxRetries: 4,
    providerOptions: {
      google: { thinkingConfig: { thinkingLevel: "high" } },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `CONTRACT:\n${params.contract_text}\n\n` +
              `RETAILER NARRATIVE:\n${params.narrative}\n\n` +
              (params.prior_evidence
                ? `ADDITIONAL EVIDENCE (follow-up):\n${params.prior_evidence}\n\n`
                : "") +
              `Evaluate the attached proof photo against the contract. Cite the relevant clause for each criterion.`,
          },
          { type: "image", image, mediaType },
        ],
      },
    ],
  });

  return object;
}

export class AdjudicateClaimTool extends BaseTool {
  method = ADJUDICATE_CLAIM;
  name = "Adjudicate Claim";
  description: string;
  parameters: ReturnType<typeof adjudicateParameters>;

  constructor(context: Context) {
    super();
    this.description =
      "Adjudicate a retailer's trade-promotion proof-of-performance. Reads the bespoke contract, examines the proof photo and narrative, and returns a typed assessment: a 5-way decision (approve | partial_credit | reject | request_more_evidence | escalate_human), per-criterion findings with contract clause citations, a confidence, a recommended credit %, and the contract's maximum settlement in HBAR. Call this before computing any settlement.";
    this.parameters = adjudicateParameters(context);
  }

  async normalizeParams(params: AdjudicateParams, _context: Context, _client: Client) {
    return params;
  }

  async coreAction(params: AdjudicateParams, _context: Context, _client: Client) {
    return adjudicate(params);
  }

  async shouldSecondaryAction() {
    return false;
  }

  async secondaryAction(_request: unknown, _client: Client, _context: Context): Promise<never> {
    throw new Error(
      "adjudicate_claim is a read-only evaluation tool and has no transaction to submit.",
    );
  }
}

const tool = (context: Context): BaseTool => new AdjudicateClaimTool(context);
export default tool;
