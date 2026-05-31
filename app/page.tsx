import { type Scenario } from "./components/Console";
import { Shell } from "./console/Shell";
import { PUBLIC_READONLY } from "@/lib/guard";

// Compact operator fixtures. The public submission demo uses the guided flow, but
// keeping these inline means a local operator console still works without a separate
// examples directory in the public repo.
const CATALOG: Scenario[] = [
  {
    id: "01",
    file: "01-oreo-endcap-q2.txt",
    retailer: "Retailer_W #2643",
    promo: "Q2 OREO Floor Display",
    imageRef: "image_b347ff.jpg",
    narrative:
      "Freestanding OREO display tower installed beside the dairy case for all of May, with the branded OREO header card and well over four facings across the unit, fully stocked. Photo attached.",
    expect: "clean approve",
    contractText: `TRADE PROMOTION AGREEMENT — BRANDED FLOOR DISPLAY
Brand: Brand_M | Retailer: Retailer_W #2643
Promotion: Q2 OREO Branded Floor Display

1.1 Display window: May 1, 2026 through May 31, 2026 inclusive. The retailer's written narrative is accepted as proof of timing; a dated photograph is not required.
2.1 Placement: freestanding, OREO-branded floor display in a high-traffic location, including adjacent to the dairy case.
2.2 Facings: minimum four product facings of OREO across the unit.
2.3 Branding: official OREO branded header card with the OREO wordmark clearly legible.
2.4 Stock: reasonably stocked, with no predominantly empty shelves.
4.1 Settlement: up to 30 HBAR testnet demonstration denomination.`,
  },
  {
    id: "02",
    file: "02-cadbury-easter-display.txt",
    retailer: "Retailer_W",
    promo: "Cadbury Easter Display",
    imageRef: "image_a4d2fe.jpg",
    narrative:
      "Freestanding Cadbury Easter display unit set up in a main grocery actionway, with Easter-themed Cadbury signage and a prominent presentation of the Cadbury Easter egg range. Photo attached.",
    expect: "borderline → asks for date proof",
    contractText: `CO-OPERATIVE MARKETING SCHEDULE — SEASONAL FLOOR DISPLAY
Between Brand_M and Retailer_W
Re: Cadbury Easter 2026 Freestanding Seasonal Display

(a) Display window: March 23 through April 20, 2026 inclusive. The retailer must demonstrate the duration live within this window.
(b) Location: freestanding seasonal display unit in a high-traffic position.
(c) Product presentation: prominent presentation of the Cadbury Easter range on or about the unit.
(d) Theming: Easter-themed signage bearing the Cadbury mark must be affixed to the unit.
(e) Evidence: photograph plus narrative; if timing is not established, request supplementary proof.
(f) Consideration: up to 25 HBAR; partial fulfilment is pro-rated.`,
  },
  {
    id: "03",
    file: "03-ritz-checkout-shelf.txt",
    retailer: "Retailer_W TX-1188",
    promo: "RITZ Checkout Feature",
    imageRef: "image_8ad67c.jpg",
    narrative:
      "RITZ crackers merchandised with three facings and a branded shelf strip. Photo attached.",
    expect: "non-compliant → reject",
    contractText: `RETAIL EXECUTION CONTRACT — POINT-OF-SALE SHELF
Vendor: Brand_M | Operator: Retailer_W TX-1188
Program: RITZ Checkout-Lane Feature

R-1 Location: RITZ product must be merchandised on a checkout-lane shelf at the register. Standard aisle shelves do not satisfy this threshold requirement.
R-2 Facings: minimum three facings of RITZ crackers at the checkout shelf.
R-3 Signage: branded RITZ shelf strip affixed to the checkout shelf.
Payment: up to 20 HBAR for verified compliance; non-compliant claims are recorded and paid zero.`,
  },
];

export default async function Page() {
  // Seed the mode server-side so a public deploy renders the guided tour on the FIRST
  // paint (no operator-UI flash before the client /api/config fetch resolves).
  return <Shell scenarios={CATALOG} initialPublicReadonly={PUBLIC_READONLY} />;
}
