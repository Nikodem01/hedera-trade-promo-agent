import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readUpload, uploadMediaType } from "@/lib/uploads";
import { generateObject } from "ai";
import { z } from "zod";
import { visionModel, visionModelId } from "@/lib/agent/model";
import { BaseTool, type Context } from "@hashgraph/hedera-agent-kit";
import { Client, TopicMessageSubmitTransaction } from "@hiero-ledger/sdk";
import { buildDossier, commitmentRecord } from "@/lib/dossier";
import { putDossier } from "@/lib/dossier-store";
import { assessAuthenticity } from "@/lib/authenticity";
import { evaluateSafetyGate } from "./safety-gate";
import {
  ComplianceAssessment,
  ReviewerAssessment,
  type AdjudicationProvenance,
  type AdjudicationResult,
} from "./schemas";

const REVIEWER_SYSTEM = `You are an INDEPENDENT reviewer auditing another AI's trade-promotion adjudication, before any money moves. You are given the contract, the proof photo, and the primary assessment (its decision and per-criterion findings). Do NOT re-adjudicate from scratch — audit the given assessment for reliability. Check only: (1) observations it asserts that are NOT actually visible in the photo (hallucination), (2) clause misreadings, (3) a decision not supported by its own findings. Output: agrees (true if the decision is defensible), the single most material concern (or "none"), and recommended_action ("accept", or "escalate" if you found a material problem that should go to a human).`;

// The exact provider options the model is called with — also recorded (as a leaf)
// in the off-chain dossier so the reasoning settings are part of the committed audit.
const THINKING = { google: { thinkingConfig: { thinkingLevel: "high" } } };

export const ADJUDICATE_CLAIM = "adjudicate_claim";

