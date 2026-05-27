# tpp-evaluator

A Hedera Agent Kit v4 plugin for trade-promotion proof-of-performance adjudication. It is the load-bearing reasoning layer of PromoProof: strip it and the system reduces to "detect logo → pay," which is exactly what it is designed not to be.

## Tools

### `adjudicate_claim` (multimodal judgement — Claude Opus 4.7)
Reads a bespoke promotion contract, examines the proof photo, and weighs the retailer's narrative in a single multimodal call. Returns a typed `ComplianceAssessment`:

- `decision`: `approve | partial_credit | reject | request_more_evidence | escalate_human`
- `confidence` (0–1), `recommended_credit_pct` (0–100), `max_settlement_hbar` (read from the contract)
- `criteria[]`: per-requirement `{ requirement, clause_ref, status, observed_in_photo, concern }`
- `reasoning_summary`, and `evidence_requested?` when more proof is needed

Ambiguity is first-class — poor lighting, wrong angle, or a missing timestamp lead to `indeterminate` criteria, `partial_credit`, or `request_more_evidence`, never a silent approve/reject.

Parameters: `contract_text`, `image_ref` (filename in `examples/proofs/` or an https URL), `narrative`, optional `prior_evidence` (for re-adjudication after an evidence request).

### `compute_settlement` (deterministic enforcement — no LLM)
Turns a decision into an HBAR amount. `approve → 100%`, `partial_credit → recommended %`, everything else `→ 0`. The result is hard-capped at both the contract maximum and a global safety ceiling (`SETTLEMENT_HARD_CAP_HBAR`, default 50), so a payout can never be inflated beyond what the contract allows — regardless of the model's recommendation.

## Design

The LLM does what code cannot (read prose, judge a messy photo, resolve ambiguity, negotiate); deterministic code does what it does better (enforce caps, compute the payout). The agent has no authority to choose a payout amount or recipient on its own.

Both tools are query-only `BaseTool`s (`shouldSecondaryAction → false`) — they perform no Hedera transaction. Settlement on-chain is handled by the kit's built-in HCS/HTS/HBAR tools, gated behind explicit human approval.
