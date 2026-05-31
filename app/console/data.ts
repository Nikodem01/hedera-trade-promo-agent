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

const FEATURED_CONTRACT = `CO-OPERATIVE MARKETING SCHEDULE — SEASONAL FLOOR DISPLAY
Between Mondelez International (the "Supplier") and Woolworths Group (the "Merchant")
Re: Cadbury Easter 2026 Freestanding Seasonal Display
Schedule reference: WOW/CADB/EAST-2026

(a)  Display window. The seasonal display shall be live and maintained on the sales
     floor for the full four-week Easter selling period — March 23 through April 20,
     2026 inclusive. Settlement is conditional on the Merchant demonstrating the
     duration the display was live within this window; a display live for only part of
     the window is settled proportionately under clause (f), not in full.

(b)  Location. The feature shall be presented on a freestanding seasonal display unit
     (FSDU), distinct from plain in-line gondola shelving. A high-traffic position
     (actionway, end-of-aisle, or entrance zone) is preferred.

(c)  Product presentation. A prominent presentation of the Cadbury Easter range
     (e.g. Creme Egg, Caramel, or other Cadbury Easter egg lines) on or about the unit.

(d)  Theming. Easter-themed signage bearing the Cadbury mark must be affixed to the unit.

(e)  Evidence. The Merchant shall provide an in-store photograph and a brief narrative.
     Where the photograph alone does not establish how long the display was live within
     the window in (a) — for example where no date is visible — the Supplier may request
     supplementary proof of timing (e.g. a point-of-sale timestamp or a dated compliance
     report) before settling.

(f)  Consideration. Subject to verification, the Supplier shall remit a co-operative
     marketing fee of up to 25 HBAR (testnet demonstration denomination) for a display
     live across the full window in (a). For partial fulfilment, the fee is pro-rated by
     the share of the four-week window the display was verifiably live (e.g. three of the
     four contracted weeks settles at 75%).
`;

