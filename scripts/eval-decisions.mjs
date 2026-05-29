// Adjudication regression eval — the arc the whole demo rests on. Drives the 3
// curated claims through the live /api/agent route and asserts each returns the
// intended decision (oreo→approve, cadbury→request_more_evidence, ritz→reject).
//
// The decision is read back from the on-chain audit ledger (/api/audit, Mirror
// Node), NOT scraped from the response stream — the stream escapes the tool JSON,
// and the ledger read also proves the verdict was actually recorded on Hedera.
//
// Requires the dev server running (pnpm dev) with a working LLM key in its env.
// Runs are SPACED (EVAL_DELAY_MS, default 20s) to stay under free-tier rate limits.
// Usage:  node scripts/eval-decisions.mjs   (override host with EVAL_BASE_URL)
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
const DELAY = Number(process.env.EVAL_DELAY_MS ?? 20000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CASES = [
  { id: "oreo", expect: "approve", file: "01-oreo-endcap-q2.txt", retailer: "Walmart #2643", promo: "Q2 OREO Floor Display", imageRef: "oreo.jpg", narrative: "Freestanding OREO display tower installed beside the dairy case for all of May, with the branded OREO header card and well over four facings across the unit, fully stocked. Photo attached." },
  { id: "cadbury", expect: "request_more_evidence", file: "02-cadbury-easter-display.txt", retailer: "Woolworths", promo: "Cadbury Easter Display", imageRef: "Cadbury-Woolworths-Easter-POS-Unit_1.jpg", narrative: "Freestanding Cadbury Easter display unit set up in a main grocery actionway, with Easter-themed Cadbury signage and a prominent presentation of the Cadbury Easter egg range. Photo attached." },
  { id: "ritz", expect: "reject", file: "03-ritz-checkout-shelf.txt", retailer: "7-Eleven TX-1188", promo: "RITZ Checkout Feature", imageRef: "licensed-image-ritz.jpg", narrative: "RITZ crackers merchandised with three facings and a branded shelf strip. Photo attached." },
];

const decisionRecords = async () => {
  const d = await (await fetch(`${BASE}/api/audit`, { cache: "no-store" })).json();
  return (d.entries ?? []).filter((e) => e.record && typeof e.record === "object" && e.record.decision);
};
const maxSeq = (recs) => recs.reduce((m, e) => Math.max(m, e.sequenceNumber), 0);

/** Poll the ledger until a decision record newer than `afterSeq` appears. */
async function newDecisionAfter(afterSeq, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const recs = await decisionRecords();
    const fresh = recs.filter((e) => e.sequenceNumber > afterSeq).sort((a, b) => b.sequenceNumber - a.sequenceNumber);
    if (fresh.length) return fresh[0];
    await sleep(3000);
  }
  return null;
}

let failures = 0;
const results = []; // per-case outcome → the validation report (docs/validation/report.json)
for (const [idx, c] of CASES.entries()) {
  if (idx > 0) await sleep(DELAY); // space runs to dodge free-tier rate limits
  const before = maxSeq(await decisionRecords());
  const contract = await readFile(`examples/contracts/${c.file}`, "utf8");
  const text =
    `New trade-promotion claim from ${c.retailer} — ${c.promo}. Adjudicate it.\n\n` +
    `CONTRACT:\n${contract}\n\nIMAGE_REF: ${c.imageRef}\nNARRATIVE: ${c.narrative}`;
  const body = { messages: [{ id: "m1", role: "user", parts: [{ type: "text", text }] }] };

  process.stdout.write(`▶ ${c.id.padEnd(8)} (expect ${c.expect.padEnd(21)}) … `);
  let got = "(none)";
  let rec = null;
  try {
    const res = await fetch(`${BASE}/api/agent`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok || !res.body) { console.log(`HTTP ${res.status} ✗`); failures++; results.push({ id: c.id, expected: c.expect, actual: null, correct: false, on_chain_seq: null }); continue; }
    // Drain the stream so the agent run (incl. the HCS write) completes.
    const reader = res.body.getReader();
    while (true) { const { done } = await reader.read(); if (done) break; }
    rec = await newDecisionAfter(before);
    got = rec ? `${rec.record.decision} (seq #${rec.sequenceNumber}${rec.record.image_hash ? ", img✓" : ""})` : "(no on-chain record)";
  } catch (e) {
    console.log(`error: ${e.message} ✗`); failures++; results.push({ id: c.id, expected: c.expect, actual: null, correct: false, on_chain_seq: null }); continue;
  }
  const decision = rec?.record?.decision ?? null;
  const ok = decision === c.expect;
  console.log(`${ok ? "✓" : "✗"} ${got}`);
  if (!ok) failures++;
  results.push({ id: c.id, expected: c.expect, actual: decision, correct: ok, on_chain_seq: rec?.sequenceNumber ?? null });
}

// Emit the structured validation report — the labeled-accuracy pillar of the model-risk
// story, read back from the on-chain ledger (so the score reflects what Hedera recorded).
// Live monitoring metrics (reviewer concurrence, citation integrity, confidence) are
// surfaced separately by /api/quality across ALL adjudications.
const correct = results.filter((r) => r.correct).length;
const confusion = {};
for (const r of results) {
  const a = r.actual ?? "(none)";
  confusion[r.expected] = confusion[r.expected] ?? {};
  confusion[r.expected][a] = (confusion[r.expected][a] ?? 0) + 1;
}
const report = {
  schema: "PromoProof/validation/v1",
  generated_at: new Date().toISOString(),
  set: "pilot — curated adversarial cases",
  n: results.length,
  accuracy: results.length ? correct / results.length : 0,
  cases: results,
  confusion,
  methodology:
    "Each case is a real bespoke trade-promotion contract + a real in-store proof photo with an " +
    "expert-assigned expected decision. Cases are driven end-to-end through the live agent " +
    "(/api/agent); the decision is read back from the on-chain HCS audit ledger (not the response " +
    "stream), so the score reflects what was committed on Hedera. EXPANSION PROTOCOL: add labeled " +
    "(contract, photo, expected) triples to CASES, stratified across all five decisions and across " +
    "retailers/placements; re-run to grow N. This is a PILOT set — N is reported honestly.",
};
await mkdir(join("docs", "validation"), { recursive: true });
await writeFile(join("docs", "validation", "report.json"), JSON.stringify(report, null, 2) + "\n");

console.log(`\n${failures === 0 ? "✓ all decisions as expected, recorded on-chain" : `✗ ${failures} mismatch(es)`}`);
console.log(`📄 docs/validation/report.json — accuracy ${(report.accuracy * 100).toFixed(0)}% on N=${report.n} (pilot)`);
process.exit(failures === 0 ? 0 : 1);
