# Fresh-session brief — ideate & build the winning push (PromoProof, Hedera Bounty Week 2)

> Paste this whole file as the first message of a fresh Claude Code session in this repo
> (`/home/domin/code/hedera-trade-promo-agent`). It is self-contained — assume zero prior context.

## Your role

You are the **intelligence layer** for PromoProof (constitution: `CLAUDE.md`, `AGENTS.md`). The founder
is the edge — only he can sign up, reveal keys, deploy, record/post the demo, and submit the bounty
form. Make sharp, opinionated decisions; push back on low-value work; scope to the deadline. Servile
agreement is a failure mode (CLAUDE.md §5).

## The mission

The product is **strong and fully working** (details below). Two prior iterations built the core and
then the enterprise-grade provenance + evidence-negotiation layer. Your job: **research + ideate the
highest-leverage REMAINING work to maximize the chance of winning**, propose a tiered plan, and (after
approval) execute. **Today is 2026-05-29; deadline is Sunday 2026-05-31 23:59 UTC (~2.5 days). Submit
~2h early.** Compute budget is comfortable — be ambitious, but **never jeopardize a submittable build
for gold-plating.**

The hard truth to internalize: with the product this complete, **the biggest remaining risk to winning
is submission execution, not features** — the demo video, the live URL, the required feedback issue,
and the form are not done yet. Weigh every new build against that.

## What exists and works NOW (verified — do NOT redo; read, then build on)

Stack: Next.js **16.2.6** (App Router, Turbopack) · React 19 · Tailwind 4 · strict TS · pnpm. Hedera
Agent Kit **v4** (`@hashgraph/hedera-agent-kit` + `-ai-sdk`) on `@hiero-ledger/sdk` · Vercel AI SDK
**v6** · zod 3.25 · `react-markdown` 10 + `remark-gfm` 4.

**Running on Gemini 3.1 Flash-Lite (free tier); pitch is "provider-swappable."** `LLM_PROVIDER=google`
in `.env.local`. Flip to `anthropic` for Sonnet-4.6 orchestration + Opus-4.7 vision (one env var; needs
Anthropic credit). This was a deliberate founder call — do not silently revert it.

- **Agent loop** (`lib/agent/index.ts`): single `streamText` orchestrator via `HederaAIToolkit`,
  AUTONOMOUS, `allCorePlugins` + the custom plugin, `HcsAuditTrailHook` on transfer/mint, `maxRetries`.
- **Provider switch** (`lib/agent/model.ts`): `orchestratorModel()`, `visionModel()`, and
  `visionModelId()` (the last feeds provenance).
- **Custom plugin** (`lib/plugins/tpp-evaluator/`): `adjudicate_claim` (multimodal, HIGH thinking,
  4-phase grounded prompt → typed `ComplianceAssessment` w/ 5-way decision + clause-cited criteria) and
  `compute_settlement` (deterministic, hard-capped). **No-drain design intact: LLM has no money
  authority; settlement is capped at contract max AND a global ceiling; recipient fixed; human
  approval gate.** Proven by `tests/injection.test.ts`.
- **On-chain reasoning provenance (built this iteration):** `adjudicate_claim` now also returns
  deterministic `provenance` (the exact `model` id, an ISO `adjudicated_at`, and a sha256
  `evidence_hash` over contract+narrative+prior_evidence+image bytes+model) and a canonical
  `audit_record` string. The prompt makes the agent submit that record to HCS **verbatim**. Verified
  on-chain (a `PromoProof/v1` record per decision, approve and reject).
- **Mirror Node read-back** (`app/api/audit/route.ts` + `app/console/AuditLedger.tsx`): the console
  reads the audit topic back from `testnet.mirrornode.hedera.com` (free, no key) and renders BOTH the
  `PromoProof/v1` decision records and the `HcsAuditTrailHook` fund-movement records — two provenance
  layers, fetched from the chain.
- **Evidence transparency** (`app/console/Evidence.tsx`): the proof photo (click-to-enlarge), the
  bespoke contract (collapsible), and the narrative are shown as the inspectable basis of judgement;
  the verdict's clause chips **cross-link** to the matching contract lines; the `VerdictCard` footer
  shows the model + `evidence_hash`.
