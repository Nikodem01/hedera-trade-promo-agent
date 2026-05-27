import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Console, { type Scenario } from "./components/Console";

// Server-side scenario catalog. Contract prose is read from the fixtures so the
// client never duplicates it; the proof image + retailer narrative complete the claim.
const CATALOG = [
  {
    id: "01",
    file: "01-oreo-endcap-q2.txt",
    retailer: "Walmart #2643",
    promo: "Q2 OREO End-Cap",
    imageRef: "01-oreo-endcap-clean.jpg",
    narrative:
      "End-cap installed at the head of the cookie aisle for all of May. Four OREO facings with the branded OREO header card, fully stocked. Photo attached.",
    expect: "clean approve",
  },
  {
    id: "02",
    file: "02-cadbury-easter-display.txt",
    retailer: "Target",
    promo: "Cadbury Easter Display",
    imageRef: "02-cadbury-borderline.jpg",
    narrative:
      "Freestanding Cadbury Creme Egg display placed at the front entrance with Easter-themed Cadbury signage and six facings. Photo attached.",
    expect: "borderline → asks for date proof",
  },
  {
    id: "03",
    file: "03-ritz-checkout-shelf.txt",
    retailer: "7-Eleven TX-1188",
    promo: "RITZ Checkout Feature",
    imageRef: "03-ritz-noncompliant.jpg",
    narrative:
      "RITZ crackers merchandised with three facings and a branded shelf strip. Photo attached.",
    expect: "non-compliant → reject",
  },
];

export default async function Page() {
  const scenarios: Scenario[] = await Promise.all(
    CATALOG.map(async (s) => ({
      ...s,
      contractText: await readFile(
        join(process.cwd(), "examples", "contracts", s.file),
        "utf8",
      ).catch(() => "(contract fixture missing)"),
    })),
  );

  return <Console scenarios={scenarios} />;
}
