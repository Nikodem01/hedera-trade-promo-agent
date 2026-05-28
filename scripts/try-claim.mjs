// Drives one claim through the live /api/agent route and prints the streamed
// response. Usage: node scripts/try-claim.mjs [oreo|cadbury|ritz]
import { readFile } from "node:fs/promises";

const SCENARIOS = {
  oreo: { file: "01-oreo-endcap-q2.txt", retailer: "Walmart #2643", promo: "Q2 OREO End-Cap", imageRef: "oreo.jpg", narrative: "End-cap installed at the head of the cookie aisle for all of May. Four OREO facings with the branded OREO header card, fully stocked. Photo attached." },
  cadbury: { file: "02-cadbury-easter-display.txt", retailer: "Target", promo: "Cadbury Easter Display", imageRef: "Cadbury-Woolworths-Easter-POS-Unit_1.jpg", narrative: "Freestanding Cadbury Creme Egg display placed at the front entrance with Easter-themed Cadbury signage and six facings. Photo attached." },
  ritz: { file: "03-ritz-checkout-shelf.txt", retailer: "7-Eleven TX-1188", promo: "RITZ Checkout Feature", imageRef: "licensed-image-ritz.jpg", narrative: "RITZ crackers merchandised with three facings and a branded shelf strip. Photo attached." },
};

const id = process.argv[2] || "ritz";
const s = SCENARIOS[id];
const contract = await readFile(`examples/contracts/${s.file}`, "utf8");
const text =
  `New trade-promotion claim from ${s.retailer} — ${s.promo}. Adjudicate it.\n\n` +
  `CONTRACT:\n${contract}\n\nIMAGE_REF: ${s.imageRef}\nNARRATIVE: ${s.narrative}`;

const body = { messages: [{ id: "m1", role: "user", parts: [{ type: "text", text }] }] };

console.log(`>>> submitting ${id} claim…`);
const res = await fetch("http://localhost:3000/api/agent", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
console.log("HTTP", res.status);
if (!res.body) { console.log(await res.text()); process.exit(1); }

const reader = res.body.getReader();
const dec = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  process.stdout.write(dec.decode(value, { stream: true }));
}
console.log("\n<<< stream ended");
