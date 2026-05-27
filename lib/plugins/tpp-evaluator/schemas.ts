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
});
export type ComplianceAssessmentType = z.infer<typeof ComplianceAssessment>;

export const SettlementProposal = z.object({
  amount_hbar: z.number().describe("The HBAR amount to settle, after caps."),
  partial_credit_pct: z.number().describe("The credit percentage applied."),
  max_settlement_hbar: z.number().describe("The contract maximum used as the cap."),
  justification: z.string().describe("Plain-language basis for the computed amount."),
});
export type SettlementProposalType = z.infer<typeof SettlementProposal>;
