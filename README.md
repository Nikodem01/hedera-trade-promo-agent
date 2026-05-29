# PromoProof — confidential, verifiable trade-promotion settlement on Hedera

> An enterprise adjudication agent that reads a bespoke trade-promotion contract, judges a
> retailer's in-store proof photo against it, **negotiates when the evidence is borderline**, and
> settles the payment on Hedera — **with zero confidential data on-chain**. Every decision is
> committed to a public ledger as a tamper-proof, timestamped proof; the terms, amounts, parties and
> the model's reasoning stay off-chain and are revealed only by **selective disclosure**. Settlement
> is a **stablecoin transfer that executes only when the brand and the retailer both sign on-chain**.

Built for the **Hedera AI Bounty — Week 2 (Enterprise Agent + Plugin)** on the
[Hedera Agent Kit](https://github.com/hashgraph/hedera-agent-kit-js) v4.

## The problem

CPG brands pay retailers ~$30B/year in trade promotions — slotting fees, end-cap rentals, co-op
displays. Proof-of-performance is audited **by hand** against bespoke per-retailer contracts
(Walmart's terms ≠ Target's ≠ 7-Eleven's). Settlement lags 60–120 days, and **deductions disputes are
endemic**: industry sources put invalid deductions at **5–10% of trade claims**, with up to **half of
post-audit deductions erroneous or duplicate** — and they resurface **years later**, demanding durable,
tamper-proof proof-of-performance that neither side can alter.

## What it does

A claim = a bespoke contract (prose) + a proof photo + the retailer's narrative. PromoProof:

1. **Adjudicates** — a vision model reads the contract, examines the photo, weighs the narrative, and
   returns a typed, **clause-cited** assessment with one of five decisions.
2. **Negotiates** — when proof is borderline it asks for the *specific* missing evidence (e.g. a POS
   timestamp), then re-adjudicates and **revises**.
3. **Commits — confidentially** — the full decision provenance (inputs, model, settings, reasoning,
   per-criterion findings) is captured **off-chain**; only a **salted Merkle commitment** + a keyed
   image fingerprint are anchored to a Hedera HCS topic. No business data ever touches the chain.
4. **Settles — by mutual consent** — for an approved claim the agent *proposes* a `pUSDC` (stablecoin)
   transfer as a **Hedera Scheduled Transaction**. It executes **only** once the **brand approver**
   (authorize) and the **retailer** (accept, via receiver-signature-required) both sign on-chain. A
   unique **attestation NFT** (metadata = the commitment) is minted on execution.

| Decision | Meaning | Effect |
|---|---|---|
| `approve` | Fully compliant | commit + propose full settlement |
| `partial_credit` | Partially compliant | commit + propose proportional settlement |
| `reject` | Non-compliant | commit only (neutral record) |
| `request_more_evidence` | Borderline | ask for specific proof; re-adjudicate |
| `escalate_human` | Too uncertain | route to a human reviewer |

## Trustworthy-AI layer (auditable judgement)

Trust on *both* sides of the ledger — the settlement is trustless, and the AI judgement is made
visible, fraud-resistant, governed, and ROI-tied:

- **Visual grounding — "show me where".** The model returns a bounding box per criterion; the verdict
  overlays them on the proof photo (hover a finding → its box highlights). Judgement you can *see*.
- **Evidence authenticity.** Objective **EXIF** capture-time/GPS corroboration + a soft visual
  manipulation signal; cross-claim **proof-reuse** is caught on-chain via the keyed image fingerprint
  (GenAI fraud is projected at $40B by 2027).
- **Human oversight on the record.** An analyst can overturn the AI; the override is anchored to HCS as
  its own proof-only commitment linked to the original — tamper-proof oversight evidence (EU AI Act
  Art. 14), itself selectively disclosable.
- **Leakage recovered.** The portfolio quantifies $ withheld vs naively paying every claim in full —
  the ROI of catching the 5–10% of invalid deductions.

## The on-chain trade-promotion fund (accrual → release → refund)

Trade spend is **accrued** up front and drawn down on validated proof. PromoProof models this on
Hedera: the brand pre-funds a pUSDC **accrual escrow**; each mutually-consented settlement releases
from it (a **HIP-423 long-term scheduled transfer** — a ~60-day approval window that still executes the
instant both parties sign); unspent accrual refunds to the brand at the window's end. The console shows
the fund drawing down live.

## Why Hedera — and why a database can't do this

The hard questions for any "blockchain" product are *confidentiality* and *necessity*. PromoProof
answers both with the enterprise-standard **Baseline pattern** (EY/ConsenSys/Microsoft) and EDPB
blockchain guidance: **commitments on-chain, business data off-chain.**

- **Confidential by construction.** The public HCS record is *only* `{commitment, image_fp, ts}` — a
  salted Merkle root and a keyed fingerprint. Bespoke terms, settlement economics, retailer identity
  and the model's reasoning are never published. (Per-leaf salts mean disclosing one field can't
  unmask another.)
- **Tamper-proof, mutual, non-repudiable.** A database record of "we decided X at time T" is only as
  trustworthy as whoever hosts it — they can alter or backdate it. A commitment on a neutral public
  consensus ledger can't be forged or backdated, and the brand, the retailer, **and an auditor** can
  each verify it **without trusting our server** — exactly what a deductions dispute (surfacing years
  later) needs.
- **Selective disclosure.** Reveal one field — the decision, or a single clause finding — with its
  Merkle proof; the counterparty verifies it against the on-chain commitment and learns nothing else.
- **Consensus-enforced consent.** Settlement is a scheduled transfer that **physically cannot execute**
  without both parties' signatures. The agent (and any single key) is incapable of moving the funds —
  the bounty's "impossible to drain without explicit consent" rule satisfied by Hedera consensus, not
  by app logic.
- **Right-fit primitives, low fixed fees.** HCS is a decentralized notary; Scheduled Transactions +
  receiver-signature-required encode a mutual agreement; sub-cent fees suit millions of anchors.

## The custom plugin

[`lib/plugins/tpp-evaluator`](lib/plugins/tpp-evaluator) — a Hedera Agent Kit v4 plugin with three
tools: `adjudicate_claim` (multimodal judgement → builds the off-chain dossier and anchors the
proof-only commitment in code), `compute_settlement` (deterministic, hard-capped), and
`propose_settlement` (creates the scheduled, two-signature pUSDC settlement). The model has **no tool
that moves funds.**

## Model — provider-swappable

Runs on **Gemini 3.x (free tier)** by default (`LLM_PROVIDER=google`); flip to `anthropic` (Sonnet
orchestration + Opus vision) with one env var. The thesis is **model-agnostic, verifiable
adjudication** — the on-chain proof is what's load-bearing, not any single vendor.

## Hedera footprint (testnet)

| Primitive | Why | Artifact |
|---|---|---|
| HCS | Neutral, immutable **commitment** ledger (proof-only) | topic [`0.0.9069962`](https://hashscan.io/testnet/topic/0.0.9069962) |
| HTS (fungible) | `pUSDC` stablecoin settlement unit (prod: Circle USDC) | token [`0.0.9089483`](https://hashscan.io/testnet/token/0.0.9089483) |
| HTS (NFT) | Unique per-settlement attestation (metadata = commitment) | token [`0.0.9088330`](https://hashscan.io/testnet/token/0.0.9088330) |
| Scheduled tx + receiver-sig | Mutual-consent settlement (brand + retailer co-sign) | brand `0.0.9089484` → retailer `0.0.9089486` |

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind 4 ·
`@hashgraph/hedera-agent-kit` v4 + `@hashgraph/hedera-agent-kit-ai-sdk` · `@hiero-ledger/sdk` ·
Vercel AI SDK v6 · Zod 3 · Vitest.

## Run it

```bash
pnpm install
cp .env.example .env.local                                  # fill HEDERA_* + an LLM key
node --env-file=.env.local scripts/setup-hedera.mjs         # HCS topic + receipt tokens
node --env-file=.env.local scripts/setup-settlement.mjs     # pUSDC + brand/retailer accounts
pnpm dev                                                    # http://localhost:3000
pnpm test                                                   # crypto, settlement, no-drain
```

Dev drivers: `scripts/eval-decisions.mjs` (ledger-asserted decision eval), `scripts/test-v2-flow.mjs`
(adjudicate → propose → brand+retailer sign → executed), `scripts/test-scheduled-settlement.mjs`.

## Security / no-drain

The model never moves money and has **no tool that can**. `compute_settlement` caps the figure;
`propose_settlement` re-caps and only *schedules*; execution requires the brand approver's **and** the
retailer's on-chain signatures. The recipient is a fixed registered account, never model-chosen. See
[`tests/injection.test.ts`](tests/injection.test.ts) and [`tests/dossier.test.ts`](tests/dossier.test.ts).
Operator/party keys are server-only.

## Enterprise readiness

PromoProof adjudicates payouts, so it is engineered to the diligence a CPG trade-finance buyer
actually runs — model risk, data governance, and provable trust, not just a demo:

- **Model risk ([docs/MODEL_RISK.md](docs/MODEL_RISK.md)).** An OCC-style posture: a dual-model
  adjudicator + **independent reviewer**, a **deterministic safety gate** (low-confidence or
  reviewer-flagged decisions auto-escalate to a human — withhold-only, never approve), a labeled
  **validation harness** with an on-chain ground truth (`docs/validation/`), and a live **Model Risk &
  Quality** panel (`/api/quality`: reviewer-concurrence, citation-integrity, safety-gate holds, model
  lineage).
- **Data governance ([docs/COMPLIANCE.md](docs/COMPLIANCE.md), [docs/SECURITY.md](docs/SECURITY.md)).**
  Dossiers **encrypted at rest** (AES-256-GCM); a **provable, HCS-anchored access log** (a hosted DB
  log is editable — this isn't); **crypto-shredding** deletion (EU AI Act / GDPR-aligned); the no-drain
  invariant and threat model written down.
- **Positioning ([docs/COMPETITIVE.md](docs/COMPETITIVE.md)).** Why a neutral consensus ledger beats a
  database, and why the trust layer is the one column an incumbent deduction-management suite can't fill.

## Roadmap

Batched (Merkle-rolled) commitments for scale + timing privacy; production stablecoin (Circle USDC /
Stablecoin Studio) and anchor-only settlement for amount-confidentiality; replicated/persistent dossier
store (at-rest encryption is in place — see SECURITY.md); third-party attestations (SOC 2 / ISO 42001);
ERP/TPM integration.
