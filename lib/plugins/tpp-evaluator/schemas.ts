import { z } from "zod";

/** The five adjudication outcomes. Ambiguity is first-class: partial credit and
 * asking for more evidence are real decisions, not fallbacks. */
export const decisionEnum = z.enum([
  "approve",
  "partial_credit",
  "reject",
  "request_more_evidence",
  "escalate_human",
]);

export const criterionStatusEnum = z.enum([
  "met",
  "partial",
  "unmet",
  "indeterminate",
]);

export const CriterionAssessment = z.object({
  requirement: z.string().describe("The specific contract requirement being checked."),
  clause_ref: z
    .string()
    .describe("Citation to the contract clause this requirement comes from, e.g. 'Section 2(a)'."),
  status: criterionStatusEnum,
  observed_in_photo: z
    .string()
    .describe("What the proof photo actually shows for this requirement."),
  concern: z
    .string()
    .describe("Any ambiguity, shortfall, or doubt about this criterion. Empty string if none."),
  box: z
    .array(z.number())
    .optional()
    .describe(
      "If the evidence for this requirement is visible in the photo, its bounding box as [ymin, xmin, ymax, xmax] normalized to 0-1000 (top-left origin). Omit entirely when not visually locatable (e.g. a date, or something off-frame).",
    ),
});

export const ComplianceAssessment = z.object({
  decision: decisionEnum,
  confidence: z.number().min(0).max(1).describe("Confidence in the decision, 0 to 1."),
  recommended_credit_pct: z
    .number()
    .min(0)
    .max(100)
    .describe("Recommended payout percentage. 100 for approve, the partial figure for partial_credit, 0 otherwise."),
  max_settlement_hbar: z
    .number()
    .min(0)
    .describe("The maximum settlement amount stated in the contract, in HBAR."),
  criteria: z
    .array(CriterionAssessment)
    .describe("Per-requirement assessment, each citing the relevant contract clause."),
  reasoning_summary: z
    .string()
    .describe("A concise, defensible explanation of the overall decision."),
  evidence_requested: z
    .string()
    .optional()
    .describe("If the decision is request_more_evidence: the specific additional proof the retailer should provide."),
  authenticity_assessment: z
    .object({
      manipulation_likelihood: z
        .number()
        .min(0)
        .max(1)
        .describe("0-1 likelihood the photo shows signs of digital manipulation or AI generation, from visual inspection only."),
      note: z.string().describe("Brief note on any authenticity observations, or 'no obvious signs'."),
    })
    .optional()
    .describe("A soft, visual-only authenticity opinion on the proof photo. Not proof of fraud."),
});
export type ComplianceAssessmentType = z.infer<typeof ComplianceAssessment>;

/** An independent second-model audit of the primary assessment — reliability backbone
 * for putting AI on real money (does the evidence support the decision; any hallucination). */
export const ReviewerAssessment = z.object({
  agrees: z.boolean().describe("True if the primary decision is defensible and supported by the photo + contract."),
  concern: z.string().describe("The single most material concern found, or 'none'."),
  recommended_action: z.enum(["accept", "escalate"]).describe("Accept the primary decision, or escalate to a human reviewer."),
});
export type ReviewerAssessmentType = z.infer<typeof ReviewerAssessment>;

/**
 * Deterministic provenance, computed in code (never by the model). `commitment` is
 * the salted Merkle root over the full off-chain decision dossier — the ONLY value
 * anchored on-chain (proof-only; no business data). `image_fp` is a keyed fingerprint
 * of the proof photo, anchored so the same photo reused under a different claim is
 * detectable by parties holding the key. The salts and the dossier itself stay in the
 * server-side store and are revealed only by selective disclosure.
 */
export type AdjudicationProvenance = {
  commitment: string;
  image_fp: string;
  model: string;
  adjudicated_at: string;
};

/** The full result returned by `adjudicate_claim`: the model's typed assessment, the
 * code-computed provenance, and the HCS `anchor` (proof-only commitment record) written
 * to the audit topic deterministically — never composed or handled by the model. */
export type AdjudicationResult = ComplianceAssessmentType & {
  provenance: AdjudicationProvenance;
  anchor: { topicId: string; sequenceNumber: number; transactionId: string } | null;
  authenticity?: import("@/lib/authenticity").Authenticity;
  citations?: { ref: string; verified: boolean }[];
  review?: ReviewerAssessmentType;
  safety_gate?: import("./safety-gate").SafetyGate;
};

export const SettlementProposal = z.object({
  amount_hbar: z.number().describe("The HBAR amount to settle, after caps."),
  partial_credit_pct: z.number().describe("The credit percentage applied."),
  max_settlement_hbar: z.number().describe("The contract maximum used as the cap."),
  justification: z.string().describe("Plain-language basis for the computed amount."),
});
export type SettlementProposalType = z.infer<typeof SettlementProposal>;