const adjudicateParameters = (_context: Context = {}) =>
  z.object({
    contract_text: z
      .string()
      .describe("The full bespoke trade-promotion contract text to evaluate the claim against."),
    image_ref: z
      .string()
      .describe(
        "The proof photo: a built-in filename (e.g. 'image_b347ff.jpg'), an https URL, or a retailer-uploaded reference of the form 'upload:<id>' supplied as additional evidence in a follow-up turn.",
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
    additional_image_refs: z
      .array(z.string())
      .optional()
      .describe(
        "Additional proof photos for the SAME claim (e.g. a wide shot plus a close-up of the facings). Each a built-in filename, an https URL, or 'upload:<id>'. Judge all of them together.",
      ),
    retailer: z
      .string()
      .optional()
      .describe("The retailer name, captured into the confidential off-chain dossier."),
    promotion: z
      .string()
      .optional()
      .describe("The promotion name, captured into the confidential off-chain dossier."),
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

VISUAL GROUNDING: for each criterion whose evidence is actually visible in the photo, set its "box" to the bounding box of that evidence as [ymin, xmin, ymax, xmax] with each value an integer 0–1000 (top-left origin; the box should tightly frame what you observed — the facings, the header/signage, the display, the placement). Omit "box" entirely for anything not visually locatable (e.g. a date, or an off-frame requirement). Never invent a box for something you did not actually see.

AUTHENTICITY: set authenticity_assessment.manipulation_likelihood (0–1) and a brief note from VISUAL inspection only — look for splicing seams, inconsistent lighting/shadows/perspective, warped or repeated text, or AI-generation artifacts. This is a soft signal, not proof; report low likelihood and "no obvious signs" when nothing stands out.

MULTI-LANGUAGE: the contract and narrative may be in any language (global retailers). Reason in the source language, but write clause refs and the reasoning summary in English.

ANTI-HALLUCINATION: never assert a product, facing count, brand, or signage that you did not explicitly identify in Phase 1. If you cannot see it, it is unmet or indeterminate — not met.`;

async function loadImage(
  ref: string,
): Promise<{ image: Buffer | URL; mediaType?: string }> {
  if (/^https?:\/\//i.test(ref)) return { image: new URL(ref) };
  // A retailer-uploaded evidence photo (clearer shot supplied mid-negotiation).
  if (ref.startsWith("upload:")) {
    const id = ref.slice("upload:".length);
    return { image: await readUpload(id), mediaType: uploadMediaType(id) };
  }
  // Built-in proofs live in public/proofs so the same file is served to the
  // browser for display and read here as bytes. Bundled into the serverless trace
  // via outputFileTracingIncludes (next.config.ts).
  const path = join(process.cwd(), "public", "proofs", ref);
  const bytes = await readFile(path);
  const mediaType = ref.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  return { image: bytes, mediaType };
}

/** Get the raw image bytes (for the dossier's image_sha256 + keyed fingerprint),
 * fetching them when the ref was an https URL rather than local/uploaded bytes. */
async function imageBytesOf(image: Buffer | URL): Promise<Buffer> {
  if (Buffer.isBuffer(image)) return image;
  const res = await fetch(image);
  return Buffer.from(await res.arrayBuffer());
}

/** Anchor the PROOF-ONLY commitment record to HCS, deterministically (never by the
 * model). HCS adds the consensus timestamp + sequence number — the immutable,
 * publicly-verifiable anchor for the confidential off-chain dossier. */
async function anchorCommitment(client: Client, topicId: string, message: string) {
  const resp = await new TopicMessageSubmitTransaction({ topicId, message }).execute(client);
  const receipt = await resp.getReceipt(client);
  return {
    topicId,
    sequenceNumber: Number(receipt.topicSequenceNumber ?? 0),
    transactionId: resp.transactionId?.toString() ?? "",
  };
}

/** The load-bearing multimodal call: the vision model reads the contract, sees the
 * photo, weighs the narrative, and returns a typed, clause-cited assessment. The full
 * provenance is captured into an OFF-CHAIN dossier (stored server-side); only its
 * salted Merkle commitment is anchored to HCS — proof-only, no business data. */
export async function adjudicate(
  params: AdjudicateParams,
  client?: Client,
): Promise<AdjudicationResult> {
  const { image, mediaType } = await loadImage(params.image_ref);
  // Multi-photo: judge any additional shots of the same claim alongside the primary.
  const extraImages: { type: "image"; image: Buffer | URL; mediaType?: string }[] = [];
  for (const ref of params.additional_image_refs ?? []) {
    const loaded = await loadImage(ref);
    extraImages.push({ type: "image", image: loaded.image, mediaType: loaded.mediaType });
  }

  const { object } = await generateObject({
    model: visionModel(),
    schema: ComplianceAssessment,
    system: ADJUDICATOR_SYSTEM,
    // HIGH thinking deepens multi-constraint compliance reasoning (Gemini 3.x);
    // ignored by providers that don't use the `google` namespace. maxRetries gives
    // exponential-backoff resilience against free-tier 429s.
    maxRetries: 4,
    providerOptions: THINKING,
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
          ...extraImages,
        ],
      },
    ],
  });

  // Independent reviewer: a second model audits the primary assessment for
  // hallucination / unsupported decisions (reliability backbone for AI-on-money).
  const { object: review } = await generateObject({
    model: visionModel(),
    schema: ReviewerAssessment,
    system: REVIEWER_SYSTEM,
    maxRetries: 4,
    providerOptions: THINKING,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `CONTRACT:\n${params.contract_text}\n\nPRIMARY ASSESSMENT:\n` +
              JSON.stringify({ decision: object.decision, recommended_credit_pct: object.recommended_credit_pct, criteria: object.criteria.map((c) => ({ clause_ref: c.clause_ref, status: c.status, observed_in_photo: c.observed_in_photo })), reasoning_summary: object.reasoning_summary }) +
              `\n\nAudit this assessment against the attached proof photo.`,
          },
          { type: "image", image, mediaType },
          ...extraImages,
        ],
      },
    ],
  });

  const model = visionModelId();
  const adjudicated_at = new Date().toISOString();
  const imageBytes = await imageBytesOf(image);

  // Citation verification (deterministic, no extra model call): every cited clause
  // ref must actually appear in the contract — catches fabricated citations.
  const clauseToken = (ref: string) => ref.replace(/§|sections?|clauses?|articles?|paragraphs?|nos?\.?/gi, "").trim();
  const haystack = params.contract_text.toLowerCase();
  const citations = object.criteria.map((c) => {
    const tok = clauseToken(c.clause_ref).toLowerCase();
    return { ref: c.clause_ref, verified: tok.length > 0 && haystack.includes(tok) };
  });

  // Evidence authenticity: objective EXIF capture metadata (code) + the model's soft
  // visual manipulation opinion. Cross-claim reuse is detected on-chain via image_fp.
  const authenticity = await assessAuthenticity(
    imageBytes,
    object.authenticity_assessment
      ? { manipulation_likelihood: object.authenticity_assessment.manipulation_likelihood, note: object.authenticity_assessment.note }
      : undefined,
  );

  // Deterministic safety gate (code, not the model): makes the independent reviewer
  // and a confidence floor LOAD-BEARING before any money moves. Can only withhold —
  // a gated decision becomes escalate_human, for which compute_settlement pays 0.
  const gate = evaluateSafetyGate({ decision: object.decision, confidence: object.confidence, reviewer: review });
  if (gate.gated) {
    object.decision = "escalate_human";
    object.recommended_credit_pct = 0;
  }

  // Capture the COMPLETE decision provenance off-chain, salt-committed to a Merkle root.
  const dossier = buildDossier({
    contract_text: params.contract_text,
    narrative: params.narrative,
    prior_evidence: params.prior_evidence,
    imageBytes,
    system_prompt: ADJUDICATOR_SYSTEM,
    model,
    thinking_settings: JSON.stringify(THINKING),
    assessment: object,
    authenticity: JSON.stringify(authenticity),
    citations: JSON.stringify(citations),
    review: JSON.stringify(review),
    safety_gate: JSON.stringify(gate),
    retailer: params.retailer,
    promotion: params.promotion,
    adjudicated_at,
  });
  await putDossier(dossier);

  const provenance: AdjudicationProvenance = {
    commitment: dossier.commitment,
    image_fp: dossier.image_fp,
    model,
    adjudicated_at,
  };

  // Anchor the proof-only commitment in code (the model never touches the on-chain payload).
  const topicId = process.env.HCS_TOPIC_ID;
  const anchor =
    client && topicId ? await anchorCommitment(client, topicId, commitmentRecord(dossier)) : null;

  return { ...object, provenance, anchor, authenticity, citations, review, safety_gate: gate };
}

export class AdjudicateClaimTool extends BaseTool {
  method = ADJUDICATE_CLAIM;
  name = "Adjudicate Claim";
  description: string;
  parameters: ReturnType<typeof adjudicateParameters>;

  constructor(context: Context) {
    super();
    this.description =
      "Adjudicate a retailer's trade-promotion proof-of-performance. Reads the bespoke contract, examines the proof photo and narrative, and returns a typed assessment: a 5-way decision (approve | partial_credit | reject | request_more_evidence | escalate_human), per-criterion findings with contract clause citations, a confidence, a recommended credit %, and the contract's maximum settlement in HBAR. It captures the full decision provenance into a confidential off-chain dossier and returns a proof-only commitment (salted Merkle root + keyed image fingerprint). Follow the system workflow for any HCS proof-only submission. Call this before computing any settlement.";
    this.parameters = adjudicateParameters(context);
  }

  async normalizeParams(params: AdjudicateParams, _context: Context, _client: Client) {
    return params;
  }

  async coreAction(params: AdjudicateParams, _context: Context, client: Client) {
    return adjudicate(params, client);
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
