# Fresh-session brief — Rebuild the PromoProof demo for LEGIBILITY (keep the style)

You are working on **PromoProof**, an entry for the Hedera AI Bounty (Week 2 — "Enterprise Agent +
Plugin"). The backend, the Hedera Agent Kit plugin, the on-chain settlement, the security, and an AP2
integration are **all built, tested, deployed, and working** — do not rebuild them. Your job is a
**UX / narrative rebuild of the demo experience** so a non-expert understands the product and the tech.

## The problem you're solving (read this twice)
The current UI is visually excellent — great components, colours, motion — but **narratively
unreadable.** A hackathon judge watching a ≤90s video or visiting the site cold **cannot tell**: what it
does, why it matters, how the AI agent actually works, where the Hedera Agent Kit plugin is used, what
goes on-chain vs. stays private, how a third party verifies it, or how money moves safely. It reads as
"pretty AI slop." **The product is complex and the tech is more complex — so the demo must teach it,
step by step, showing the actual technology at each step.** That is the entire task: make every step
explain itself and surface the real mechanism.

## Hard constraints
- **KEEP the existing design system exactly** — components, colour tokens, fonts, animations. Reuse
  `app/console/primitives.tsx`, `app/console/components.tsx`, `app/globals.css`,
  `docs/DESIGN_BRIEF.md`. This is a **re-architecture for legibility, NOT a restyle.** The look is loved;
  the *legibility* is the problem.
- **Do NOT touch** the backend, the agent loop, the `tpp-evaluator` plugin, the no-drain settlement
  core, the security gate (`lib/guard.ts`, `PUBLIC_READONLY` mode), or the AP2 integration. All done.
- **Do NOT break** the live deployment (promoproof.liftbyai.com) or the public/operator gate.
- **Read first:** `CLAUDE.md` and `AGENTS.md` (Next.js 16 differs from your training data — read
  `node_modules/next/dist/docs/` before new route/config code; MCP-first discipline; surgical changes).
- Don't add product features. Don't make it denser. Make it **clearer**. A `frontend-design` skill is
  available and may help — but it must preserve the established visual language, not introduce a generic
  look.

## What PromoProof is (the value the demo must convey)
CPG brands pay retailers ~$30B/year in "trade promotions" (end-caps, displays). Proof-of-performance is
audited **by hand** against bespoke per-retailer contracts; settlement lags 60–120 days; deduction
disputes are endemic and resurface years later. **PromoProof is an AI agent that reads the bespoke
contract, judges the retailer's in-store proof photo against it clause-by-clause, negotiates when
evidence is borderline, and settles on Hedera — with zero confidential data on-chain.** Trust on both
sides: the AI judgement is auditable, and the settlement is trustless + confidential.

## The technology the demo MUST make visible and explain (in plain language)
1. **The agent + the plugin.** A Hedera Agent Kit **v4 plugin** (`lib/plugins/tpp-evaluator/`) exposes
   three tools: `adjudicate_claim` (multimodal judgement), `compute_settlement` (deterministic, capped),
   `propose_settlement` (scheduled 2-signature transfer). The demo should *show the agent calling these
   tools* and label them as the plugin in action.
2. **Phased, anti-hallucination reasoning** (observe → extract → reconcile → decide) + a **second,
   independent model reviewer** + a **deterministic safety gate** (low-confidence/flagged → auto-escalate
   to a human). Explain *why* (reliability for AI that touches money).
3. **Clause-cited verdict + visual grounding** (bounding boxes on the photo) + **citation verification**
   (cited clauses are checked to actually exist — no fabricated citations). "Judgement, not OCR."
4. **Commitments on-chain, business data off-chain.** Only a salted Merkle root + a keyed image
   fingerprint go to **HCS** — no amounts, parties, or reasoning. Tamper-proof + timestamped forever.
5. **Selective disclosure + Merkle proof.** From the public hash, prove *one* field (decision, amount)
   against the chain, revealing nothing else. The dispute artifact.
6. **Mutual-consent settlement (no-drain).** A scheduled `pUSDC` transfer that executes only when the
   **brand AND retailer both sign on-chain**; the agent holds no fund-moving key → it physically cannot
   drain funds (the bounty's hard rule, enforced by Hedera consensus). An attestation NFT mints on
   execution.
7. **Trust/governance layer:** model-risk evidence, a provable HCS-anchored access log, dispute/
   chargeback as a linked on-chain record, and an **AP2 (Agent Payments Protocol)** payment-mandate
   export. Show each with a one-line "why it matters."
8. **Real on-chain artifacts** (testnet): HCS topic `0.0.9069962`, attestation NFT `0.0.9088330`, pUSDC
   `0.0.9089483`, brand `0.0.9089484` → retailer `0.0.9089486`. Make these clickable (HashScan).

## The current UI (what you're working with)
- **`app/components/Console.tsx`** — the LIVE agent console (useChat → `/api/agent`); the "Adjudication"
  workspace body.
- **`app/console/Console.tsx` + `app/console/data.ts`** — a **scripted, deterministic** console (a
  run-state machine: empty→streaming→verdict→evidence→revised→pre_settle→settled) with **real HashScan
  links**. Served at `/preview` and as the public Adjudication. **This is your best foundation for a
  reliable, recordable demo** (no LLM rate-limit risk; consistent every take).
- **`app/console/Shell.tsx`** — a workspace shell (nav: Adjudication / Trust Center / Model Risk /
  Settlement & Fund) with public (read-only + scripted) vs operator (live) mode.
- Components to reuse: `components.tsx` (`VerdictCard`, `ToolChip`/`ToolChipList`, `TimelineRow`,
  `MutualSettlement`, `Dossier`, `VerifyPanel`, `RevisionDiff`, `EvidenceRequest`), `primitives.tsx`
  (`DecisionBadge`, `StatusChip`, `ClauseChip`, `ConfidenceMeter`, `ProofPhoto`, `ToolDot`, `DocSeal`…),
  `Evidence.tsx`, `Markdown.tsx`, and the workspace panels (`AuditLedger`, `AccessLog`, `ModelRisk`,
  `AccrualFund`, `PortfolioPrivate`, `Dispute`, `Ap2Mandate`).
- Reference: `README.md`, `docs/ARCHITECTURE.md`, `docs/DEMO_SCRIPT.md`, `docs/AP2.md`.

## Design direction: a guided, self-explaining narrative
Build a **guided walkthrough** as the primary experience (front door / a prominent "Guided tour"), on
the **deterministic scenario data** (reliable for recording + safe for the public deploy), with the
dense operator console kept available behind it. Lead the viewer through the story; **each step is a
"scene" that teaches**: a clear heading, one or two plain-language sentences (*what's happening + why it
matters*), the **actual tech shown and annotated**, and a clickable on-chain proof where real. Use
progressive disclosure — start simple, reveal depth on demand. Generous labeling. Think "annotated
museum exhibit," not "trading terminal."

### The storyboard (each scene = what to show + the plain-language explanation)
0. **Frame it.** One screen: the pain ($30B, audited by hand, disputes resurface) + the one-liner
   ("Reads the contract. Judges the proof. Settles on Hedera — provable to anyone, confidential to
   everyone else.") + a small labeled flow diagram: *Contract + Photo → Agent → Verdict → Commit →
   Verify → Settle.* Let the viewer pick a claim.
1. **The claim (inputs).** Show the bespoke contract prose + the proof photo + the retailer's narrative.
   Explain: "Every retailer's contract is different — that's why this is audited by hand today."
2. **The agent works (make the plugin visible).** Show the agent calling `adjudicate_claim` — label it
   "Hedera Agent Kit v4 plugin tool." Reveal the phased reasoning, the independent reviewer pass, and the
   safety gate, each with a one-line "why." This is where a viewer SEES the AI agent + plugin working.
3. **The verdict (explain the judgement).** The `VerdictCard`: decision + per-criterion clause-cited
   findings + visual-grounding boxes on the photo + citation-verified ticks + confidence. Caption:
   "Judgement, not OCR — it cites the contract clause for every finding and shows you where in the photo."
4. **Commit on-chain (explain confidentiality).** Animate/show the HCS commit; explain "the public
   ledger gets only a salted hash — no amounts, parties, or reasoning — yet it's tamper-proof and
   timestamped forever; a database could be edited, this can't." Show the proof-only record + a HashScan
   link.
5. **Verify (the aha — selective disclosure).** From the public hash, prove one field against the chain
   via a Merkle proof, revealing nothing else ("✓ proven against on-chain commitment seq #N"). Explain
   why a years-later dispute needs exactly this.
6. **Settle (no-drain, explained).** The scheduled `pUSDC` transfer needing BOTH signatures; "the agent
   has no key that can move money — it physically can't drain funds; it executes only when the brand and
   the retailer both sign, enforced by Hedera consensus." Show both signatures → executed → attestation
   NFT, with HashScan links.
7. **Trust & governance (brief, each with a 'why').** Model risk (is the AI right?), the provable access
   log (who saw what), dispute (resurfaces → linked on-chain), AP2 mandate (the agent-payments standard,
   backed by consensus).
8. **Recap the value** + the live URL + the real on-chain artifacts.

The existing scripted `Console.tsx` already has a stepped timeline (run-states + `TimelineRow`s) — evolve
it into this explained, scene-by-scene narrative; don't start from scratch.

## Success criteria (the bar)
Show it to someone who has never seen PromoProof. Within ~90 seconds they can answer, unprompted:
1. What problem does this solve? 2. What did the AI agent actually *do*? 3. Where is the Hedera Agent
Kit **plugin** used? 4. What went on-chain and what stayed private — and why? 5. How can a third party
**verify** a decision? 6. How is money moved **safely** (why can't the agent drain it)?
If they can't answer those from watching, it is **not done**. Optimize for that, not for visual density.

## Context / logistics
- One-shot bounty submission; Week 2 closes Sun 2026-05-31 23:59 UTC (a quality rebuild may need more
  time — flag to the founder if so; a later week is an option).
- Deployed: promoproof.liftbyai.com (Oracle box; `PUBLIC_READONLY=1`; operator token unlocks live mode).
  Build is **standalone** (`output: "standalone"`); deploy via `docs/DEPLOY_PROMOPROOF.md` (build locally,
  rsync the bundle, `systemctl restart promoproof`).
- Verify locally with `pnpm dev`; `pnpm build` + `pnpm test` must stay green; the founder records the
  ≤90s video from the (deterministic) guided walkthrough.
- Work on a feature branch; small focused commits; keep the no-drain invariant and the gate intact.
