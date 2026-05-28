// Multi-turn driver: submits a claim, reconstructs the assistant message from
// the streamed UI parts, then sends an "approve & settle" follow-up so the agent
// completes the on-chain settlement chain (mint + transfer). Usage:
//   node scripts/try-approve.mjs [oreo|cadbury|ritz]
import { readFile } from "node:fs/promises";

const SCENARIOS = {
  oreo: { file: "01-oreo-endcap-q2.txt", retailer: "Walmart #2643", promo: "Q2 OREO Floor Display", imageRef: "oreo.jpg", narrative: "Freestanding OREO display tower installed beside the dairy case for all of May, with the branded OREO header card and well over four facings across the unit, fully stocked. Photo attached." },
  cadbury: { file: "02-cadbury-easter-display.txt", retailer: "Woolworths", promo: "Cadbury Easter Display", imageRef: "Cadbury-Woolworths-Easter-POS-Unit_1.jpg", narrative: "Freestanding Cadbury Easter display unit set up in a main grocery actionway, with Easter-themed Cadbury signage and a prominent presentation of the Cadbury Easter egg range. Photo attached." },
  ritz: { file: "03-ritz-checkout-shelf.txt", retailer: "7-Eleven TX-1188", promo: "RITZ Checkout Feature", imageRef: "licensed-image-ritz.jpg", narrative: "RITZ crackers merchandised with three facings and a branded shelf strip. Photo attached." },
};

const id = process.argv[2] || "oreo";
const s = SCENARIOS[id];
const contract = await readFile(`examples/contracts/${s.file}`, "utf8");
const claimText =
  `New trade-promotion claim from ${s.retailer} — ${s.promo}. Adjudicate it.\n\n` +
  `CONTRACT:\n${contract}\n\nIMAGE_REF: ${s.imageRef}\nNARRATIVE: ${s.narrative}`;

// One POST → stream parsed into UI events.
async function post(messages) {
  const res = await fetch("http://localhost:3000/api/agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok || !res.body) {
    console.error("HTTP", res.status, await res.text());
    process.exit(1);
  }
  const events = [];
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const chunks = buf.split("\n\n");
    buf = chunks.pop() ?? "";
    for (const c of chunks) {
      const line = c.trim();
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try { events.push(JSON.parse(data)); } catch {}
    }
  }
  return events;
}

// Reconstruct an assistant UIMessage from the stream events.
function assistantFromEvents(events) {
  const texts = new Map(); // text-id -> accumulated string
  const tools = new Map(); // toolCallId -> { toolName, input, output }
  for (const e of events) {
    if (e.type === "text-delta") texts.set(e.id, (texts.get(e.id) ?? "") + (e.delta ?? ""));
    if (e.type === "tool-input-available") {
      tools.set(e.toolCallId, { toolName: e.toolName, input: e.input });
    }
    if (e.type === "tool-output-available") {
      const t = tools.get(e.toolCallId) ?? {};
      t.output = e.output;
      tools.set(e.toolCallId, t);
    }
  }
  // Emit parts in event order of finalization (text-end, tool-output-available).
  const parts = [];
  for (const e of events) {
    if (e.type === "text-end" && texts.has(e.id)) {
      parts.push({ type: "text", text: texts.get(e.id) });
    }
    if (e.type === "tool-output-available") {
      const t = tools.get(e.toolCallId);
      if (t?.toolName) {
        parts.push({
          type: `tool-${t.toolName}`,
          toolCallId: e.toolCallId,
          state: "output-available",
          input: t.input,
          output: t.output,
        });
      }
    }
  }
  return { id: `a${Date.now()}`, role: "assistant", parts };
}

function summarize(label, events) {
  console.log(`\n=== ${label} ===`);
  const tools = [];
  let lastText = "";
  for (const e of events) {
    if (e.type === "tool-output-available") {
      const name = events.find((x) => x.type === "tool-input-available" && x.toolCallId === e.toolCallId)?.toolName;
      tools.push({ name, output: e.output });
    }
    if (e.type === "text-delta") lastText += e.delta ?? "";
  }
  console.log("tool calls:");
  for (const t of tools) {
    const out = typeof t.output === "string" ? t.output.slice(0, 220) : JSON.stringify(t.output).slice(0, 220);
    console.log(`  • ${t.name}  →  ${out}`);
  }
  console.log("agent text:\n  " + lastText.replace(/\n/g, "\n  "));
}

const userClaim = { id: "u1", role: "user", parts: [{ type: "text", text: claimText }] };
console.log(`>>> Turn 1: submitting ${id} claim…`);
const events1 = await post([userClaim]);
summarize("Turn 1", events1);

const assistant1 = assistantFromEvents(events1);
const followUp = process.argv[3] || "Approved. Please settle on-chain now.";
const userApprove = {
  id: "u2",
  role: "user",
  parts: [{ type: "text", text: followUp }],
};
console.log(`\n>>> Turn 2: ${followUp}`);
const events2 = await post([userClaim, assistant1, userApprove]);
summarize("Turn 2", events2);
