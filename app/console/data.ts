// Scenario data for the PromoProof console. Presentation-layer mock that mirrors
// what the live agent produces (typed with the real plugin schemas). HashScan
// links point at the actual on-chain topic/token/tx created during setup, so the
// receipts are genuinely verifiable.
import type {
  ComplianceAssessmentType,
  SettlementProposalType,
} from "@/lib/plugins/tpp-evaluator/schemas";

export type ToolCall = {
  tool: string;
  args: string;
  result: string;
  verdict?: boolean;
};

export type PhotoTone = "warm" | "rose" | "slate";

export type Scenario = {
  id: "oreo" | "cadbury" | "ritz";
  retailer: string;
  retailerId: string;
  promotion: string;
  promoSub: string;
  maxHbar: number;
  expected: string;
  contractId: string;
  claimId: string;
  submittedAt: string;
  submittedBy: string;
  narrative: string;
  photoCaption: string;
  photoTone: PhotoTone;
  assessment: ComplianceAssessmentType;
  revisedAssessment?: ComplianceAssessmentType;
  settlement: SettlementProposalType | null;
};

export const SCENARIOS: Record<string, Scenario> = {
  oreo: {
    id: "oreo",
    retailer: "Walmart",
    retailerId: "Store #2643 · Bentonville, AR",
    promotion: "Q2 OREO End-Cap",
    promoSub: "Cookie/cracker aisle · Apr 14 – May 11, 2026",
    maxHbar: 30,
    expected: "Full settlement expected",
    contractId: "0.0.9067712",
    claimId: "CLM-2026-04-2643-OE",
    submittedAt: "2026-04-22 14:11 UTC",
    submittedBy: "M. Reyes (Walmart Trade Ops)",
    narrative:
      "Executed the contracted Q2 OREO end-cap at the head of the cookie/cracker aisle for the full promotional window. Photo taken 2026-04-19, 11:42 local. Requesting full settlement of 30 HBAR.",
    photoCaption: "[ proof photo · end-cap · 1920×2560 · 412 KB ]",
    photoTone: "warm",
    assessment: {
      decision: "approve",
      confidence: 0.93,
      recommended_credit_pct: 100,
      max_settlement_hbar: 30,
      criteria: [
        { requirement: "End-cap at head of cookie/cracker aisle", clause_ref: "§2.1", status: "met", observed_in_photo: "Full end-cap at an aisle head, OREO-branded.", concern: "" },
        { requirement: "Minimum 4 OREO facings", clause_ref: "§2.2", status: "met", observed_in_photo: "Five facings of OREO SKUs visible.", concern: "" },
        { requirement: "Official OREO branded header card", clause_ref: "§2.3", status: "met", observed_in_photo: "OREO header card present and legible.", concern: "" },
        { requirement: "Reasonably stocked for the window", clause_ref: "§2.4", status: "met", observed_in_photo: "Shelves well stocked.", concern: "" },
      ],
      reasoning_summary:
        "All four execution requirements are clearly met; the end-cap matches the contracted placement, facing count, and branding. Recommend full settlement.",
    },
    settlement: {
      amount_hbar: 30,
      partial_credit_pct: 100,
      max_settlement_hbar: 30,
      justification: "Full compliance — 100% credit applied against the contracted ceiling of 30 HBAR.",
    },
  },

  cadbury: {
    id: "cadbury",
    retailer: "Target",
    retailerId: "Banner-wide · National",
    promotion: "Cadbury Easter Display",
    promoSub: "Front-of-store FSDU · Mar 23 – Apr 20, 2026",
    maxHbar: 25,
    expected: "Borderline — timing proof in question",
    contractId: "0.0.9067734",
    claimId: "CLM-2026-04-TGT-CE",
    submittedAt: "2026-04-22 09:48 UTC",
    submittedBy: "J. Okonkwo (Target Merch)",
    narrative:
      "Cadbury Easter FSDU placed at the entrance zone with full Easter signage and six Creme Egg facings. Display ran the contracted window. Requesting settlement of 25 HBAR.",
    photoCaption: "[ proof photo · FSDU · 1620×2160 · 287 KB ]",
    photoTone: "rose",
    assessment: {
      decision: "request_more_evidence",
      confidence: 0.56,
      recommended_credit_pct: 0,
      max_settlement_hbar: 25,
      criteria: [
        { requirement: "Freestanding unit, front-of-store", clause_ref: "(b)", status: "met", observed_in_photo: "FSDU near an entrance zone.", concern: "" },
        { requirement: "Minimum 6 Creme Egg facings", clause_ref: "(c)", status: "met", observed_in_photo: "Six facings visible.", concern: "" },
        { requirement: "Easter-themed Cadbury signage", clause_ref: "(d)", status: "met", observed_in_photo: "Cadbury Easter header affixed.", concern: "" },
        { requirement: "Display live within the Easter window (ends Apr 20)", clause_ref: "(a)", status: "indeterminate", observed_in_photo: "No date visible in the photo.", concern: "Cannot confirm the display was live on/before Apr 20 from the image alone." },
      ],
      reasoning_summary:
        "Placement, facings, and signage are met, but the contract conditions payment on the display being live within the Easter window and the photo carries no date. Requesting a timing proof before settling.",
      evidence_requested:
        "A point-of-sale timestamp or a dated compliance report confirming the display was live on or before April 20, 2026.",
    },
    revisedAssessment: {
      decision: "partial_credit",
      confidence: 0.82,
      recommended_credit_pct: 75,
      max_settlement_hbar: 25,
      criteria: [
        { requirement: "Freestanding unit, front-of-store", clause_ref: "(b)", status: "met", observed_in_photo: "FSDU near an entrance zone.", concern: "" },
        { requirement: "Minimum 6 Creme Egg facings", clause_ref: "(c)", status: "met", observed_in_photo: "Six facings visible.", concern: "" },
        { requirement: "Easter-themed Cadbury signage", clause_ref: "(d)", status: "met", observed_in_photo: "Cadbury Easter header affixed.", concern: "" },
        { requirement: "Display live within the Easter window (ends Apr 20)", clause_ref: "(a)", status: "partial", observed_in_photo: "POS log confirms display live Apr 04 – Apr 16 (12 of 29 contracted days).", concern: "Live for 12 of 29 contracted days — pro-rate to 75%." },
      ],
      reasoning_summary:
        "Timing evidence resolves the indeterminate clause but shows the display ran 12 of 29 contracted days. Pro-rated to 75% credit.",
    },
    settlement: {
      amount_hbar: 18.75,
      partial_credit_pct: 75,
      max_settlement_hbar: 25,
      justification:
        "Partial compliance — 75% credit applied after timing was confirmed, capped at the contract maximum.",
    },
  },

  ritz: {
    id: "ritz",
    retailer: "7-Eleven",
    retailerId: "Store TX-1188 · Austin, TX",
    promotion: "RITZ Checkout Feature",
    promoSub: "Point-of-sale shelf strip · Apr 07 – May 04, 2026",
    maxHbar: 20,
    expected: "Threshold clause at risk",
    contractId: "0.0.9067798",
    claimId: "CLM-2026-04-7E-RC",
    submittedAt: "2026-04-21 22:03 UTC",
    submittedBy: "D. Patel (7-Eleven Field)",
    narrative:
      "RITZ feature executed with three facings and the contracted shelf strip. Requesting 20 HBAR.",
    photoCaption: "[ proof photo · aisle shelf · 1440×1920 · 318 KB ]",
    photoTone: "slate",
    assessment: {
      decision: "reject",
      confidence: 0.9,
      recommended_credit_pct: 0,
      max_settlement_hbar: 20,
      criteria: [
        { requirement: "Checkout-lane (point-of-sale) placement", clause_ref: "R-1", status: "unmet", observed_in_photo: "Product is on a standard grocery aisle shelf, not a checkout lane.", concern: "R-1 is a threshold condition." },
        { requirement: "Minimum 3 RITZ facings", clause_ref: "R-2", status: "met", observed_in_photo: "Three+ facings present.", concern: "" },
        { requirement: "Branded RITZ shelf strip", clause_ref: "R-3", status: "partial", observed_in_photo: "A shelf strip is present but partially obscured.", concern: "" },
      ],
      reasoning_summary:
        "Location (R-1) is a threshold requirement and is not met — the product is merchandised on a regular aisle, not at the checkout lane — so the claim is rejected regardless of facings or signage. Recorded to the audit ledger; zero paid.",
    },
    settlement: null,
  },
};

