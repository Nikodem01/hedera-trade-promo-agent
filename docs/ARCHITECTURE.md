# Architecture

## Layers

```
┌─ UI (app/) ───────────────────────────────────────────────────────────┐
│  page.tsx (server) reads contract fixtures → Console.tsx (client, useChat)│
└───────────────┬───────────────────────────────────────────────────────┘
                │  POST /api/agent  (UIMessage[] → toUIMessageStreamResponse)
┌───────────────▼─── Orchestrator (lib/agent) ──────────────────────────┐
│  claude-sonnet-4-6 via HederaAIToolkit + streamText, AUTONOMOUS mode    │
│  system prompt drives: adjudicate → explain → (negotiate) → settle      │
└───────┬───────────────────────────────────────────────┬───────────────┘
        │ tpp-evaluator plugin (custom)                  │ kit built-in tools
        ▼                                                ▼
  adjudicate_claim   compute_settlement          submit_topic_message (HCS)
  (Opus 4.7,         (deterministic, capped)     mint_fungible_token  (HTS)
   multimodal)                                    transfer_hbar        (HBAR)
        │                                                │
        └──── ComplianceAssessment / SettlementProposal  └─ HashScan links
                                                          + HcsAuditTrailHook
                                                            (enforced audit)
```

## Tool sequence (per claim)

1. `adjudicate_claim(contract_text, image_ref, narrative, prior_evidence?)` → `ComplianceAssessment`
   — Opus 4.7 reads the contract, sees the photo, returns a 5-way decision with per-criterion,
   clause-cited findings, a recommended credit %, and the contract's max settlement.
2. Orchestrator explains the assessment and acts on the decision:
   - `request_more_evidence` → asks for specific proof, stops; on the retailer's reply, re-runs
     step 1 with `prior_evidence` and revises.
   - `escalate_human` / `reject` → no settlement (reject still gets an HCS record).
   - `approve` / `partial_credit` → step 3 after explicit human approval.
3. `compute_settlement(decision, recommended_credit_pct, max_settlement_hbar)` → `SettlementProposal`
   — deterministic; caps at the contract max and a global ceiling.
4. Settle on-chain: `submit_topic_message` (HCS decision record) → `mint_fungible_token` (HTS
   receipt) → `transfer_hbar` (retailer wallet). `HcsAuditTrailHook` also auto-logs the
   fund-moving/minting calls to HCS independently of the prompt.

## Data shapes

- `ComplianceAssessment`: `{ decision, confidence, recommended_credit_pct, max_settlement_hbar,
  criteria[{ requirement, clause_ref, status, observed_in_photo, concern }], reasoning_summary,
  evidence_requested? }`
- `SettlementProposal`: `{ amount_hbar, partial_credit_pct, max_settlement_hbar, justification }`

## Why Hedera

- **HCS** — a neutral, immutable ledger of every claim and decision; neither brand nor retailer can
  edit it. SOX-clean audit by construction.
- **HTS** — a "PromoProof Receipt" token minted per settlement as a portable attestation artifact.
- **HBAR** — the actual money movement, settled in seconds with low, predictable fees.

## Security / no-drain

The LLM never moves money or picks a recipient. `compute_settlement` is deterministic and hard-caps
the payout at the contract max **and** `SETTLEMENT_HARD_CAP_HBAR`; the recipient is a fixed
registered wallet; settlement requires an explicit human approval turn. See
[`tests/injection.test.ts`](../tests/injection.test.ts). Operator/API keys are server-only.
