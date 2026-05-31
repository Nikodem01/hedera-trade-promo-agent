# Decisions log

Non-obvious choices, per the project constitution (CLAUDE.md §6/§11). Newest first.

## v2.2 — full roadmap build (Tiers 1–3 + Part D; founder: "do everything")
Verified on testnet unless noted.
- **Dual-model reviewer (D#3).** A second model audits the primary assessment for hallucination /
  unsupported decisions (`ReviewerAssessment`); concurrence chip on the VerdictCard. Plus deterministic
  **citation verification** (every cited clause must exist in the contract). Doubles vision cost — fine
  for the demo.
- **Timed refund + per-promotion escrow.** `setup-settlement.mjs` now creates a dedicated escrow
  account (`PROMO_ESCROW_ID`, brand-approver key) funded from the brand treasury; `propose_settlement`
  releases FROM the escrow; `/api/escrow/refund` schedules a **waitForExpiry=true** escrow→brand return
  of the unspent accrual (HIP-423 timed auto-execution). Escrow `0.0.9091759`.
- **Batched Merkle anchoring (Tier 2).** `lib/batch-store.ts` + `/api/batch/seal` roots N commitments
  into ONE on-chain message (verified: 8→1 at seq #55); `/api/batch/verify` proves a commitment's path
  to the on-chain batch root. Scale + per-decision-timing privacy.
- **W3C Verifiable Credential (Tier 2).** `/api/credential` issues a `VerifiableCredential`
  /`TradePromotionSettlement` with `did:hedera:<net>:<acct>` issuer/subject and a proof bound to the
  commitment + an issuer signature (operator key). Full Hedera DID-document registration = production path.
- **ERP/EDI export (Tier 3).** `/api/export` emits settlements as CSV and an **EDI-812**-shaped JSON
  (Credit/Debit Adjustment) with `reference_commitment` per line, for AP/AR reconciliation.
- **Compliant settlement token (Tier 3).** `scripts/setup-compliant-token.mjs` creates an HTS token with
  **KYC + freeze + pause** keys, KYC-grants the parties, and demonstrates freeze/unfreeze (`0.0.9091963`).
  HTS-native equivalent of Stablecoin Studio / ERC-3643; kept separate from the live demo flow.
- **Conversational audit (D#6).** `/api/ask` answers NL questions over the off-chain portfolio (LLM,
  records-only). **Queue + batch intake:** the claim picker is the queue; "+ import claim" adds a pasted
  promotion to the live queue; the portfolio is the ops dashboard.
- **Supporting.** Multi-photo (`additional_image_refs` → multiple image parts to the model);
  PDF contract ingestion (`/api/contract/parse` via `pdf-parse` v2 `PDFParse.getText`, dynamic import);
  multi-language (adjudicator prompt reasons in the source language, summarizes in English).
- **NOT built (per plan's NOT-now):** full multi-tenant SSO, certified ERP connectors, x402, HCS-10,
  bespoke escrow smart contract.

## v2.1 — trustworthy-AI layer + accrual escrow + governance
- **Visual grounding (D#1).** The vision model returns a per-criterion bounding box
  `[ymin,xmin,ymax,xmax]` (0-1000, Gemini convention; optional in `CriterionAssessment`);
  the VerdictCard overlays them on the proof photo and hover-highlights per criterion.
  Verified live: model returned 4 boxes for the oreo claim. "Judgement, not OCR" made visible.
- **Photo authenticity (D#2).** `lib/authenticity.ts`: objective **EXIF** capture-time/GPS
  (via `exifr`) + the model's soft visual `manipulation_likelihood`. Surfaced in a VerdictCard
  panel and committed as a dossier leaf. Cross-claim **reuse** stays the on-chain image_fp check.
  (Our stock photos are EXIF-stripped → "no verifiable capture metadata", which is itself the honest
  signal.) Deliberately framed as corroborating, spoofable evidence — not proof.
- **HIP-423 long-term settlement.** `propose_settlement` now sets a **60-day** schedule
  `expirationTime` + **`waitForExpiry=false`** — real multi-day approval windows, still executing the
  instant both signatures arrive. Verified on testnet: setting `expirationTime` WITHOUT
  `waitForExpiry=false` defers execution to expiry (a trap); with it, immediate execution returns.
- **Accrual escrow framing.** The brand treasury is the pre-funded pUSDC accrual pool; settlements
  draw it down on mutual consent. `/api/escrow` + `AccrualFund` show the fund + released (live:
  99,940 remaining / 60 released). Matches real trade-spend accounting (accrue up front, draw down on
  proof). Unspent-refund = a `waitForExpiry=true` long-term schedule (mechanism proven in
  `scripts/test-longterm-schedule.mjs`; full timed-refund automation deferred).
- **Human override = its own on-chain commitment (governance, EU AI Act Art. 14).** `/api/override`
  builds a salted-Merkle commitment over `{prior_decision, new_decision, reason, analyst, …}` (via
  `buildCommitment`), stores the dossier, and anchors a proof-only `{kind:"override", commitment,
  links_to:<original>, ts}` to HCS. Tamper-proof oversight evidence, itself selectively disclosable +
  verifiable. Verified on-chain (seq 52). The new decision/reason stay off-chain (proof-only).
- **Leakage/ROI (D#5).** `/api/portfolio` returns `recovered` = $ withheld vs naively paying every
  resolved claim in full (reject → full max; partial → the shortfall). Shown in the private portfolio.
- **Dispute / post-audit defense** needs no new mechanism: re-adjudication is the negotiation loop;
  "defend a deduction years later" is `/api/disclose` + `/api/verify` on any historical commitment.
- **D#4 accuracy benchmark** = the ledger-asserted `scripts/eval-decisions.mjs` (3 labeled scenarios +
  the revise arc); a larger labeled benchmark + a metrics page is roadmap (we only have 3 real photos).

## v2 settlement — mutual consent on-chain (gold-standard no-drain)
Settlement is no longer the agent calling transfer_hbar. The agent has NO fund-moving
tool; money moves only on a two-party on-chain signature.
- **Stablecoin, not HBAR.** Settle in `pUSDC` (6-dp USD-pegged HTS token, `0.0.9089483`;
  prod = Circle USDC mainnet `0.0.456858` / Stablecoin Studio). HBAR is volatile — no
  CPG settles in it.
- **Two parties, distinct keys.** Brand treasury `0.0.9089484` (spend key = brand
  approver, NOT the agent key); retailer `0.0.9089486` with `receiverSigRequired=true`.
  Created/funded by `scripts/setup-settlement.mjs` (keys in .env.local).
- **`propose_settlement` (custom tool, raw SDK) only SCHEDULES.** It creates a
  `ScheduleCreateTransaction` wrapping a pUSDC transfer brand→retailer (capped,
  recipient fixed). The agent/operator holds neither the brand-approver nor retailer
  key, so it physically cannot execute. The kit has no schedule-create tool — done via
  `@hiero-ledger/sdk`.
- **Consent = two on-chain signatures.** `/api/settlement/sign` adds the brand
  approver's signature (authorize) and the retailer's (accept). Hedera executes the
  transfer automatically once BOTH are present (Scheduled Transactions +
  Receiver-Signature-Required). The executed transfer is the non-repudiable, mutually
  agreed close of the claim. Verified live: schedule `0.0.9089564` stayed pending after
  the brand signature alone, executed on the retailer's; attestation NFT minted on
  execution (metadata = the decision commitment). This is the bounty's hard rule
  enforced by consensus, not app logic.
- LLM money authority: **zero** — no tool moves funds; `compute_settlement` only
  computes the capped figure; `propose_settlement` re-caps; both signatures are humans'.

## v2 re-architecture — confidential, verifiable (Baseline-style)
Driver: an enterprise will not put bespoke trade terms / settlement economics on a
public ledger, and a DB could approximate our old on-chain audit. Fix: **commitments
on-chain, business data off-chain** (the Baseline Protocol pattern; EDPB blockchain
guidance), so Hedera becomes the neutral, tamper-proof *notary* a DB can't be.
- **Proof-only on-chain record.** The HCS message is now `{schema:"PromoProof/v2",
  kind, commitment, image_fp, ts}` — a salted Merkle root + a keyed image fingerprint,
  nothing else. No retailer, terms, amounts, model, decision, or reasoning on-chain.
  Verified live: topic record #47 carried exactly those 5 keys. (Was `PromoProof/v1`
  with retailer/amounts/reasoning in the clear — that leaked and is gone.)
- **Off-chain dossier + per-leaf salts.** `lib/dossier.ts` captures the FULL decision
  provenance (contract, narrative, image hash, system prompt, model, thinking settings,
  decision, confidence, amounts, reasoning, parties, per-criterion findings) as Merkle
  leaves, **each with its own random salt** (`lib/merkle.ts`: `sha256(0x00‖salt‖label‖
  value)`, nodes `sha256(0x01‖L‖R)`). Per-leaf salts stop a disclosed field's salt from
  unmasking a low-entropy sibling (e.g. guessing decision=approve). The dossier + salts
  live ONLY in a server-side store (`lib/dossier-store.ts`, tmpdir for the demo;
  encrypted DB in prod) — never sent to the LLM, the browser, or the chain.
- **Anchoring moved into code, out of the prompt.** `adjudicate_claim` builds the
  dossier and submits the proof-only commitment to HCS itself (deterministic), so the
  model never composes or handles the on-chain payload — guarantees proof-only and
  removes the old "submit audit_record verbatim" prompt step.
- **Selective disclosure = the dispute artifact.** `/api/disclose` (operator) emits a
  package of chosen leaves + their salts + Merkle proofs; `/api/verify` re-derives each
  leaf, checks its proof against the commitment, confirms the commitment is on the
  Mirror Node, and flags `image_fp` reuse under a different commitment. Verified live:
  full disclosure proves all 19 fields against seq #47; flipping `decision` fails its
  proof. The verify panel reveals+proves; nothing confidential is on-chain.
- **Keyed image fingerprint** (HMAC, `IMAGE_FP_KEY`) not a raw hash — stable for
  cross-claim reuse detection by key-holders, not a public re-identifiable fingerprint.
- Public AuditLedger now shows commitments only ("◆ decision commitment"); decision
  mix / settled value move off-chain (confidential) — to be surfaced in the private
  operator view (P5). Plan: `~/.claude/plans/...enumerated-blanket.md`.

## Enterprise trust layer
- **Two hashes, two jobs.** `evidence_hash` binds the decision to the full judged
  context (contract + narrative + prior evidence + model + image bytes) →
  tamper-evidence for *this* claim. New **`image_hash`** = sha256 of the proof photo
  **bytes alone** → a stable photo identity across claims, so the same photo reused
  under a different contract is detectable on the ledger (proof-reuse fraud). Both
  are computed in code and written into the HCS `audit_record`.
- **Hash separator is a NUL byte, deliberately.** `evidenceHash` joins parts with
  `\0`, not a space. When refactoring `evidenceHash` to a narrow `HashableEvidence`
  param (so the verify route can reuse it via the exported `recomputeHashes`), the
  NUL separator was preserved byte-for-byte — changing it would invalidate every
  `evidence_hash` already on-chain.
- **`/api/verify` = recompute + match + reuse.** It (1) independently recomputes the
  hashes from the evidence on screen, (2) confirms the `evidence_hash` exists on the
  Mirror Node ledger (returns seq # + consensus time), (3) flags the same
  `image_hash` under a *different* `evidence_hash` as proof reuse. The Mirror Node
  fetch was extracted to `lib/hedera/mirror.ts` and shared with `/api/audit`.
- **Verify uses the adjudication tool's EXACT input**, not a reconstruction. The
  on-chain `evidence_hash` was computed from the precise `contract_text`/`narrative`
  the LLM passed to `adjudicate_claim` (it may reformat the prompt's contract text).
  The console threads `part.input` into the verify panel, so the recompute matches.
  A CLI recompute from the raw fixture file will *not* match `evidence_hash` (it does
  match `image_hash`, which is photo-only) — expected, not a bug.
- **Portfolio stats are derived from the on-chain decision records** (count, decision
  mix, and approved value = Σ `pct/100 × max_settlement_hbar`). No new fetch — reuses
  the ledger AuditLedger already loads. USD shown as an explicitly *illustrative* rate.
- **Audit dossier = browser print-to-PDF**, not a PDF library. `window.print()` +
  an `@media print` stylesheet that shows only `.print-dossier`. Zero new deps,
  reliable "Save as PDF"; a real PDF lib (`@react-pdf/renderer`) is deferred.
- **Eval runs are spaced AND assert from the chain** (`scripts/eval-decisions.mjs`,
  `EVAL_DELAY_MS` default 20s). Firing the 3 claims back-to-back trips the free-tier
  LLM rate limit; spacing keeps it under the per-minute cap. The decision is read
  back from the audit ledger (Mirror Node), not scraped from the response stream
  (which escapes the tool JSON) — so the assertion also proves the on-chain write.
- **STP policy is a label, never an actuator.** The verdict card shows an
  "STP-eligible / Manual review" badge (auto-clear when `confidence ≥ 0.9` and
  contract max `≤ 25 HBAR`). It only routes/labels; the human consent gate
  (`PreSettlement`) is always enforced before funds move, so the policy can't
  auto-drain. No change to `compute_settlement`'s caps.
- **NFT attestation receipt is opt-in, not a rewrite.** Only when
  `HTS_RECEIPT_NFT_TOKEN_ID` is set does the receipt mint become a unique NFT
  (`mint_non_fungible_token`, `uris=[evidence_hash]`); unset → the verified fungible
  flow is byte-identical. Kit tool names confirmed via MCP/source:
  `create_non_fungible_token_tool`, `mint_non_fungible_token_tool` (params
  `{ tokenId, uris[] }`, ≤100-byte metadata). `setup-hedera.mjs` now creates the
  collection per-resource (idempotent); `HcsAuditTrailHook` watches both mint tools.
  **Verified on-chain (founder pre-authorized the testnet action):** collection
  `0.0.9088330` created; an approve→settle minted **serial #1** whose metadata
  decodes to the decision's `evidence_hash` exactly; HBAR settled at the 30 cap
  (no-drain held). `.env.local` now has `HTS_RECEIPT_NFT_TOKEN_ID=0.0.9088330`, so
  the live build mints NFT attestations. (The HCS sequence number from the verify
  panel remains a zero-setup per-decision attestation id too.)

## Stack corrections (Agent Kit v4)
- **SDK: `@hashgraph/sdk` → `@hiero-ledger/sdk`.** The kit's real dependency is the Hiero
  SDK; the `Client`/`PrivateKey` handed to `HederaAIToolkit` must come from it. Removed
  `@hashgraph/sdk`.
- **Added `@hashgraph/hedera-agent-kit-ai-sdk`** (the `HederaAIToolkit` adapter) — a separate
  package in v4, not the core.
- **Pinned `ai` to 6.0.191 via pnpm override.** The toolkit declared `ai@6.0.86`; two copies
  made the branded `Schema`/`ToolSet` types mismatch. One copy fixes both type and runtime.
- **zod 4.4.3 → ^3.25.** The kit pins zod 3.25 and bundles `zod-to-json-schema@3`; tool
  `parameters` must be zod-3 schemas. AI SDK v6 accepts zod 3.

## Hedera
- **ECDSA keys** (portal.hedera.com default), not ED25519 → `PrivateKey.fromStringECDSA`.
- **Audit hook tool names are `*_tool`-suffixed** (`transfer_hbar_tool`, `mint_fungible_token_tool`).
  The docs example (`'transfer_hbar'`) is simplified; the hook matches against each tool's
  `.method`, verified from source.
- **Settlement infra is one-time, created by `scripts/setup-hedera.mjs`** (HCS topic + HTS
  receipt token), with an idempotency guard. IDs live in `.env.local`.
- **Smoke/settlement recipient defaults to `0.0.98`** until a dedicated retailer wallet is set
  (`RETAILER_WALLET_ID`).

## Product / architecture
- **Adjudication-centric, not a pipeline.** The plugin is intentionally tiny: one LLM tool
  (`adjudicate_claim`, Opus 4.7 multimodal — reads bespoke contract prose, judges the photo,
  resolves ambiguity, cites clauses, recommends one of five decisions) and one deterministic tool
  (`compute_settlement`). Litmus test: remove the LLM and the product cannot adjudicate.
- **The agent has no money authority (no-drain design).** The LLM only *recommends*;
  `compute_settlement` enforces the payout — `approve → 100%`, `partial_credit → recommended %`,
  else `0` — hard-capped at the contract maximum and a global `SETTLEMENT_HARD_CAP_HBAR` (default
  50). The recipient is a fixed registered wallet, never model-chosen. This is the mechanism that
  satisfies the bounty's "impossible to drain funds without explicit consent" rule; settlement
  also requires a human "approve & settle" turn.
- **Five-way decision** (approve / partial_credit / reject / request_more_evidence /
  escalate_human) so ambiguity is first-class; the borderline → ask-back → revise loop is the
  hero scene.

## v2.3 — enterprise-grade depth (model risk + governance)
- **Deterministic safety gate makes the independent reviewer load-bearing (A3).** Previously the
  second-model reviewer's `recommended_action: "escalate"` was captured in the dossier but never
  acted on — advisory only. Now `lib/plugins/tpp-evaluator/safety-gate.ts` runs in code after the
  reviewer, before settlement: if the reviewer recommends escalation OR confidence < `CONFIDENCE_FLOOR`
  (default 0.5), a **final** decision (approve / partial_credit / reject) is forced to
  `escalate_human` and credit % to 0. It only ever *withholds* — `compute_settlement` pays 0 for
  `escalate_human`, so this is defense-in-depth on the no-drain invariant, never a way to approve.
  `request_more_evidence` and `escalate_human` pass through untouched (already safe holding states,
  and so the negotiation loop / Cadbury demo beat is unaffected). The dossier records both the
  model's original decision and the gate reasons as committed leaves (`safety_gate`), so the
  override is transparent and selectively disclosable. Floor is env-tunable so a curated set sitting
  near the boundary doesn't trip it.
- **Dossier store encrypted at rest (B1).** AES-256-GCM via `lib/crypto-box.ts`; key from
  `DOSSIER_ENC_KEY` (scrypt, fixed app salt for deterministic derivation so files stay readable across
  restarts). Graceful: plaintext fallback when no key (dev), and legacy plaintext files still read. The
  seal/open round-trip + fail-closed-on-tamper is unit-tested independent of fs/env.
- **Provable access log (B2/B3).** `lib/access-log.ts` records every disclosure: who (a thin
  `actor_role` label — attribution only, NOT auth; SoD remains the separate on-chain keys), what
  (scope/labels), when — sealed off-chain as its own salted commitment, with only a proof-only
  `kind:"access-log"` record linked to the decision anchored on HCS. Best-effort anchor (a logging
  failure must never break the disclosure). A consensus-anchored access trail is the SOC2/ISO-42001
  control made *unforgeable* — a hosted DB log isn't.
- **Crypto-shredding deletion (B4).** `deleteDossier` removes the off-chain dossier; because only the
  salted root is on-chain, the commitment becomes permanently un-openable — GDPR/EDPB right-to-erasure
  satisfied without touching the immutable proof.
- **Dispute / chargeback as a linked commitment (C1).** `app/api/dispute` records a party contesting a
  settled/rejected claim as a proof-only commitment linking to the original (mirrors the override
  anchoring pattern); distinct from override (internal oversight vs a counterparty contesting).
  Re-adjudication reuses the existing agent negotiation loop — no duplicated logic, no new UI furniture
  (the ops/BI dashboard + SLA/metrics slice of this axis was deliberately cut). The original decision →
  dispute → revised outcome form an immutable, selectively-disclosable chain — the "deductions resurface
  years later" pain made provable.

## v2.4 — secure public hosting + enterprise UI shell
- **Security boundary is the reverse proxy + per-route guards, NOT middleware.** Next middleware is
  bypassable (CVE-2025-29927) and "not a security boundary"; so `lib/guard.ts#requireAccess` is enforced
  INSIDE each of the 11 mutating/expensive route handlers (agent, ask, settlement/sign, escrow/refund,
  override, dispute, upload, contract/parse, disclose, batch/seal, credential). Same-origin (CSRF) check
  + in-memory rate limiter (`lib/ratelimit.ts`). Security headers via `next.config.ts headers()` (CSP
  shipped Report-Only first to not break the inline-style UI — flip to enforced after a visual check).
  `import 'server-only'` on key modules (vitest aliases it to a no-op shim). Host hardening in
  `docs/DEPLOY.md`. **Dedicated low-balance testnet account** for public deploys caps blast radius.
- **Exposure model (superseded by v2.6):** the public demo originally used a scripted tour + operator
  unlock. v2.6 keeps the cached anchor but adds a rate-limited live sandbox and removes the operator
  unlock from the public chrome.
- **UI = app shell + 4 workspaces (NOT a BI dashboard — that furniture stays cut).** `app/console/Shell.tsx`
  wraps the existing audit-grade design system: Adjudication (live/scripted), Trust Center (public ledger
  + NEW `AccessLog` of disclosure/override/dispute events + operator audit query), Model Risk (the strip
  promoted to a full MRM view), Settlement & Fund (accrual + portfolio + NEW `Dispute` raise UI). Client-
  side workspace switching keeps the live agent stream mounted (`hidden`); the live `Console` was slimmed
  to the Adjudication body (its 5 trailing panels moved into workspaces; `onRunComplete` refreshes them).

## v2.5 — featured "Life of a Claim" run captured live on-chain (2026-05-31)
- **The capture was blocked by a Next gotcha, not tooling flakiness.** The dev capture utility lived at
  `app/api/_capture/route.ts`; a leading-underscore folder is a Next **private folder** (opted out of
  routing), so `POST /api/_capture` 404'd. Renamed to `app/api/capture`; dev-only gating is the
  `PUBLIC_READONLY` 403 guard *inside* the handler (403 on any public deploy), not the folder name.
- **Zero-chain `dryRun` mode added to the capture route** (no client → `adjudicate` never anchors; skip
  propose/sign/mint), so the exact decisions/boxes/settlement are previewed BEFORE any on-chain write —
  the literal implementation of "don't fire a real tx blind." Results persist to a file and are read back
  independently, robust to dropped command output.
- **Hero arc = honest partial-credit, not approve.** A dry run showed the model approves 100% on the
  original contract (clause (a) only required "live within the window"). To make partial-credit the
  TRUTHFUL outcome (not coaxed), `examples/contracts/02-cadbury-easter-display.txt` clauses (a)/(f) were
  rewritten to require the FULL four-week window with a pro-rata fee. Evidence of "3 of 4 weeks" then
  yields a defensible 75% → 18.75 pUSDC, which the model derives itself ("3 of the 4 contracted weeks…
  pro-rated at 75%").
- **Model: `gemini-3.1-flash-lite-preview`.** Gemini 3.1 Pro is paid-tier only on the project key
  (free-tier quota 0); flash-lite produced a textbook result (correct ask-back, plausible boxes, reviewer
  concurrence), so the demo stamps the model that actually ran and that live operator mode uses.
- **Captured artifacts (testnet, all resolve on HashScan):** this development capture was superseded by
  the clean Week 2 public capture in v2.6 below. Every value was independently re-verified against the
  mirror node before patch.
  `FEATURED` in `app/console/data.ts` now holds these real values verbatim; only display labels
  (claimId/contractId/submittedAt/submittedBy) frame the demo, and pass-1 credit% is shown as 0 (no
  credit until evidence). The selective-disclosure package now genuinely verifies via `/api/verify`
  (self-contained: re-derives Merkle proofs + reads the commitment back from the mirror node).
- **Deploy IP corrected:** the prod box is `140.238.202.68` (promoproof.liftbyai.com), not the
  `161.33.234.128` in the old runbook — `docs/DEPLOY_PROMOPROOF.md` fixed.

## v2.6 — clean Week 2 public topic + unified demo (2026-05-31)
- **Clean proof-only HCS topic created:** `0.0.9104996`. The public demo now points at this fresh topic
  instead of the older mixed-history development topic. New captured records on this topic contain only
  proof-only adjudication commitments: salted Merkle root, keyed image fingerprint, schema/kind, and
  timestamp.
- **Featured run recaptured on the clean topic:** pass-1 `request_more_evidence` anchored at seq 1; pass-2
  `partial_credit` anchored at seq 2 (commitment `a0d2162e…`); settlement schedule `0.0.9105009`
  executed for 18.75 pUSDC; attestation NFT serial `5`.
- **Topic-per-claim decision:** deferred. One clean topic per public demo/workspace is the safer deadline
  posture: easier for judges to inspect, easier for `/api/verify` to prove, and still confidential because
  privacy is enforced by proof-only payloads rather than topic fragmentation.
- **Public demo unified:** public visitors see a single interactive surface with a cached anchor plus a
  rate-limited live sandbox. The separate operator unlock is no longer part of the public chrome.
