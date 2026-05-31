# PromoProof console — design brief (for claude.ai/design)

Paste everything between the rules into claude.ai/design. It is written so the generated artifact
maps 1:1 onto our data shapes and is cleanly wired to a live agent afterward.

---

## What you're designing

A single-screen operations console for **PromoProof** — an AI agent used by a CPG brand's
trade-promotion audit team (think Mondelez revenue management) to adjudicate retailer
proof-of-performance claims and settle the payment on the Hedera blockchain. An analyst picks a
retailer's claim; the agent reads the bespoke promotion contract, judges the in-store proof photo
against it, **negotiates when evidence is borderline**, and on approval settles real value on-chain
with an immutable audit trail.

This is not a chatbot toy and not a crypto-trading dashboard. It is an **audit-grade settlement
terminal**: something a finance analyst trusts to move money against a contract. The two emotional
beats are *defensible judgement* (the verdict) and *verifiable settlement* (the on-chain receipt).

## Visual direction (be opinionated; avoid the defaults)

- **Feel:** calm, precise, document-grade. Closer to a legal/audit workbench than a SaaS dashboard.
  Dense but highly legible. It should look like evidence you could show an auditor.
- **Canvas:** a light, paper-like neutral base (warm off-white / `#FAFAF7`-ish), ink text
  (`#16161A`), generous whitespace and a strong typographic hierarchy. A thin keyline/grid language,
  not heavy drop-shadowed cards everywhere.
- **One confident accent:** deep emerald (`#0B5D3B`/`#10B981` family) for brand + primary actions.
  Use it sparingly so it means "go / settled."
- **Monospace for provenance:** render every on-chain identifier, contract **clause reference**
  (e.g. `§2.1`, `R-1`), token/topic/transaction id, and HBAR amount in a monospace face. This single
  choice signals precision and on-chain truth and ties the whole thing together.
- **Decision color system (use consistently for badges + status chips):**
  - `approve` → emerald · `partial_credit` → amber `#B45309` · `reject` → red `#B91C1C`
  - `request_more_evidence` → blue `#1D4ED8` · `escalate_human` → violet `#6D28D9`
  - criterion status: `met` emerald · `partial` amber · `unmet` red · `indeterminate` slate
- **Motion:** the agent's work should *unfold* — tool-call cards appear in sequence with a subtle
  reveal; the settlement receipt lands like a stamped seal (a brief scale/opacity settle). Nothing
  bouncy.
- **Explicitly avoid:** dark neon "crypto" gradients, glassmorphism, emoji-as-icons, a generic
  3-stat-cards-in-a-row dashboard header, purple-on-black AI clichés, full-width hero gradients.

## Screen anatomy (top → bottom, one column, max ~1100px, responsive)

1. **Header bar.** Wordmark "PromoProof" + one-line tagline: *"Reads the contract. Judges the proof.
   Negotiates. Settles on Hedera."* On the right, a small live "Testnet" pill and the operator
   account id in monospace.

2. **Claim picker.** A row of three selectable claim cards (one active at a time). Each shows the
   retailer, the promotion, the max settlement (monospace HBAR), and a faint "expected" hint. The
   three:
   - *Walmart #2643 — Q2 OREO End-Cap — up to `30 HBAR`*
   - *Target — Cadbury Easter Display — up to `25 HBAR`*
   - *7-Eleven TX-1188 — RITZ Checkout Feature — up to `20 HBAR`*

3. **Adjudication workspace** (the centerpiece, fills the screen). A vertical timeline/transcript of
   the run, mixing three element types:
   - **Claim submission** (analyst): a compact summary of the claim + a thumbnail of the proof photo
     + the retailer's narrative quote.
   - **Tool-call chips**: small inline rows — a status dot (running pulse / done / error), the tool
     name in monospace (`adjudicate_claim`, `compute_settlement`, `submit_topic_message`,
     `mint_fungible_token`, `transfer_hbar`), and a one-line result. Collapsed by default.
   - **Agent reasoning**: short prose blocks.

4. **Verdict card — HERO #1.** The output of `adjudicate_claim`, rendered as an official finding:
   - Top: a large **decision badge** (one of the five, colored per the system) + a **confidence
     meter** (0–1) + `recommended_credit_pct` + `max_settlement_hbar` (monospace).
   - Center: a **criteria table** — one row per contract requirement with columns: `clause_ref`
     (monospace chip), `requirement`, `status` (colored chip), `observed_in_photo`, `concern`. This
     table is the soul of the product — make it scannable and authoritative.
   - Bottom: `reasoning_summary` as a short, quotable paragraph.

