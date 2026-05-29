# Architecture (v2 — confidential, verifiable, mutually settled)

## Principle: commitments on-chain, business data off-chain

PromoProof follows the **Baseline pattern** (public chain as a neutral frame of reference; proofs
on-chain, data off-chain) and EDPB blockchain guidance (salted commitments, never business/personal
data on an immutable ledger). The public ledger holds only a salted Merkle root + a keyed image
fingerprint per decision. Everything confidential lives in a server-side dossier store.

```
┌─ UI (app/) ───────────────────────────────────────────────────────────────────────┐
│  page.tsx (server) reads contract fixtures → Console.tsx (client, useChat)          │
│  PRIVATE operator view: verdict cards, dossier, /api/portfolio (off-chain stats)    │
│  PUBLIC view: AuditLedger ← /api/audit ← Mirror Node  (commitments only)            │
└───────────────┬─────────────────────────────────────────────────────────────────────┘
                │  POST /api/agent
┌───────────────▼─── Orchestrator (lib/agent) ──────────────────────────────────────┐
│  LLM via HederaAIToolkit + streamText. Has NO fund-moving tool.                     │
└───────┬───────────────────────────────────────────────────────────────────────────┘
        │ tpp-evaluator plugin (custom)
        ▼
  adjudicate_claim ──▶ ComplianceAssessment
        │  builds OFF-CHAIN dossier (lib/dossier.ts) → salted Merkle commitment
        │  stores it (lib/dossier-store.ts) ; anchors PROOF-ONLY record to HCS in code
        ▼
  compute_settlement (deterministic, capped)
        ▼
  propose_settlement ──▶ ScheduleCreate(pUSDC transfer brand→retailer)  [raw @hiero-ledger/sdk]
                          executes only on brand-approver + retailer ScheduleSign
                          (/api/settlement/sign) → attestation NFT minted on execution
```

## Tool / data flow (per claim)

1. `adjudicate_claim(contract_text, image_ref, narrative, prior_evidence?, retailer?, promotion?)`
   - multimodal judgement → `ComplianceAssessment` (5-way decision, per-criterion clause-cited
     findings, confidence, recommended %, contract max).
   - **in code**: `buildDossier` captures every field as a per-leaf-salted Merkle leaf
     (`lib/merkle.ts`), computes `commitment` (root) + `image_fp` (HMAC of photo bytes); `putDossier`
     stores it; `anchorCommitment` submits the proof-only `{schema, commitment, image_fp, ts}` to HCS.
   - returns assessment + `provenance {commitment, image_fp, model, adjudicated_at}` + `anchor {seq…}`.
2. Negotiation: `request_more_evidence` → ask, stop; on reply re-adjudicate (handles `NEW_IMAGE_REF`).
3. `compute_settlement(decision, recommended_credit_pct, max_settlement_hbar)` → capped amount.
4. `propose_settlement(amount, commitment)` → `ScheduleCreate` a pUSDC transfer brand→retailer; returns
   `scheduleId`. Cannot execute alone.
5. Consent gate (`/api/settlement/sign`): brand approver signs, retailer signs → Hedera executes →
   attestation NFT (metadata = commitment) minted.

## Verify / disclose (the dispute artifact)

- `/api/disclose` (operator): given a commitment + optional `labels`, returns a disclosure package
  (chosen leaves + per-leaf salts + Merkle proofs).
- `/api/verify` (anyone): re-derives each leaf, checks its Merkle proof against the commitment,
  confirms the commitment is on the Mirror Node (seq + consensus time), and flags `image_fp` reuse
  under a different commitment. Tampering any revealed value fails its proof.

## Data shapes

- `ComplianceAssessment`: `{ decision, confidence, recommended_credit_pct, max_settlement_hbar,
  criteria[{requirement, clause_ref, status, observed_in_photo, concern}], reasoning_summary,
  evidence_requested? }`
- `Dossier` (off-chain): `{ commitment, image_fp, fields[{label, value, salt}], created_at }`
- On-chain record: `{ schema:"PromoProof/v2", kind:"adjudication-commitment", commitment, image_fp, ts }`
- `Disclosure`: `{ commitment, revealed[{label, value, salt, proof}] }`

## Security / no-drain

The LLM never moves money and has no tool that can. `compute_settlement` and `propose_settlement` both
cap the amount; the recipient is a fixed env account; settlement executes only on the brand approver's
**and** the retailer's on-chain signatures (Scheduled Transactions + receiver-signature-required).
Operator and party keys are server-only. See `tests/injection.test.ts`, `tests/dossier.test.ts`.

## Why Hedera

- **HCS** = a decentralized notary: ordered, timestamped, immutable commitments any party verifies
  independently — non-repudiation a single-owner DB structurally can't provide.
- **HTS** = a USD-pegged settlement unit (`pUSDC`) + a unique attestation NFT per settlement.
- **Scheduled Transactions + receiver-signature-required** = mutual consent enforced by consensus.
- Sub-cent, fixed fees; fast finality; Council governance — fit for enterprise volume.