- **Evidence negotiation, fully functional** — the demo's hero scene. On `request_more_evidence`, a
  live blue `EvidenceRequestPanel` shows the agent's exact ask with an inline reply that accepts
  **written evidence AND/OR a clearer photo**. New-photo upload goes out-of-band to
  `app/api/upload/route.ts` → stored in `os.tmpdir()` (`lib/uploads.ts`, strict uuid ids) → returns a
  tiny `upload:<id>` ref the agent passes to `adjudicate_claim` (the LLM never sees image bytes);
  served back via `app/api/uploads/[id]/route.ts`. **Verified end-to-end:** turn 1 → request → upload
  clearer photo → turn 2 re-adjudicates that image against the original contract → approve.
- **Hero frames:** `Approve & Settle` button (`PreSettlement` wired into live `Console.tsx`,
  consent gate visible) and **markdown prose closing** (`app/console/Markdown.tsx`; prompt steered to
  a short narrative, not a criteria-table re-dump — verified clean).
- **Console** (`app/components/Console.tsx`): live `useChat`; maps `adjudicate_claim`→`VerdictCard`,
  settlement→`SettlementReceipt`, others→tool chips; mock-driven design demo at **`/preview`**.
- **On-chain (testnet), live:** operator `0.0.9067781`; HCS topic `0.0.9069962`; HTS "PromoProof
  Receipt" **fungible** token `0.0.9069963`; retailer wallet defaults to `0.0.98`
  (`RETAILER_WALLET_ID`). A full approve→settle was re-verified this iteration (HCS audit + HTS mint +
  HBAR transfer, 30 HBAR = contract cap; no-drain held).
- **Fixtures corrected:** the 3 contracts/narratives now match the REAL photos (`public/proofs/`:
  `oreo.jpg` = freestanding floor tower by the dairy case; `Cadbury-Woolworths-Easter-POS-Unit_1.jpg`
  = Woolworths actionway FSDU, deliberately undated → the negotiation case; `licensed-image-ritz.jpg`
  = aisle shelf, not checkout → reject). **Why this mattered:** the prior idealized contracts made
  Gemini (correctly) misfire; the eval arc is now oreo→approve, cadbury→request→revise→approve,
  ritz→reject.
- **Deploy-safety:** proofs moved to `public/proofs/`; `next.config.ts` `outputFileTracingIncludes`
  bundles proofs (for `/api/agent`) and contracts (for `/`).
- **Tests:** `pnpm test` 9/9 (`compute-settlement` + `injection`). `pnpm build` clean (all routes).
  Dev drivers: `scripts/try-claim.mjs`, `scripts/try-approve.mjs [scenario] [followup]`. A dev server
  may be running on :3000.
- **Docs:** `README.md`, `docs/ARCHITECTURE.md`, `docs/DEMO_SCRIPT.md`, `docs/DESIGN_BRIEF.md`,
  `docs/decisions.md`. Prior plans: `~/.claude/plans/read-docs-next-iteration-brief-md-and-ex-jazzy-thimble.md`.

## Bounty facts (verified live earlier)

$750 HBAR, Week 2 "Enterprise Agent + Plugin", closes Sun 23:59 UTC. Needs: public repo, demo/social
URL, payout wallet, Hedera Agent Kit implementation writeup, a **feedback link** (GitHub issue/feature
request on a Hedera tool), up to **6 images**. Hard rule "impossible to drain funds without explicit
consent / human-in-the-loop" — **already satisfied by design.** No public scoring rubric (winners
inferred to need: real on-chain txns, enterprise-grade realism, demo quality, authentic feedback).

## What's NOT done — the open field

**Critical path (deadline-blocking, mostly founder-gated; I draft all copy):**
- `docs/AI_STUDIO_FEEDBACK.md` → a real GitHub issue. Strongest authentic seed: the
  `HcsAuditTrailHook` tool-name `*_tool` mismatch documented in `docs/decisions.md`.