export const HASHSCAN = {
  hcsAudit: "https://hashscan.io/testnet/topic/0.0.9069962",
  htsReceipt: "https://hashscan.io/testnet/token/0.0.9069963",
  hbarXfer:
    "https://hashscan.io/testnet/transaction/0.0.9067781-1779890985-756797660",
  hcsAuditId: "0.0.9069962",
  htsReceiptId: "0.0.9069963",
  hbarXferId: "0.0.9067781-1779890985-756797660",
  operatorId: "0.0.9067781",
};

// Tool-call scripts per scenario phase (the timeline playback).
export function buildToolScript(
  s: Scenario,
  phase: "initial" | "after_evidence",
): ToolCall[] {
  if (s.id === "oreo") {
    return [
      { tool: "fetch_promotion_contract", args: `contract_id=${s.contractId}`, result: "4 clauses · placement, facings, signage, stocking" },
      { tool: "fetch_proof_photo", args: `claim_id=${s.claimId}`, result: "1920×2560 jpeg · 412 KB · EXIF intact" },
      { tool: "adjudicate_claim", args: "contract + photo", result: "decision: approve · confidence 0.93", verdict: true },
      { tool: "compute_settlement", args: "credit=100% · cap=30", result: "amount=30 HBAR" },
      { tool: "submit_topic_message", args: `topic=${HASHSCAN.hcsAuditId}`, result: "sequence #41,892 · consensus 14:23:14" },
      { tool: "mint_fungible_token", args: `token=${HASHSCAN.htsReceiptId}`, result: "30 PRMP minted to operator" },
      { tool: "transfer_hbar", args: `to=${s.contractId} · amount=30`, result: "tx accepted · 0.0.9067781..." },
    ];
  }
  if (s.id === "cadbury") {
    if (phase === "after_evidence") {
      return [
        { tool: "validate_evidence_reply", args: "POS timestamps · Apr 04–16", result: "ingested · 13 records" },
        { tool: "adjudicate_claim", args: "contract + photo + timing", result: "decision: partial_credit · confidence 0.82", verdict: true },
        { tool: "compute_settlement", args: "credit=75% · cap=25", result: "amount=18.75 HBAR" },
        { tool: "submit_topic_message", args: `topic=${HASHSCAN.hcsAuditId}`, result: "sequence #41,901 · consensus 14:31:02" },
        { tool: "mint_fungible_token", args: `token=${HASHSCAN.htsReceiptId}`, result: "18.75 PRMP minted to operator" },
        { tool: "transfer_hbar", args: `to=${s.contractId} · amount=18.75`, result: "tx accepted · 0.0.9067781..." },
      ];
    }
    return [
      { tool: "fetch_promotion_contract", args: `contract_id=${s.contractId}`, result: "4 clauses · window, placement, facings, signage" },
      { tool: "fetch_proof_photo", args: `claim_id=${s.claimId}`, result: "1620×2160 jpeg · 287 KB · EXIF stripped" },
      { tool: "adjudicate_claim", args: "contract + photo", result: "decision: request_more_evidence · confidence 0.56", verdict: true },
    ];
  }
  return [
    { tool: "fetch_promotion_contract", args: `contract_id=${s.contractId}`, result: "3 clauses · placement (threshold), facings, signage" },
    { tool: "fetch_proof_photo", args: `claim_id=${s.claimId}`, result: "1440×1920 jpeg · 318 KB · EXIF intact" },
    { tool: "adjudicate_claim", args: "contract + photo", result: "decision: reject · confidence 0.90", verdict: true },
    { tool: "submit_topic_message", args: `topic=${HASHSCAN.hcsAuditId}`, result: "sequence #41,887 · zero-pay recorded" },
  ];
}
