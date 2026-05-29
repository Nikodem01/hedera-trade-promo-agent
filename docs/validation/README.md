# Validation harness

`scripts/eval-decisions.mjs` is PromoProof's **labeled validation** — the accuracy pillar of the
model-risk story (the live monitoring pillar is `/api/quality`).

## What it does

Drives each labeled case (a real bespoke contract + a real in-store proof photo + an expert-assigned
expected decision) end-to-end through the live agent (`/api/agent`), then reads the decision **back
from the on-chain HCS audit ledger** (`/api/audit`, Mirror Node) — not the response stream — so the
score reflects what Hedera actually recorded. It writes a structured report to `report.json`:

```jsonc
{
  "schema": "PromoProof/validation/v1",
  "n": 3, "accuracy": 1.0,
  "cases": [{ "id": "oreo", "expected": "approve", "actual": "approve", "correct": true, "on_chain_seq": 42 }],
  "confusion": { "approve": { "approve": 1 }, "reject": { "reject": 1 }, "request_more_evidence": { "request_more_evidence": 1 } },
  "methodology": "…"
}
```

The console's Model Risk panel surfaces `accuracy` + `n` when this report is present.

## Honest framing

This is a **pilot** set (N=3 curated adversarial cases), and N is reported as-is — never inflated.
The point is a *rigorous, reproducible methodology with an on-chain ground truth*, not a large number.

## Expansion protocol

Add labeled `(contract, photo, expected)` triples to `CASES` in `scripts/eval-decisions.mjs`,
stratified across all five decisions (`approve` / `partial_credit` / `reject` /
`request_more_evidence` / `escalate_human`) and across retailers and placement types, then re-run to
grow N. Track accuracy and the confusion matrix over releases as a regression gate.

## Run

```bash
pnpm dev                              # in one terminal (LLM key + Hedera ids set)
node scripts/eval-decisions.mjs       # spaced ~20s/case to respect free-tier limits
```