- Reframe `README.md` + `docs/DEMO_SCRIPT.md` to **provider-swappable** (drop "Opus 4.7 is the edge";
  the edge is verifiable on-chain adjudication). Update README's `examples/proofs` → `public/proofs`,
  fungible-vs-NFT receipt wording, and the new evidence-upload + read-back features.
- Vercel deploy + encrypted env + smoke; the ≤90s demo video; prep the 6 images; the form copy.

**Candidate build work to research + judge ROI (ideate beyond this list):**
1. **Hash-verification UI ("verify against chain").** Recompute `evidence_hash` from the displayed
   evidence and show "✓ matches the on-chain record" — proves the verdict is bound to exactly this
   contract+photo, tamper-evident. Closes the verifiable loop visually; we already compute the hash.
   *Likely the cheapest high-impact differentiator.*
2. **NFT attestation receipt** (vs the current fungible token). Unique serial + metadata (decision,
   hash, HashScan). Stronger artifact. Needs a new NFT collection in `scripts/setup-hedera.mjs` + mint
   switch; metadata 100-char limit (use a `hcs://` URI or the hash). Kit exposes CREATE/MINT NFT tools.
3. **Contract published to HCS at intake** (HCS-1/2 flavor) — the *basis* itself immutable; reference
   its sequence # in the decision record.
4. **Automated adjudication eval test** — a gated vitest asserting the 3 decisions + the revise arc.
   Cheap regression insurance for the demo; arguably do regardless.
5. **Enterprise queue / multi-claim view** — pending claims with statuses + throughput stats; reads
   more like a revenue-management team's tool.
6. **Exportable/printable audit report** — a one-page filing an auditor could keep.
7. **Robustness** — exercise the `partial_credit` settlement and `escalate_human` UI paths; error /
   rate-limit visibility; edge/empty states.
8. **Two-sided brand→retailer claim-link flow** — now more feasible since upload works (brand creates
   a `/claim/[id]`, retailer opens it and uploads proof). Bigger and riskier; judge ROI vs deadline.
9. **HCS-10 OpenConvAI registration** — still likely low ROI (that was a *different* event's theme);
   confirm before spending.

## Constraints (honor these)

- **MCP-first** (CLAUDE.md §6): Hedera → `hedera-docs` MCP; third-party libs → `context7`; Next 16
  runtime/route issues → `next-devtools`. Never guess an SDK signature.
- **`AGENTS.md`**: Next.js 16 differs from training data — read `node_modules/next/dist/docs/` before
  writing Next code (route `params` are `Promise`; Route Handlers uncached by default; static `/` reads
  fixtures at build).
- **Do not break the no-drain design** (no LLM money authority; deterministic capped settlement; human
  consent gate). It's the bounty's hard rule.
- **Known limitation:** uploads use `os.tmpdir()` — solid locally / on a persistent host (fine for the
  demo), not guaranteed across Vercel instances. `lib/uploads.ts` is structured for a one-function swap
  to Vercel Blob if production-grade upload is wanted post-deploy. Founder deprioritized this for now.

## Deliverable

A **tiered, prioritized plan** (Impact × Effort × Risk) that **secures the submission first** (deploy +
demo + feedback issue + form), then sequences enhancement tiers; explicitly call out what to **NOT** do.
Recommend a single concrete sequence for ~2.5 days. Then enter plan mode and present for approval before
executing.

## How to start

1. Read `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/decisions.md`, `docs/ARCHITECTURE.md`,
   `docs/DEMO_SCRIPT.md`, and the prior plan above.
2. Skim `lib/agent/*`, `lib/plugins/tpp-evaluator/*`, `app/components/Console.tsx`, `app/console/*`,
   the three `app/api/*` routes, and `lib/uploads.ts`.
3. Re-verify the live bounty page; probe `hedera-docs` MCP on NFT mint/metadata, HCS-1/2, and Mirror
   Node hash-verification patterns; use `context7` for any new library.
4. Sanity-run the eval (dev server on :3000): `node scripts/try-claim.mjs oreo|cadbury|ritz` — confirm
   the arc still holds before planning on top of it. (Space runs out to dodge free-tier rate limits.)
5. Produce the tiered plan, ask the founder any scoping questions, propose for approval.

Be the intelligence layer. Lock the submission, then make it undeniable. Win it.
