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
    promo: "Q2 OREO Floor Display",
    imageRef: "oreo.jpg",
    narrative:
      "Freestanding OREO display tower installed beside the dairy case for all of May, with the branded OREO header card and well over four facings across the unit, fully stocked. Photo attached.",
    expect: "clean approve",
  },
  {
    id: "02",
    file: "02-cadbury-easter-display.txt",
    retailer: "Woolworths",
    promo: "Cadbury Easter Display",
    imageRef: "Cadbury-Woolworths-Easter-POS-Unit_1.jpg",
    narrative:
      "Freestanding Cadbury Easter display unit set up in a main grocery actionway, with Easter-themed Cadbury signage and a prominent presentation of the Cadbury Easter egg range. Photo attached.",
    expect: "borderline → asks for date proof",
  },
  {
    id: "03",
    file: "03-ritz-checkout-shelf.txt",
    retailer: "7-Eleven TX-1188",
    promo: "RITZ Checkout Feature",
    imageRef: "licensed-image-ritz.jpg",
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