5. **Evidence-request state.** When the decision is `request_more_evidence`, show a distinct blue
   callout featuring the exact `evidence_requested` text and an **inline reply field** ("Provide a
   POS timestamp…"). This is the negotiation moment — make it feel like the agent is asking a
   precise question, not erroring out.

6. **Settlement panel — HERO #2.** Before settlement: a single prominent **"Approve & Settle"**
   button (emerald) with the computed amount beside it. After settlement: a **receipt** that reads
   like a stamped confirmation — `amount_hbar` (large, monospace), `partial_credit_pct`,
   `justification`, and three **"View on HashScan"** link-buttons labeled **HCS audit · HTS receipt ·
   HBAR transfer**, each showing a truncated monospace id. Convey "this is verifiable by anyone."

7. **Composer.** A bottom input bar for approval/negotiation replies, with a Send button. Disabled
   with a subtle "PromoProof is working…" state while the agent runs.

## States to design (show them as variants)

- empty (no claim selected) · agent running/streaming · each of the 5 decisions in the verdict card
  · evidence-request + reply · pre-settlement (Approve & Settle) · post-settlement receipt · a tool
  error chip.

## Realistic mock data (use this verbatim so it looks true and maps to our types)

```ts
// Scenario 1 — Oreo end-cap → APPROVE
const oreo: ComplianceAssessment = {
  decision: "approve", confidence: 0.93, recommended_credit_pct: 100, max_settlement_hbar: 30,
  criteria: [
    { requirement: "End-cap at head of cookie/cracker aisle", clause_ref: "§2.1", status: "met",
      observed_in_photo: "Full end-cap at an aisle head, OREO-branded.", concern: "" },
    { requirement: "Minimum 4 OREO facings", clause_ref: "§2.2", status: "met",
      observed_in_photo: "Five facings of OREO SKUs visible.", concern: "" },
    { requirement: "Official OREO branded header card", clause_ref: "§2.3", status: "met",
      observed_in_photo: "OREO header card present and legible.", concern: "" },
    { requirement: "Reasonably stocked for the window", clause_ref: "§2.4", status: "met",
      observed_in_photo: "Shelves well stocked.", concern: "" },
  ],
  reasoning_summary: "All four execution requirements are clearly met; the end-cap matches the contracted placement, facing count, and branding. Recommend full settlement.",
};

// Scenario 2 — Cadbury Easter → REQUEST_MORE_EVIDENCE
const cadbury: ComplianceAssessment = {
  decision: "request_more_evidence", confidence: 0.56, recommended_credit_pct: 0, max_settlement_hbar: 25,
  criteria: [
    { requirement: "Freestanding unit, front-of-store", clause_ref: "(b)", status: "met",
      observed_in_photo: "FSDU near an entrance zone.", concern: "" },
    { requirement: "Minimum 6 Creme Egg facings", clause_ref: "(c)", status: "met",
      observed_in_photo: "Six facings visible.", concern: "" },
    { requirement: "Easter-themed Cadbury signage", clause_ref: "(d)", status: "met",
      observed_in_photo: "Cadbury Easter header affixed.", concern: "" },
    { requirement: "Display live within the Easter window (ends Apr 20)", clause_ref: "(a)", status: "indeterminate",
      observed_in_photo: "No date visible in the photo.", concern: "Cannot confirm the display was live on/before Apr 20 from the image alone." },
  ],
  reasoning_summary: "Placement, facings, and signage are met, but the contract conditions payment on the display being live within the Easter window and the photo carries no date. Requesting a timing proof before settling.",
  evidence_requested: "A point-of-sale timestamp or a dated compliance report confirming the display was live on or before April 20, 2026.",
};

// Scenario 3 — Ritz checkout → REJECT
const ritz: ComplianceAssessment = {
  decision: "reject", confidence: 0.9, recommended_credit_pct: 0, max_settlement_hbar: 20,
  criteria: [
    { requirement: "Checkout-lane (point-of-sale) placement", clause_ref: "R-1", status: "unmet",
      observed_in_photo: "Product is on a standard grocery aisle shelf, not a checkout lane.", concern: "R-1 is a threshold condition." },
    { requirement: "Minimum 3 RITZ facings", clause_ref: "R-2", status: "met",
      observed_in_photo: "Three+ facings present.", concern: "" },
    { requirement: "Branded RITZ shelf strip", clause_ref: "R-3", status: "partial",
      observed_in_photo: "A shelf strip is present but partially obscured.", concern: "" },
  ],
  reasoning_summary: "Location (R-1) is a threshold requirement and is not met — the product is merchandised on a regular aisle, not at the checkout lane — so the claim is rejected regardless of facings or signage. Recorded to the audit ledger; zero paid.",
};

// Settlement after Cadbury is revised to partial on evidence → PARTIAL
const cadburySettlement: SettlementProposal = {
  amount_hbar: 18.75, partial_credit_pct: 75, max_settlement_hbar: 25,
  justification: "Partial compliance — 75% credit applied after timing was confirmed, capped at the contract maximum.",
};

// HashScan links to render in the receipt (testnet)
const links = {
  hcsAudit:  "https://hashscan.io/testnet/topic/0.0.9104996",
  htsReceipt:"https://hashscan.io/testnet/token/0.0.9069963",
  hbarXfer:  "https://hashscan.io/testnet/transaction/0.0.9067781-1779890985-756797660",
};
```

## Type shapes (the design's props must match these exactly)

```ts
type Decision = "approve" | "partial_credit" | "reject" | "request_more_evidence" | "escalate_human";
type CriterionStatus = "met" | "partial" | "unmet" | "indeterminate";
type ComplianceAssessment = {
  decision: Decision; confidence: number; recommended_credit_pct: number; max_settlement_hbar: number;
  criteria: { requirement: string; clause_ref: string; status: CriterionStatus; observed_in_photo: string; concern: string }[];
  reasoning_summary: string; evidence_requested?: string;
};
type SettlementProposal = { amount_hbar: number; partial_credit_pct: number; max_settlement_hbar: number; justification: string };
```

## Tech constraints

- **React + Tailwind only.** No component libraries, no icon packs beyond simple inline SVG, no
  charting libs (the confidence meter is a styled bar). One or a few components is fine.
- Build it as presentational components driven by props (`<VerdictCard assessment={...} />`,
  `<SettlementReceipt proposal={...} links={...} />`, `<ClaimPicker/>`, `<ToolChip/>`,
  `<Composer/>`) — no data fetching, mock data inline. I will wire these to a live stream after.
- Responsive down to ~390px; the criteria table should gracefully stack on mobile.
- Light theme is the primary; a tasteful dark variant is welcome but optional.

## What "great" looks like

I should be able to screenshot the **verdict card** and the **settlement receipt** and use them as
the two hero frames of a 90-second demo video — they should look authoritative and obviously
on-chain-verifiable. If the criteria table and the HashScan receipt don't make a finance auditor
nod, it's not there yet.
