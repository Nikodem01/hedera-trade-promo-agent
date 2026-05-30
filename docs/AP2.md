# AP2 (Agent Payments Protocol) alignment

Ref: https://ap2-protocol.org/specification/ · `lib/ap2.ts` · `/api/mandate`

## Why AP2 fits PromoProof (and the others don't)
The Hedera campaign offers a bonus for integrating emerging **agent-commerce/payment** standards
(AP2, UCP, ACP, MPP). Most of those standardize an agent *shopping/checking out* on a user's behalf —
which a B2B trade-promotion settlement is not. **AP2 is the exception**, because its core abstraction
is exactly ours:

> A **Mandate** — a cryptographically-verifiable W3C Verifiable Credential proving *who authorized an
> agent's payment* — so the payment is accountable and non-repudiable. The **CartMandate** is shared
> as **dispute evidence**.

That is PromoProof's settlement model verbatim: the agent never moves money; a payment happens only
when the **brand approver and the retailer both sign** the scheduled `pUSDC` transfer on-chain, and a
durable, tamper-proof commitment is the dispute evidence.

## What we implemented (authentic + additive — no product change)
`/api/mandate?commitment=<c>` emits an **AP2-aligned CartMandate + PaymentMandate** (one Verifiable
Credential) for a settlement (`lib/ap2.ts` builds it; the route signs it with the issuer key, as
`/api/credential` does). It maps:

| AP2 concept | PromoProof |
|---|---|
| CartMandate `payer` / `payee` (DIDs) | `did:hedera:…` brand treasury / retailer |
| CartMandate amount (`PaymentCurrencyAmount`) | the deterministic, hard-capped `pUSDC` settlement |
| CartMandate basis / dispute evidence | the salted **commitment** (on-chain, selectively disclosable) |
| PaymentMandate `cryptographicProofs` | the **on-chain two-signature consent** (brand + retailer) |
| PaymentMandate `transaction_context.agent_id` | `PromoProof/tpp-evaluator` |

## The honest, stronger twist
A standard AP2 mandate is a *claimed* signature. **Ours is enforced by Hedera consensus** — the
scheduled transfer physically cannot execute until both parties sign — so the authorization isn't just
asserted, it's settled on a public ledger. We adopt AP2's **mandate/authorization vocabulary**, not its
full A2A shopping/negotiation stack (out of scope for B2B settlement). We claim "AP2-aligned mandate,"
not "full AP2 implementation."

## Verify
`tests/ap2.test.ts` pins the mandate shape. In the console (operator mode) →
**Settlement & Fund → AP2 payment mandate** → paste a settled commitment → exports the signed VC.