/**
 * REAL captured run (Hedera testnet, 2026-05-31 07:20:22 UTC) — replaces the former scaffold.
 * Every on-chain value resolves on HashScan: pass-1 + pass-2 commitments anchored to HCS
 * (final seq 57), settlement schedule 0.0.9104144 executed (18.75 pUSDC), attestation
 * NFT serial 4. Captured via POST /api/capture (dev-only; 403 on public deploy).
 * Model + chain values are verbatim; only display labels (claimId/contractId/submittedAt/
 * submittedBy) frame the demo, and pass-1 credit% is shown as 0 (no credit until evidence).
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
  narrative: "Cadbury Easter FSDU placed in a front-of-store actionway with full Easter signage and a prominent Creme Egg presentation. The display ran across the Easter selling period. Requesting settlement of the co-op marketing fee.",
  imageRef: "Cadbury-Woolworths-Easter-POS-Unit_1.jpg",
  assessment: {
    decision: "request_more_evidence",
    confidence: 0.95,
    recommended_credit_pct: 0,
    max_settlement_hbar: 25,
    criteria: [
      {
        requirement: "Display window: March 23 through April 20, 2026.",
        clause_ref: "Section (a)",
        status: "indeterminate",
        observed_in_photo: "The photograph does not contain a date, timestamp, or any contextual marker to verify the date of capture or the duration the display was maintained.",
        concern: "The critical requirement to verify the full four-week duration cannot be confirmed from a static image without a timestamp."
      },
      {
        requirement: "Location: Freestanding seasonal display unit (FSDU).",
        clause_ref: "Section (b)",
        status: "met",
        observed_in_photo: "A circular freestanding display unit is positioned in the actionway, distinct from the adjacent in-line gondola shelving.",
        concern: "",
        box: [424, 386, 932, 601]
      },
      {
        requirement: "Product presentation: Prominent presentation of Cadbury Easter range.",
        clause_ref: "Section (c)",
        status: "met",
        observed_in_photo: "Cadbury Easter product is visible on the shelves of the FSDU and prominently displayed on the adjacent gondola unit.",
        concern: "",
        box: [442, 401, 560, 582]
      },
      {
        requirement: "Theming: Easter-themed signage with Cadbury mark.",
        clause_ref: "Section (d)",
        status: "met",
        observed_in_photo: "The FSDU features a rabbit topper and 'Salted Caramel' signage containing the Cadbury logo, which satisfies the Easter theming and branding requirement.",
        concern: "",
        box: [277, 437, 335, 497]
      }
    ],
    reasoning_summary: "The retailer successfully fulfilled the visual requirements, including the placement of an FSDU in a high-traffic zone, prominent Cadbury Easter branding, and product presentation. However, the contract specifically requires proof of the display's duration across the April 2026 window. Since the submitted photo lacks a date or timestamp, the duration cannot be verified. Compliance is indeterminate for the timing requirement per Clause (a).",
    evidence_requested: "Please provide a dated compliance report, a store system timestamp, or a secondary photograph from a different date within the promotional window to confirm the display was maintained for the required duration."
  },
  review: { agrees: true, concern: "none", recommended_action: "accept" },
  citations: [
    { ref: "Section (a)", verified: true },
    { ref: "Section (b)", verified: true },
    { ref: "Section (c)", verified: true },
    { ref: "Section (d)", verified: true }
  ],
  evidenceReply: "Point-of-sale scan log confirms the display planogram went live on March 30, 2026 — one week into the contracted window — and remained live through end of day April 20, 2026: three of the four contracted weeks. Signed store compliance report dated April 20, 2026 attached.",
  revisedAssessment: {
    decision: "partial_credit",
    confidence: 1,
    recommended_credit_pct: 75,
    max_settlement_hbar: 25,
    criteria: [
      {
        requirement: "Live for full 4-week window (March 23 - April 20, 2026)",
        clause_ref: "Section (a)",
        status: "partial",
        observed_in_photo: "The retailer admits, and POS data confirms, the display was live from March 30, 2026, to April 20, 2026.",
        concern: "The display was missing for the first week of the contracted window (March 23 - March 29).",
        box: [207, 375, 966, 608]
      },
      {
        requirement: "Freestanding seasonal display unit (FSDU)",
        clause_ref: "Section (b)",
        status: "met",
        observed_in_photo: "A circular freestanding display unit is positioned in the actionway.",
        concern: "",
        box: [207, 375, 966, 608]
      },
      {
        requirement: "Prominent presentation of Cadbury Easter range",
        clause_ref: "Section (c)",
        status: "met",
        observed_in_photo: "The display unit is stocked with Cadbury branded Easter products.",
        concern: "",
        box: [207, 375, 966, 608]
      },
      {
        requirement: "Easter-themed signage bearing the Cadbury mark",
        clause_ref: "Section (d)",
        status: "met",
        observed_in_photo: "The display unit features 'Salted Caramel' signage with visible Cadbury/Dairy Milk branding.",
        concern: "",
        box: [433, 436, 545, 563]
      }
    ],
    reasoning_summary: "The retailer has provided photographic evidence of the compliant FSDU installation and followed up with POS data and a compliance report confirming the display was live from March 30, 2026, to April 20, 2026. This equates to 3 out of the 4 contracted weeks. Pursuant to Clause (f), the 25 HBAR maximum settlement is pro-rated at 75% for partial fulfillment, resulting in a payment of 18.75 HBAR."
  },
  settlement: {
    amount_hbar: 18.75,
    partial_credit_pct: 75,
    max_settlement_hbar: 25,
    justification: "Partial compliance — 75% credit applied, capped at the contract maximum (25 HBAR) and the 50 HBAR safety cap."
  },
  amountPusdc: 18.75,
  scheduleId: "0.0.9104144",
  nftSerial: "4",
  commitment: "22323729f4d0b504f333c6b22a93b51870966c2a9f27fd1994375dbe268ed04e",
  imageFp: "80d8d9c333bbd52f90c63600bef0dc1b18429dfcf3113988db5681a2cf2bbfd4",
  seq: 57,
  consensusTs: "2026-05-31 07:20:22 UTC",
  model: "gemini-3.1-flash-lite-preview",
  disclosure: {
    commitment: "22323729f4d0b504f333c6b22a93b51870966c2a9f27fd1994375dbe268ed04e",
    revealed: [
      {
        label: "decision",
        value: "partial_credit",
        salt: "edcc1f3e78e0909dcaf319fe07550f51",
        proof: [
          { hash: "5eb2433baa5bcfed10978af5c212b25998428b8d1f912b65e2313a922c5e10d2", right: false },
          { hash: "2abd6e5937efaa7c6e1b84ae2c6c108d7006c9d00c212e4010e1b595cfe7d24e", right: false },
          { hash: "b05cab60a4ffef7847d4b11b2d2fdb22f105d56cf53b44fb3550faf5c4268551", right: false },
          { hash: "480c63e62e280271d1f0128b293299450e0ef71de3749e2c0504e0d1a283e497", right: true },
          { hash: "4157840c8118e7b42b9c288516188659e42ba26a4b02d5a5132f6e5c3c8e6757", right: true }
        ]
      },
      {
        label: "recommended_credit_pct",
        value: "75",
        salt: "514f02f487d29cb2e3899788259207eb",
        proof: [
          { hash: "6e1f7d4cf6e868818c2fd00d36b8b995692692a33c95d9a47aba3181a15546c5", right: false },
          { hash: "2cae119ee2f36c92793d133549c1bd4298a040844da3058c9d280c3a49d9e2b9", right: true },
          { hash: "16dd80610809564ac16b655a24c05401c0e326146b7c3790753e3e0313cf880a", right: true },
          { hash: "e1752a452d8936a4b59a4f261b4756c53e920911e9a9330722f01d1631aae95a", right: false },
          { hash: "4157840c8118e7b42b9c288516188659e42ba26a4b02d5a5132f6e5c3c8e6757", right: true }
        ]
      },
      {
        label: "max_settlement_hbar",
        value: "25",
        salt: "fbc4777edfb0f92a3016719168503cc6",
        proof: [
          { hash: "16fb84e04ea66376a2c38e78d128a64f74a78e111b0a067ee5903530d941ac82", right: true },
          { hash: "e7ad21c0e44062f0df95d7eddacc5f91ecee9b92780134693de0cdea81835032", right: false },
          { hash: "16dd80610809564ac16b655a24c05401c0e326146b7c3790753e3e0313cf880a", right: true },
          { hash: "e1752a452d8936a4b59a4f261b4756c53e920911e9a9330722f01d1631aae95a", right: false },
          { hash: "4157840c8118e7b42b9c288516188659e42ba26a4b02d5a5132f6e5c3c8e6757", right: true }
        ]
      }
    ]
  }
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
