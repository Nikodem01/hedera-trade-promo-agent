# Model Risk Management

PromoProof adjudicates payouts, so it is an AI model that touches money — the regime financial
institutions apply here is **model risk management** (the OCC SR 11-7 / Bulletin 2011-12 lineage:
documented *validation*, *independent review*, *ongoing monitoring*, *explainability*). This is how
PromoProof maps to it. None of this is aspirational — each item points at code that exists.

## 1. Model inventory & lineage
- **Two models, by design.** A vision **adjudicator** reads the bespoke contract + the proof photo
  and returns a typed, clause-cited assessment; a second **independent reviewer** audits that
  assessment for hallucination / unsupported decisions before any money moves
  (`lib/plugins/tpp-evaluator/adjudicate.ts`).
- **Provider-swappable.** Gemini 3.x (free tier) for dev; Anthropic (Sonnet orchestration + Opus
  vision) for the production thesis — one env var. The on-chain proof is what's load-bearing, not any
  vendor.
- **Lineage recorded per decision.** Every adjudication seals the exact `model` id, the
  `thinking_settings`, and the full system prompt as committed leaves in its dossier. The live
  **model registry** (distinct models × counts) is surfaced at `/api/quality`.

## 2. Validation
- **Labeled pilot set** with an **on-chain ground truth**: `scripts/eval-decisions.mjs` drives each
  curated (contract, photo, expected-decision) case end-to-end and reads the decision back from the
  HCS ledger (not the response stream), so the score reflects what Hedera recorded. Output:
  `docs/validation/report.json` (accuracy + confusion matrix).
- **Honest N.** This is a **pilot** set (N=3 adversarial cases); N is reported as-is, never inflated.
  The deliverable is a rigorous, reproducible methodology — see the **expansion protocol** in
  `docs/validation/README.md` (stratify across all five decisions and across retailers/placements).

## 3. Independent review
A separate model pass audits each primary assessment (`agrees` / material `concern` /
`recommended_action`). The **reviewer-concurrence rate** is monitored live at `/api/quality`. The
reviewer is **load-bearing, not advisory** — see §4.

## 4. Controls & guardrails (deterministic, code-side — never the model)
- **Safety gate** (`lib/plugins/tpp-evaluator/safety-gate.ts`): if the reviewer recommends escalation
  **or** confidence < `CONFIDENCE_FLOOR` (default 0.5), a final decision is forced to `escalate_human`.
  It can only **withhold**, never approve.
- **Deterministic settlement** (`compute_settlement`): `approve → 100%`, `partial_credit → recommended
  %`, else `0`; hard-capped at the contract maximum **and** a global ceiling. The LLM only recommends.
- **No fund-moving tool.** The model cannot move money; settlement is a two-signature scheduled
  transfer (see `docs/SECURITY.md`).

## 5. Explainability
Per-criterion findings cite the exact contract clause; **citation verification** (code) confirms each
cited clause actually exists in the contract (catches fabricated cites) — **citation-integrity rate**
monitored at `/api/quality`. Visual grounding overlays a bounding box per criterion on the photo.

## 6. Ongoing monitoring
`/api/quality` aggregates live, from the sealed dossiers: decision mix, mean confidence (overall + by
decision), reviewer-concurrence rate, citation-integrity rate, safety-gate holds, and model lineage —
a standing model-health dashboard, not a one-off validation.

## 7. Human oversight
An analyst can overturn any decision; the override is anchored to HCS as its own proof-only commitment
linked to the original (`app/api/override`) — tamper-proof evidence of human-in-command oversight.

## 8. Known limitations (stated plainly)
- Validation is **pilot-scale** (small N); accuracy figures are directional until the labeled set is
  expanded per the documented protocol.
- Independent review shares a model family with the adjudicator unless providers are split; for full
  independence run the reviewer on a different vendor.
- The authenticity signal is a **soft** visual opinion, not forensic proof of manipulation.
