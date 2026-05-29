# Positioning — why not a database, why not an incumbent

## The category is real
Trade-promotion / deduction management is an established, consolidating enterprise category. Vividly
(which absorbed Cresicor) leads it, selling on hard outcomes — large reductions in deduction-processing
labor, managed dispute services with quantified win rates, named recoveries. Blacksmith was acquired by
TELUS (~$275M). So: buyers exist, they pay, and they buy on **quantified outcomes** — recovery $,
dispute-win-rate, labor saved, cycle-time. PromoProof speaks that language (see the operator portfolio:
leakage recovered, deductions caught).

## What the incumbents do well
Claim/deduction **matching**, workflow, backup-document retrieval, and white-glove dispute **services**.
Mature, broad, integrated with the ERPs and TPM suites.

## The structural gap they can't close
Their validation and their records live **on their own servers**. Trusting the outcome means trusting
the vendor: a hosted record of "we decided X at time T" is only as trustworthy as whoever hosts it —
it can be altered or backdated, and the brand, the retailer, and an auditor must all take it on faith.

## Our wedge: trust on both sides of the ledger
1. **Explainable + measured adjudication** (not a black box): clause-cited findings, citation
   verification, an independent second-model review, and a model-risk posture with live quality
   metrics (`docs/MODEL_RISK.md`).
2. **Cryptographically provable, mutually-settled trust**: every decision is a salted commitment on a
   neutral public ledger that **the counterparty and an auditor can verify without trusting our
   server**; settlement physically cannot move without both parties' on-chain signatures; even
   *access* to the confidential data is logged provably.

This is the one column in the comparison grid an incumbent cannot fill — because it requires a neutral
consensus ledger, not a better database.

## "Why not just a database?"
Deductions disputes **resurface years later** and demand durable, tamper-proof proof-of-performance
that *neither side* can alter. A database gives you a record you must trust the host not to change. A
salted commitment on Hedera gives the brand, the retailer, and an auditor an identical, immutable,
consensus-timestamped reference — confidential to everyone (proof-only on-chain), yet independently
verifiable by anyone who holds a disclosure. That is exactly what a years-later dispute needs, and it
is structurally impossible for a single-owner DB to provide.

## Honest positioning
PromoProof is **not** trying to replace a full TPM suite's planning/forecasting/trade-fund accounting.
It is the **adjudication + trust layer**: it judges proof-of-performance with auditable rigor and
settles by provable mutual consent. It integrates outward via open formats (EDI-812 / CSV export today)
and is designed to feed or sit alongside an existing TPM/ERP rather than rip-and-replace it.
