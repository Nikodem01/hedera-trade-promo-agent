import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
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

const ADJUDICATOR_SYSTEM = `You are the adjudication core of PromoProof, evaluating retailer proof-of-performance for trade promotions.

You are given a bespoke promotion contract (prose), a proof photo, and the retailer's narrative. Reason — do not merely extract:
- Read the contract and identify each distinct execution requirement, noting the clause it comes from.
- Examine the photo carefully and judge each requirement: met, partial, unmet, or indeterminate (when the photo cannot settle it).
- Treat ambiguity honestly. Poor lighting, wrong angle, partial occlusion, or a missing timestamp are reasons to mark a criterion indeterminate or to request more evidence — not to silently approve or reject.
- Choose ONE overall decision:
  - approve: all material requirements clearly met.
  - partial_credit: some requirements met, others not; recommend a fair credit percentage proportional to what was delivered.
  - reject: material requirements clearly unmet.
  - request_more_evidence: the photo/narrative is borderline and a specific, obtainable piece of evidence would resolve it. State exactly what to provide.
  - escalate_human: genuinely too uncertain or out-of-policy to recommend.
- Extract the contract's maximum settlement amount in HBAR.
- Write a concise, defensible reasoning summary. Cite specific clauses.`;

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
    model: anthropic("claude-opus-4-7"),
    schema: ComplianceAssessment,
    system: ADJUDICATOR_SYSTEM,
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
