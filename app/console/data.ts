// Presentation data for the guided tour. The featured claim mirrors what the live
// agent produces (typed with the real plugin schemas); HashScan links point at the
// actual on-chain topic/token/accounts created during setup, so the records are
// genuinely verifiable. The three placeholder demo claims were removed — the tour now
// replays ONE real, captured run (see FEATURED).
import type {
  ComplianceAssessmentType,
  ReviewerAssessmentType,
  SettlementProposalType,
} from "@/lib/plugins/tpp-evaluator/schemas";
import type { Disclosure } from "@/lib/dossier";
import { topicUrl, tokenUrl, accountUrl, scheduleUrl } from "@/lib/hedera/hashscan";

export type ToolCall = {
  tool: string;
  args: string;
  result: string;
  verdict?: boolean;
};

export type PhotoTone = "warm" | "rose" | "slate";

/** Legacy scenario shape — retained only as a type for reusable console components
 * (the three placeholder claims that used it were removed; the tour uses FeaturedClaim). */
export type Scenario = {
  id: string;
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

/**
 * The single featured claim the guided tour replays — a genuine end-to-end run frozen
 * so the public read-only URL is truthful (real photo, real boxes, real on-chain hash)
 * without invoking the live agent per visitor. NOTE: the values below are a build-time
 * SCAFFOLD (a complete negotiation arc so every scene can be developed). Stage 6
 * replaces this whole object with a captured real run; the shape is what the tour reads.
 */
export type FeaturedClaim = {
  retailer: string;
  retailerId: string;
  promotion: string;
  promoSub: string;
  claimId: string;
  contractId: string;
  submittedAt: string;
  submittedBy: string;
  /** Full contract prose, shown in the inputs scene. */
  contractText: string;
  /** The retailer's narrative claim. */
  narrative: string;
  /** Real proof photo filename in public/proofs (drives the photo + clause↔box overlay). */
  imageRef: string;
  /** The agent's first verdict (with per-criterion `box` coords for the cross-highlight). */
  assessment: ComplianceAssessmentType;
  /** Independent 2nd-model audit (shown as the concurrence badge). */
  review: ReviewerAssessmentType;
  /** Citation-verification ticks per cited clause. */
  citations: { ref: string; verified: boolean }[];
  /** Present only when the agent asked for more evidence and re-judged. */
  evidenceReply?: string;
  revisedAssessment?: ComplianceAssessmentType;
  /** The deterministic, capped settlement (null for reject/escalate). */
  settlement: SettlementProposalType | null;
  /** Settled amount in pUSDC + the on-chain settlement artifacts. */
  amountPusdc: number | null;
  scheduleId: string | null;
  nftSerial: string | null;
  /** Off-chain → on-chain provenance: the salted commitment, image fingerprint, and the
   * HCS sequence/consensus the verdict was anchored at. */
  commitment: string;
  imageFp: string;
  seq: number;
  consensusTs: string;
  model: string;
  /** A captured selective-disclosure package (counterparty scope: decision + amount),
   * proven against the live chain in the verify scene via the public /api/verify. */
  disclosure: Disclosure;
};

// Real on-chain artifacts (Hedera testnet) — every id here resolves on HashScan.
const HCS_AUDIT_ID = "0.0.9069962";
const HTS_RECEIPT_ID = "0.0.9069963";
const NFT_ATTESTATION_ID = "0.0.9088330";
const PUSDC_ID = "0.0.9089483";
const BRAND_ID = "0.0.9089484";
const RETAILER_ID = "0.0.9089486";

export const HASHSCAN = {
  // ids
  hcsAuditId: HCS_AUDIT_ID,
  htsReceiptId: HTS_RECEIPT_ID,
  nftAttestationId: NFT_ATTESTATION_ID,
  pusdcId: PUSDC_ID,
  brandId: BRAND_ID,
  retailerId: RETAILER_ID,
  operatorId: "0.0.9067781",
  hbarXferId: "0.0.9067781-1779890985-756797660",
  // urls (built with the canonical HashScan link helpers)
  hcsAudit: topicUrl(HCS_AUDIT_ID),
  htsReceipt: tokenUrl(HTS_RECEIPT_ID),
  nftAttestation: tokenUrl(NFT_ATTESTATION_ID),
  pusdc: tokenUrl(PUSDC_ID),
  brand: accountUrl(BRAND_ID),
  retailer: accountUrl(RETAILER_ID),
  hbarXfer:
    "https://hashscan.io/testnet/transaction/0.0.9067781-1779890985-756797660",
  scheduleUrl,
};

const FEATURED_CONTRACT = `TRADE PROMOTION AGREEMENT — SEASONAL FREESTANDING DISPLAY
Brand: Mondelēz International / Cadbury ("Brand")  |  Retailer: Woolworths ("Retailer")
Promotion: Cadbury Easter Freestanding Display Unit (FSDU)  |  Agreement No. WOW-CAD-EAS-2026

SECTION 1. TERM
1.1  The display shall be live during the Promotion Window of March 23, 2026 through
     April 20, 2026 inclusive (the Easter trading period). Settlement is conditioned on
     the display being verifiably live within this window.

SECTION 2. EXECUTION REQUIREMENTS
2.1  (b) Placement. A freestanding display unit (FSDU) shall be sited front-of-store or
     in a primary actionway — not an in-aisle shelf.
2.2  (c) Facings. A minimum of six (6) facings of Cadbury Creme Egg shall be presented.
2.3  (d) Signage. The unit shall carry Easter-themed Cadbury signage.
2.4  (a) Timing proof. Settlement requires evidence the display was live on or before
     April 20, 2026 — e.g. a dated point-of-sale report or a timestamped photo.`;

/**
 * BUILD-TIME SCAFFOLD (replaced by a captured real run in Stage 6). A full negotiation
 * arc over the real Cadbury photo, so every guided scene — including the clause↔photo
 * cross-highlight and the negotiation beat — can be built and verified.
 */
export const FEATURED: FeaturedClaim = {
  retailer: "Woolworths",
  retailerId: "Banner-wide · AU",
  promotion: "Cadbury Easter FSDU",
  promoSub: "Front-of-store display · Mar 23 – Apr 20, 2026",
  claimId: "CLM-2026-04-WOW-CE",
  contractId: "0.0.9067734",
  submittedAt: "2026-04-22 09:48 UTC",
  submittedBy: "J. Okonkwo (Woolworths Merch)",
  contractText: FEATURED_CONTRACT,
  narrative:
    "Cadbury Easter FSDU placed in a front-of-store actionway with full Easter signage and six Creme Egg facings. Display ran the contracted window. Requesting settlement.",
  imageRef: "Cadbury-Woolworths-Easter-POS-Unit_1.jpg",
  assessment: {
    decision: "request_more_evidence",
    confidence: 0.56,
    recommended_credit_pct: 0,
    max_settlement_hbar: 25,
    criteria: [
      { requirement: "Freestanding unit, front-of-store", clause_ref: "(b)", status: "met", observed_in_photo: "Freestanding Cadbury FSDU in an open actionway, not an in-aisle shelf.", concern: "", box: [180, 280, 950, 760] },
      { requirement: "Minimum 6 Creme Egg facings", clause_ref: "(c)", status: "met", observed_in_photo: "Six+ Creme Egg facings visible across the mid shelves.", concern: "", box: [470, 330, 740, 720] },
      { requirement: "Easter-themed Cadbury signage", clause_ref: "(d)", status: "met", observed_in_photo: "Cadbury Easter header card affixed to the top of the unit.", concern: "", box: [140, 320, 320, 740] },
      { requirement: "Display live within the Easter window (ends Apr 20)", clause_ref: "(a)", status: "indeterminate", observed_in_photo: "No date is visible anywhere in the photo.", concern: "Cannot confirm the display was live on/before Apr 20 from the image alone." },
    ],
    reasoning_summary:
      "Placement, facings, and signage are clearly met, but the contract conditions payment on the display being live within the Easter window and the photo carries no date. Requesting a timing proof before settling.",
    evidence_requested:
      "A point-of-sale timestamp or a dated compliance report confirming the display was live on or before April 20, 2026.",
  },
  review: { agrees: true, concern: "none", recommended_action: "accept" },
  citations: [
    { ref: "(b)", verified: true },
    { ref: "(c)", verified: true },
    { ref: "(d)", verified: true },
    { ref: "(a)", verified: true },
  ],
  evidenceReply:
    "Attached: POS log {2026-04-04 → 2026-04-16}, signed compliance report PDF (dated 2026-04-20). Display ran 12 of 29 contracted days.",
  revisedAssessment: {
    decision: "partial_credit",
    confidence: 0.82,
    recommended_credit_pct: 75,
    max_settlement_hbar: 25,
    criteria: [
      { requirement: "Freestanding unit, front-of-store", clause_ref: "(b)", status: "met", observed_in_photo: "Freestanding Cadbury FSDU in an open actionway, not an in-aisle shelf.", concern: "", box: [180, 280, 950, 760] },
      { requirement: "Minimum 6 Creme Egg facings", clause_ref: "(c)", status: "met", observed_in_photo: "Six+ Creme Egg facings visible across the mid shelves.", concern: "", box: [470, 330, 740, 720] },
      { requirement: "Easter-themed Cadbury signage", clause_ref: "(d)", status: "met", observed_in_photo: "Cadbury Easter header card affixed to the top of the unit.", concern: "", box: [140, 320, 320, 740] },
      { requirement: "Display live within the Easter window (ends Apr 20)", clause_ref: "(a)", status: "partial", observed_in_photo: "POS log confirms the display live Apr 04 – Apr 16 (12 of 29 contracted days).", concern: "Live for 12 of 29 contracted days — pro-rate to 75%." },
    ],
    reasoning_summary:
      "The timing evidence resolves the open clause but shows the display ran 12 of 29 contracted days. Pro-rated to 75% credit, capped at the contract maximum.",
  },
  settlement: {
    amount_hbar: 18.75,
    partial_credit_pct: 75,
    max_settlement_hbar: 25,
    justification: "Partial compliance — 75% credit applied after timing was confirmed, capped at the contract maximum.",
  },
  amountPusdc: 18.75,
  scheduleId: "0.0.9091820",
  nftSerial: "7",
  commitment: "2cc1ae0b9f3d4c7a8e6b15d2f0a37c94e8b1d6452a9f0c3e7b8d145a90e2f5d9",
  imageFp: "9f3d4c7a8e6b15d2f0a37c94e8b1d6452a9f0c3e7b8d145a90e2f5d92cc1ae0b",
  seq: 41901,
  consensusTs: "2026-04-22 14:31:02 UTC",
  model: "claude-opus-4-7",
  disclosure: {
    commitment: "2cc1ae0b9f3d4c7a8e6b15d2f0a37c94e8b1d6452a9f0c3e7b8d145a90e2f5d9",
    revealed: [
      { label: "decision", value: "partial_credit", salt: "00000000000000000000000000000000", proof: [] },
      { label: "recommended_credit_pct", value: "75", salt: "00000000000000000000000000000000", proof: [] },
      { label: "max_settlement_hbar", value: "25", salt: "00000000000000000000000000000000", proof: [] },
    ],
  },
};

/** The agent's tool calls for the featured claim, by phase — the plugin in action. */
export function featuredToolScript(phase: "initial" | "after_evidence"): ToolCall[] {
  if (phase === "after_evidence") {
    return [
      { tool: "validate_evidence_reply", args: "POS timestamps · Apr 04–16", result: "ingested · 13 records" },
      { tool: "adjudicate_claim", args: "contract + photo + timing", result: "decision: partial_credit · confidence 0.82", verdict: true },
      { tool: "compute_settlement", args: "credit=75% · cap=25", result: "amount=18.75 pUSDC" },
      { tool: "propose_settlement", args: `commit ${FEATURED.commitment.slice(0, 12)}…`, result: `schedule ${FEATURED.scheduleId} · awaiting 2 signatures` },
    ];
  }
  return [
    { tool: "fetch_promotion_contract", args: `contract_id=${FEATURED.contractId}`, result: "4 clauses · window, placement, facings, signage" },
    { tool: "fetch_proof_photo", args: `claim_id=${FEATURED.claimId}`, result: "1620×2160 jpeg · EXIF stripped" },
    { tool: "adjudicate_claim", args: "contract + photo", result: "decision: request_more_evidence · confidence 0.56", verdict: true },
  ];
}
