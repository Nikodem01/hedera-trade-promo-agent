// End-to-end v2: adjudicate (auto proof-only anchor) -> propose_settlement
// (scheduled pUSDC) -> brand signs (pending) -> retailer signs (executes) + NFT.
// Run: node scripts/test-v2-flow.mjs
import { readFile } from "node:fs/promises";

const BASE = "http://localhost:3000";
const contract = await readFile("examples/contracts/01-oreo-endcap-q2.txt", "utf8");
const text =
  `New trade-promotion claim from Walmart #2643 — Q2 OREO Floor Display. Adjudicate it.\n\n` +
  `CONTRACT:\n${contract}\n\nIMAGE_REF: oreo.jpg\nNARRATIVE: Freestanding OREO display tower beside the dairy case for all of May, branded header card, well over four facings, fully stocked. Photo attached.`;

console.log(">>> adjudicating + proposing settlement…");
const res = await fetch(`${BASE}/api/agent`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: [{ id: "m1", role: "user", parts: [{ type: "text", text }] }] }) });
let buf = "";
const reader = res.body.getReader();
const dec = new TextDecoder();
while (true) { const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); }

const scheduleId = buf.match(/scheduleId\\?"?\s*:\s*\\?"?(0\.0\.\d+)/)?.[1];
const commitment = buf.match(/commitment\\?"?\s*:\s*\\?"?([0-9a-f]{64})/)?.[1];
const decision = buf.match(/decision\\?"?\s*:\s*\\?"?(\w+)/)?.[1];
console.log("decision:", decision, "| scheduleId:", scheduleId, "| commitment:", commitment?.slice(0, 16) + "…");
if (!scheduleId) { console.log("no scheduleId — propose_settlement did not run\n", buf.slice(-600)); process.exit(1); }

const sign = async (role) => {
  const r = await fetch(`${BASE}/api/settlement/sign`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scheduleId, role, commitment }) });
  return r.json();
};

const b = await sign("brand");
console.log("after BRAND sign   | executed:", b.executed, "(expect false)");
const rt = await sign("retailer");
console.log("after RETAILER sign| executed:", rt.executed, "(expect true) | nftSerial:", rt.nftSerial, "| at:", rt.executedAt);
process.exit(rt.executed ? 0 : 1);
