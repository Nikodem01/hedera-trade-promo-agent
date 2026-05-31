# Bounty submission pack — Week 2 (Enterprise Agent + Plugin)

Everything to submit. Founder actions are marked **[YOU]**.

## Form fields
- **Project:** PromoProof
- **Repo:** https://github.com/Nikodem01/hedera-trade-promo-agent (merge PR #1 + #2 to `main` first — **[YOU]**)
- **Live demo:** https://promoproof.liftbyai.com  + the ≤90s video (**[YOU]** record)
- **Payout wallet:** **[YOU]** — your Hedera account id
- **Feedback link:** the GitHub issue below, posted on `hashgraph/hedera-agent-kit-js` (**[YOU]** post)
- **Description:** the writeup below

---

## Project description (paste into the form)
**PromoProof — confidential, verifiable trade-promotion settlement on Hedera.**

CPG brands pay retailers ~$30B/year in trade promotions, audited by hand against bespoke per-retailer
contracts; up to half of post-audit deductions are wrong and disputes resurface years later. PromoProof
is an enterprise agent (a **Hedera Agent Kit v4 plugin**, `tpp-evaluator`) that reads the bespoke
contract, judges the retailer's in-store proof photo against it clause-by-clause, negotiates when
evidence is borderline, and settles on Hedera — **with zero confidential data on-chain.**

Every decision's full provenance is committed off-chain as a per-leaf-salted Merkle tree; only a
proof-only commitment + a keyed image fingerprint are anchored to **HCS**. Any field is provable on
demand by selective disclosure (Merkle proof) without revealing the rest. Settlement is a **scheduled
`pUSDC` transfer that executes only when the brand approver AND the retailer both sign on-chain**
(HIP-423 + receiver-signature-required) — the agent holds no fund-moving key, so it physically cannot
drain funds; an attestation NFT mints on execution.

On top: a deterministic **safety gate** (low-confidence/reviewer-flagged decisions auto-escalate to a
human), an **independent dual-model reviewer**, **citation verification**, a live **model-risk**
dashboard, **encrypted-at-rest** dossiers, a **provable HCS-anchored access log**, dispute/chargeback as
a linked on-chain record, and an **AP2 (Agent Payments Protocol)** payment-mandate export — our
mutual-consent settlement expressed in the emerging agent-payments standard, backed by Hedera consensus.
Provider-swappable (Gemini/Anthropic). Live, read-only public demo + operator mode.

---

## Feedback issue (post on `hashgraph/hedera-agent-kit-js`) — **[YOU]**
**Title:** Feedback from building an enterprise settlement agent: scheduled-tx UX, tool-name/doc mismatch, packaging

**Body:**
> Built a production-style enterprise agent (trade-promotion adjudication + mutual-consent settlement) on Agent Kit v4. Genuinely strong DX overall — the `BaseTool` plugin model was clean to extend. Constructive feedback from the build:
>
> 1. **Scheduled-transaction UX is powerful but hard to discover.** The headline pattern of our agent — a settlement that executes only on two on-chain signatures — needs long-lived scheduled transfers plus later signatures. Agent Kit exposes scheduling params and schedule signing, but the docs/examples do not make the full mutual-consent settlement pattern obvious. A dedicated guide or higher-level `create_scheduled_transfer` example with `waitForExpiry=false` would help enterprise payment/custody agents.
> 2. **Tool method names are `*_tool`-suffixed at runtime** (e.g. `transfer_hbar_tool`, `mint_non_fungible_token_tool`) while docs/examples show the un-suffixed name (`transfer_hbar`). This cost real debugging time when matching tool calls in a hook/audit layer. Please align docs with the runtime `.method`, or document the suffix.
> 3. **Packaging/migration friction.** `HederaAIToolkit` lives in a separate `@hashgraph/hedera-agent-kit-ai-sdk` package, and the SDK is `@hiero-ledger/sdk` (not `@hashgraph/sdk`) — `Client`/`PrivateKey` must come from Hiero or types mismatch. A short "v4 packages + Hiero SDK" migration note in the README would save newcomers an hour.
> 4. **Peer-version pinning.** With Vercel AI SDK v6 we hit two copies of `ai` → branded `Schema`/`ToolSet` type mismatches until we forced a single copy; documenting the expected `ai`/`zod` peer ranges would help.
>
> Happy to PR a scheduled-transaction tool if useful.

---

## ≤6 images (capture these) — **[YOU]**
Record/screenshot from the unified public demo: Cached Anchor for the complete settlement arc, Live Sandbox for fresh proof-of-work when quota is available.
1. **Verdict card** — APPROVE with the visual-grounding boxes overlaid on the photo + per-criterion clause cites (`§…`). *"Judgement, not OCR."*
2. **Public ledger + Verify** — the commitment ledger row (hash + timestamp only) beside Verify: decision, economics, and the agent's reasoning/logic string proven via salted Merkle proof against the on-chain seq.
3. **Live Sandbox parity** — fresh Agent Kit stream resolving into the same verdict card, visual boxes, criteria matrix, settlement artifacts, and proof-only HCS/NFT calls.
4. **Settlement** — brand authorize + retailer accept → Settled + attestation NFT, with the HashScan links.
5. **Enterprise Governance & Audit Vault** — model-risk evidence, hashed access logs, dispute metadata, and raw AP2 payment mandate schema in the recap accordion.
6. **HashScan** — the HCS topic showing proof-only commitments (+ access-log/override/dispute records) and the attestation NFT serial.

## On-chain artifacts (real, testnet) for the writeup/images
- HCS topic `0.0.9104996` · NFT `0.0.9088330` · pUSDC `0.0.9089483` · brand `0.0.9089484` → retailer `0.0.9089486` · escrow `0.0.9091759`

## Pre-submit checklist
- [ ] **[YOU]** merge PR #1 + #2 → `main` (so the repo shows the full product)
- [ ] **[YOU]** smoke-test the unified demo (Cached Anchor verify + Live Sandbox run)
- [ ] **[YOU]** record the ≤90s video (clean topic, real HashScan) — see `docs/DEMO_SCRIPT.md`
- [ ] **[YOU]** post the feedback issue; grab its URL
- [ ] **[YOU]** capture the 6 images
- [ ] **[YOU]** submit the form (repo, live URL, video, wallet, feedback URL, description)
