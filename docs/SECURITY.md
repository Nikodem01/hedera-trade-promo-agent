# Security & data-handling

## Data classification
| Tier | What | Where | Protection |
|---|---|---|---|
| Public | `{commitment, image_fp, ts}` — a salted Merkle root + keyed fingerprint | HCS topic (immutable) | Carries **no** business data by construction |
| Confidential | The full decision dossier: contract, narrative, reasoning, per-criterion findings, amounts, parties, salts | Server-side store | **AES-256-GCM at rest** (`DOSSIER_ENC_KEY`); never sent to the LLM, browser, or chain |
| Secret | Operator + party private keys, `DOSSIER_ENC_KEY`, `IMAGE_FP_KEY` | Server env only | Never imported into client code; never committed (`.env*` gitignored) |

## The no-drain invariant (the central security property)
The agent **cannot move funds**, and neither can any single key:
- The LLM has **no fund-moving tool**. It only *recommends*; `compute_settlement` (deterministic)
  enforces the amount, hard-capped at the contract maximum **and** a global ceiling.
- The recipient is a **fixed registered account**, never model-chosen.
- Settlement is a **scheduled transfer requiring the brand approver's *and* the retailer's on-chain
  signatures** (receiver-signature-required). Consent is enforced by **Hedera consensus, not app
  logic** — it physically cannot execute otherwise.
- A deterministic **safety gate** holds low-confidence / reviewer-flagged decisions for a human before
  any settlement is even proposed.

This is verified by `tests/injection.test.ts` (adversarial "drain" prompts cannot move funds) and
`tests/safety-gate.test.ts`.

## Threat model
| Threat | Mitigation |
|---|---|
| Prompt injection → fund drain | No fund tool; fixed recipient; deterministic cap; two-signature consensus settlement |
| Inflated payout (manipulated assessment) | `compute_settlement` re-caps independent of the LLM; global hard cap |
| Tampering / backdating a decision record | On-chain commitment is immutable + consensus-timestamped; cannot be forged or backdated |
| Confidential data exfiltration | Off-chain dossier encrypted at rest; only proof-only data on-chain; selective disclosure (per-leaf salts) |
| Unauthorized / undisclosed data access | **Provable access log** — every disclosure anchored to HCS (who/what/when sealed off-chain); a hosted DB log is editable, this is not |
| Proof-of-performance fraud (photo reuse) | Keyed image fingerprint anchored on-chain; cross-claim reuse is detectable without re-identifying the image |
| Model hallucination / unsupported decision | Independent second-model review + safety gate; citation verification |
| Right-to-erasure vs immutability | Crypto-shredding: delete the off-chain salted data → the on-chain commitment is permanently opaque |
| Public-internet exposure / API abuse | Reverse proxy (TLS, rate-limit, size cap) + per-route guards (`lib/guard.ts`) enforced IN handlers, not middleware (CVE-2025-29927); in `PUBLIC_READONLY` mode anonymous callers get the cached demo, public verification, and a tightly rate-limited live sandbox, while privileged routes need the operator token; same-origin (CSRF) check + in-memory rate limit; `import 'server-only'` keeps key modules off the client bundle. See `docs/DEPLOY.md`. |

## Key management
Operator and party keys are server-only (`lib/hedera/client.ts`). `DOSSIER_ENC_KEY` derives the at-rest
AES key via scrypt with a fixed app salt (deterministic so files stay readable across restarts);
`IMAGE_FP_KEY` keys the reuse-detection fingerprint. All are environment-injected; none are committed.

## Known limitations (demo posture)
- **Dossier store is single-instance, file-backed (`tmpdir`).** Durable on a long-lived server but not
  horizontally scalable and cleared on reboot; production target is an access-controlled, replicated
  encrypted store (one-function swap behind `lib/dossier-store.ts`).
- **`pUSDC` is a self-minted demo stand-in**, not real USDC; testnet amounts are play-money.
- **No multi-user auth/RBAC** — demo personas only. Segregation of duties is enforced on-chain (separate
  keys), not by an IdP; the `actor_role` label is attribution, not access control. For public hosting,
  access is gated by a single shared **operator token** (`PUBLIC_READONLY` mode + `lib/guard.ts`) and the
  reverse proxy — anonymous visitors get the cached anchor + limited live sandbox, never privileged keys.

## Public deployment
Hosting is hardened per `docs/DEPLOY.md`: a dedicated low-balance testnet operator account (blast-radius
limiting), nginx TLS + rate limit + size cap (and an optional whole-site password), `ufw` + SSH
hardening, a non-root `systemd` service, a `chmod 600` env file, security headers (`next.config.ts`),
and Next kept patched. The exposure model: **public = cached anchor + limited live sandbox; privileged
and fund-touching actions = gated.**
