# Decisions log

Non-obvious choices, per the project constitution (CLAUDE.md §6/§11). Newest first.

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
