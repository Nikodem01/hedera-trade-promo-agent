export const LIVE_SANDBOX = {
  id: "live-sandbox-01",
  claimId: "LIVE-SANDBOX-01",
  contractId: "0.0.9104996",
  retailer: "Retailer_W",
  promotion: "Brand_O floor display",
  maxHbar: 30,
  imageRef: "image_b347ff.jpg",
  narrative:
    "Freestanding OREO display tower installed beside the dairy case for all of May, with the branded OREO header card and well over four facings across the unit, fully stocked. Photo attached.",
  contractText: `TRADE PROMOTION AGREEMENT — BRANDED FLOOR DISPLAY
Brand: Brand_M ("Brand")  |  Retailer: Retailer_W #2643 ("Retailer")
Promotion: Q2 OREO Branded Floor Display  |  Agreement No. RW-OREO-Q2-2026

SECTION 1. TERM
1.1  The promotional display shall be installed during the Promotion Window of
     May 1, 2026 through May 31, 2026 inclusive. The Retailer's written narrative
     attesting to the installation period is accepted as proof of timing for this
     Section; a dated photograph is not required.

SECTION 2. EXECUTION REQUIREMENTS
2.1  Placement. The feature shall be presented on a freestanding, OREO-branded floor
     display unit (a "sidekick" or display tower) sited in a high-traffic location —
     for example a primary actionway or adjacent to the dairy / milk case. Plain
     in-line shelf placement within the cracker aisle does not satisfy this Section.
2.2  Facings. A minimum of four (4) product facings of OREO (any SKU) shall be
     presented across the unit.
2.3  Branding. The unit shall carry the official OREO branded header card with the
     OREO wordmark clearly legible.
2.4  Stock. The unit shall be reasonably stocked (no predominantly empty shelves).

SECTION 3. PROOF OF PERFORMANCE
3.1  Retailer shall submit at least one in-store photograph of the installed display
     together with a short narrative attesting to compliance with Sections 1 and 2.

SECTION 4. SETTLEMENT
4.1  Upon verified compliance, Brand shall pay Retailer a promotion fee of up to
     30 HBAR (testnet demonstration denomination).
4.2  Partial compliance may be settled at a proportionate credit at Brand's reasonable
     determination.
`,
};

export function liveSandboxPrompt(): string {
  return (
    `LIVE SANDBOX CLAIM ${LIVE_SANDBOX.id}. Adjudicate it and prepare the proof-only Hedera artifacts.\n\n` +
    `Retailer display label: ${LIVE_SANDBOX.retailer}\n` +
    `Promotion display label: ${LIVE_SANDBOX.promotion}\n\n` +
    `CONTRACT:\n${LIVE_SANDBOX.contractText}\n\n` +
    `IMAGE_REF: ${LIVE_SANDBOX.imageRef}\n` +
    `NARRATIVE: ${LIVE_SANDBOX.narrative}`
  );
}
