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
const HCS_AUDIT_ID = "0.0.9104996";
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
Between Brand_M (the "Supplier") and Retailer_W (the "Merchant")
Re: Cadbury Easter 2026 Freestanding Seasonal Display
Schedule reference: RW/CADB/EAST-2026

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
 * REAL captured run (Hedera testnet, 2026-05-31 10:23:02 UTC) — replaces the former scaffold.
 * Every on-chain value resolves on HashScan: pass-1 + pass-2 commitments anchored to HCS
 * on the clean Week 2 topic (final seq 2), settlement schedule 0.0.9105009 executed
 * (18.75 pUSDC), attestation NFT serial 5. Captured via POST /api/capture
 * (dev-only; 403 on public deploy).
 * Model + chain values are verbatim; only display labels (claimId/contractId/submittedAt/
 * submittedBy) frame the demo, and pass-1 credit% is shown as 0 (no credit until evidence).
 */
export const FEATURED: FeaturedClaim = {
  retailer: "Retailer_W",
  retailerId: "Banner-wide · anonymized",
  promotion: "Brand_C Seasonal FSDU",
  promoSub: "Front-of-store seasonal display · Mar 23 - Apr 20, 2026",
  claimId: "CLM-2026-05-CLEAN",
  contractId: "0.0.9104996",
  submittedAt: "2026-05-31 10:23 UTC",
  submittedBy: "Analyst_R (retail execution)",
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
        requirement: "Display live between March 23 – April 20, 2026",
        clause_ref: "Section (a)",
        status: "indeterminate",
        observed_in_photo: "The photo clearly shows the display is set up, but there is no date stamp or visible metadata to confirm the specific timing within the window.",
        concern: "The photo lacks a timestamp; the contract requires verification of duration."
      },
      {
        requirement: "Freestanding seasonal display unit (FSDU)",
        clause_ref: "Section (b)",
        status: "met",
        observed_in_photo: "A prominent circular freestanding display unit is positioned in the actionway.",
        concern: "",
        box: [
          180,
          385,
          930,
          600
        ]
      },
      {
        requirement: "Prominent Cadbury Easter range presentation",
        clause_ref: "Section (c)",
        status: "met",
        observed_in_photo: "Cadbury Easter egg products are clearly stocked on the FSDU shelves.",
        concern: "",
        box: [
          420,
          400,
          630,
          590
        ]
      },
      {
        requirement: "Easter-themed signage with Cadbury mark",
        clause_ref: "Section (d)",
        status: "met",
        observed_in_photo: "Branded Cadbury signage featuring Easter thematic elements is displayed on the FSDU header.",
        concern: "",
        box: [
          340,
          430,
          520,
          560
        ]
      }
    ],
    reasoning_summary: "The retailer has successfully executed the physical setup of the display, meeting location, product presentation, and theming requirements (Sections b, c, d). However, per Section (a) and (e), the photo does not confirm the display was live during the contracted window. Consequently, the claim is put on hold pending temporal verification.",
    evidence_requested: "Please provide a point-of-sale timestamp, a dated compliance report, or an additional photo containing a visible date (e.g., a store receipt or newspaper) to verify the display was active during the March 23 – April 20, 2026 window."
  },
  review: {
    agrees: true,
    concern: "none",
    recommended_action: "accept"
  },
  citations: [
    {
      ref: "Section (a)",
      verified: true
    },
    {
      ref: "Section (b)",
      verified: true
    },
    {
      ref: "Section (c)",
      verified: true
    },
    {
      ref: "Section (d)",
      verified: true
    }
  ],
  evidenceReply: "Point-of-sale scan log confirms the display planogram went live on March 30, 2026 — one week into the contracted window — and remained live through end of day April 20, 2026: three of the four contracted weeks. Signed store compliance report dated April 20, 2026 attached.",
  revisedAssessment: {
    decision: "partial_credit",
    confidence: 1,
    recommended_credit_pct: 75,
    max_settlement_hbar: 25,
    criteria: [
      {
        requirement: "Display live for the full four-week period (March 23 – April 20, 2026).",
        clause_ref: "Section (a), (f)",
        status: "partial",
        observed_in_photo: "The photo does not contain a date stamp. Follow-up POS scan logs confirm the display was live from March 30, 2026 to April 20, 2026 (3 weeks).",
        concern: "The display was not active for the full contracted window of four weeks; it was active for three weeks."
      },
      {
        requirement: "Freestanding seasonal display unit (FSDU).",
        clause_ref: "Section (b)",
        status: "met",
        observed_in_photo: "A circular, multi-tiered FSDU is positioned in the center of the aisle.",
        concern: "",
        box: [
          233,
          386,
          960,
          603
        ]
      },
      {
        requirement: "Prominent presentation of Cadbury Easter range.",
        clause_ref: "Section (c)",
        status: "met",
        observed_in_photo: "Cadbury branded Easter products are clearly visible on the FSDU tiers.",
        concern: "",
        box: [
          255,
          417,
          526,
          563
        ]
      },
      {
        requirement: "Easter-themed signage bearing the Cadbury mark.",
        clause_ref: "Section (d)",
        status: "met",
        observed_in_photo: "Easter-themed signage featuring the Cadbury logo and 'Salted Caramel' branding is attached to the unit.",
        concern: "",
        box: [
          435,
          436,
          532,
          562
        ]
      }
    ],
    reasoning_summary: "The retailer successfully executed the display requirements, including the use of an FSDU, proper product placement, and themed signage. However, as established by the point-of-sale scan log and compliance report provided in the follow-up evidence, the display was only active for three weeks of the four-week contract window. Pursuant to clause (a) and the pro-rata provision in clause (f), the settlement is adjusted to 75% of the maximum 25 HBAR, resulting in a payment of 18.75 HBAR."
  },
  settlement: {
    amount_hbar: 18.75,
    partial_credit_pct: 75,
    max_settlement_hbar: 25,
    justification: "Partial compliance — 75% credit applied, capped at the contract maximum (25 HBAR) and the 50 HBAR safety cap."
  },
  amountPusdc: 18.75,
  scheduleId: "0.0.9105009",
  nftSerial: "5",
  commitment: "a0d2162ee059c7b27009680b4d98827e7e160d29ff76b7884a9c8abf679238bf",
  imageFp: "80d8d9c333bbd52f90c63600bef0dc1b18429dfcf3113988db5681a2cf2bbfd4",
  seq: 2,
  consensusTs: "2026-05-31 10:23:02 UTC",
  model: "gemini-3.1-flash-lite-preview",
  disclosure: {
    commitment: "a0d2162ee059c7b27009680b4d98827e7e160d29ff76b7884a9c8abf679238bf",
    revealed: [
      {
        label: "decision",
        value: "partial_credit",
        salt: "ad3135d6b1c280abd9bf240c151c1d4f",
        proof: [
          {
            hash: "be6416a50dee1f5bb250fc5bbea21326d124c73db87fde634ae91856a448069f",
            right: false
          },
          {
            hash: "a99fc6c6bd14940de402019241a8d7bf6c89d4363c9330dba3ff6e1cd6712334",
            right: false
          },
          {
            hash: "1b82f96792324a10712e8fc611397fdf42c4e806dd09f6c53176dec5a4bdcc31",
            right: false
          },
          {
            hash: "99b15c69aba4d40fca0665d05f88e8f9944193814618f6234781aa7667fd8066",
            right: true
          },
          {
            hash: "cd2b96cf89ac5d18954037d92c16037f68d70b587d3488ef29a09d7683cdc473",
            right: true
          }
        ]
      },
      {
        label: "recommended_credit_pct",
        value: "75",
        salt: "3b5bf981d71b1babf95a165de177e893",
        proof: [
          {
            hash: "212bf95e9d0cc381f7b0670611f97a82c2b7114e8a9cb8219cdcac94976eb21d",
            right: false
          },
          {
            hash: "2acbc4162cc7cbc67c7ec75ee778c6b29f63fe8167fbe10ba68afd4c0369b03f",
            right: true
          },
          {
            hash: "e8e04a2c2c28c893fee80d3d5bb81e8c887ddc85166db0aa97e4b4e701ee4272",
            right: true
          },
          {
            hash: "ef354d09d1106f25df8696bf962e481e6b9056b5b0a694f9b36efe8502049165",
            right: false
          },
          {
            hash: "cd2b96cf89ac5d18954037d92c16037f68d70b587d3488ef29a09d7683cdc473",
            right: true
          }
        ]
      },
      {
        label: "max_settlement_hbar",
        value: "25",
        salt: "e63dc3a0c3481f3a0f232fe0162ffcb6",
        proof: [
          {
            hash: "bc11ed15c352f3235eebfe9ee9dd34b05b4b8c6d0d6e1b3578793a856087daec",
            right: true
          },
          {
            hash: "97f353e86290c7b725df20e6b44911181609a18ea8cbdb268b97d020689a6c7d",
            right: false
          },
          {
            hash: "e8e04a2c2c28c893fee80d3d5bb81e8c887ddc85166db0aa97e4b4e701ee4272",
            right: true
          },
          {
            hash: "ef354d09d1106f25df8696bf962e481e6b9056b5b0a694f9b36efe8502049165",
            right: false
          },
          {
            hash: "cd2b96cf89ac5d18954037d92c16037f68d70b587d3488ef29a09d7683cdc473",
            right: true
          }
        ]
      },
      {
        label: "reasoning_summary",
        value: "The retailer successfully executed the display requirements, including the use of an FSDU, proper product placement, and themed signage. However, as established by the point-of-sale scan log and compliance report provided in the follow-up evidence, the display was only active for three weeks of the four-week contract window. Pursuant to clause (a) and the pro-rata provision in clause (f), the settlement is adjusted to 75% of the maximum 25 HBAR, resulting in a payment of 18.75 HBAR.",
        salt: "8130ca90ff4b976cbd3eeaeb4b104b76",
        proof: [
          {
            hash: "5c2160af37670d9cb439f2af0d21ae6994e61116638fb276321922e5fd3249ee",
            right: false
          },
          {
            hash: "97f353e86290c7b725df20e6b44911181609a18ea8cbdb268b97d020689a6c7d",
            right: false
          },
          {
            hash: "e8e04a2c2c28c893fee80d3d5bb81e8c887ddc85166db0aa97e4b4e701ee4272",
            right: true
          },
          {
            hash: "ef354d09d1106f25df8696bf962e481e6b9056b5b0a694f9b36efe8502049165",
            right: false
          },
          {
            hash: "cd2b96cf89ac5d18954037d92c16037f68d70b587d3488ef29a09d7683cdc473",
            right: true
          }
        ]
      }
    ]
  }
};

/** The agent's tool calls for the featured claim, by phase — the plugin in action. */
export function featuredToolScript(phase: "initial" | "after_evidence"): ToolCall[] {
  if (phase === "after_evidence") {
    return [
      { tool: "adjudicate_claim", args: "contract + photo + timing evidence", result: `decision: partial_credit · HCS seq #${FEATURED.seq}`, verdict: true },
      { tool: "compute_settlement", args: "credit=75% · cap=25", result: "amount=18.75 pUSDC" },
      { tool: "propose_settlement", args: `commit ${FEATURED.commitment.slice(0, 12)}…`, result: `schedule ${FEATURED.scheduleId} · awaiting 2 signatures` },
    ];
  }
  return [
    { tool: "adjudicate_claim", args: "contract + proof photo + narrative", result: "decision: request_more_evidence · confidence 0.95 · HCS anchored", verdict: true },
  ];
}
