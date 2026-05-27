# PromoProof — Trade Promotion Proof-of-Performance Settlement Agent

> An enterprise adjudication agent that reads a bespoke trade-promotion contract, judges a
> retailer's in-store proof photo against it, **negotiates when the evidence is borderline**, and
> settles the payment on Hedera — immutable HCS audit trail, HTS attestation receipt, and a real
> HBAR transfer to the retailer.

Built for the **Hedera AI Bounty — Week 2 (Enterprise Agent + Plugin)** on the
[Hedera Agent Kit](https://github.com/hashgraph/hedera-agent-kit-js) v4.

## The problem

CPG brands pay retailers ~$30B/year in trade promotions — slotting fees, end-cap rentals, co-op
displays. Proof-of-performance today is a photo plus a narrative claim, audited **by hand** against
bespoke per-retailer contracts (Walmart's terms ≠ Target's ≠ 7-Eleven's). Settlement lags 60–120
days and disputes are constant. Mondelez and other brands have named this friction publicly.

## What it does

A claim = a bespoke contract (prose) + a proof photo + the retailer's narrative. PromoProof:

1. **Adjudicates** — Claude Opus 4.7 reads the contract, examines the photo, weighs the narrative,
   and returns a typed, **clause-cited** assessment with one of five decisions.
2. **Negotiates** — when proof is borderline it asks for the *specific* missing evidence (e.g. a POS
   timestamp), then re-adjudicates and **revises** its decision.
3. **Settles** — only after explicit human approval: writes the decision to an HCS audit topic,
   mints an HTS "PromoProof Receipt", and transfers the (capped) HBAR to the retailer wallet — each
   step linked to HashScan.

| Decision | Meaning | On-chain effect |
|---|---|---|
| `approve` | Fully compliant | HCS audit + HTS receipt + full HBAR settle |
| `partial_credit` | Partially compliant | HCS audit + HTS receipt + proportional settle |
| `reject` | Non-compliant | HCS audit only (neutral record) |
| `request_more_evidence` | Borderline | asks for specific proof; re-adjudicates |
| `escalate_human` | Too uncertain | routed to a human reviewer |

**Why the LLM is load-bearing (the litmus test):** remove it and the product breaks — there is
nothing left to read bespoke prose, judge a messy photo, resolve ambiguity, or negotiate.
Deterministic code alone could only "detect logo → pay," which is exactly the failure mode rejected.

## Architecture

```
Retailer claim (contract.txt + photo + narrative)
        │  orchestrator: claude-sonnet-4-6 (single agent loop)
        ▼
[adjudicate_claim]  ── Opus 4.7 multimodal ──▶ ComplianceAssessment
        │            (decision · per-criterion findings w/ clause refs · recommended % · max HBAR)
   request_more_evidence ─▶ ask back; retailer replies; re-adjudicate ↺
   approve / partial_credit ─▶ ── human "approve & settle" ──
        ▼
[compute_settlement]  ── deterministic, capped ──▶ amount (≤ contract max, ≤ global hard cap)
        ▼
HCS submit_topic_message  →  HTS mint_fungible_token  →  transfer_hbar  →  HashScan links
```

- **Model split:** Sonnet 4.6 orchestrates the loop cheaply; Opus 4.7 does the multimodal judgement.
- **The LLM has no money authority (no-drain design).** It only *recommends*. `compute_settlement`
  enforces the payout and hard-caps it at the contract maximum **and** a global ceiling; the
  recipient is a fixed registered wallet. Settlement also requires an explicit human approval turn.
  This satisfies the bounty's "impossible to drain funds without explicit consent" rule with a
  *mechanism*, not a prompt. Proven by [`tests/injection.test.ts`](tests/injection.test.ts).
- **Immutable audit by hook:** `HcsAuditTrailHook` logs every fund-moving / minting tool call to HCS
  automatically — the SOX-clean trail is enforced, not dependent on the model remembering.

## The custom plugin

[`lib/plugins/tpp-evaluator`](lib/plugins/tpp-evaluator/README.md) — a Hedera Agent Kit v4 plugin
with exactly two tools: `adjudicate_claim` (multimodal judgement) and `compute_settlement`
(deterministic enforcement). Everything on-chain uses the kit's built-in HCS/HTS/HBAR tools. A full
run exercises 3+ non-query Hedera tools (well above the 2-tool minimum).

## Hedera footprint (testnet)

| Primitive | Why | Artifact |
|---|---|---|
| HCS | Neutral, immutable claim/decision ledger both parties trust | topic [`0.0.9069962`](https://hashscan.io/testnet/topic/0.0.9069962) |
| HTS | "PromoProof Receipt" attestation token, minted per settlement | token [`0.0.9069963`](https://hashscan.io/testnet/token/0.0.9069963) |
| HBAR | Real-money settlement to the retailer wallet | [sample transfer](https://hashscan.io/testnet/transaction/0.0.9067781-1779890985-756797660) |

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind 4 ·
`@hashgraph/hedera-agent-kit` v4 + `@hashgraph/hedera-agent-kit-ai-sdk` · `@hiero-ledger/sdk` ·
Vercel AI SDK v6 + `@ai-sdk/anthropic` · Zod 3 · Vitest.

## Run it

```bash
pnpm install
cp .env.example .env.local      # fill HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY (ECDSA), ANTHROPIC_API_KEY
node --env-file=.env.local scripts/setup-hedera.mjs   # one-time: creates HCS topic + HTS token; paste IDs into .env.local
pnpm dev                        # http://localhost:3000
pnpm test                       # deterministic settlement + injection tests
```

Place the three proof photos in `examples/proofs/` (`01-oreo-endcap-clean.jpg`,
`02-cadbury-borderline.jpg`, `03-ritz-noncompliant.jpg`) matching the contracts in
`examples/contracts/`.

## Status

Foundation, the adjudication plugin, the settlement infrastructure, and the ops console are built;
the deterministic settlement (incl. the no-drain cap) is unit-tested. End-to-end verification of the
multimodal adjudication runs once the proof images and an `ANTHROPIC_API_KEY` are in place.
