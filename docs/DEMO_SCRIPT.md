# Demo script (≤ 90 seconds)

Two heroes: **confidentiality** (the public ledger shows nothing but a proof, yet anyone can verify) and
**mutual-consent settlement** (money moves only when both parties sign on-chain). Record at 1280×720+,
testnet, with HashScan + the Mirror Node open in a second tab.

| # | Time | On screen | Voiceover / caption |
|---|------|-----------|---------------------|
| 1 | 0:00–0:08 | Title → console | "CPG brands pay retailers ~$30B a year in trade promotions. Up to half of post-audit deductions are wrong — and disputes surface years later. PromoProof settles them in seconds, on Hedera." |
| 2 | 0:08–0:22 | Click the **Oreo** claim. Verdict card: **APPROVE**, per-criterion rows citing §1.1/§2.1… | "A vision model reads the bespoke contract and the photo together and cites each clause. This is judgement, not OCR." |
| 3 | 0:22–0:36 | Scroll to the **public commitment ledger** — a row that shows only a hash + timestamp. Then click **Verify against chain → Full audit**: ✓ on-chain seq, all fields proven via Merkle proof. | "Here's the key: the public ledger holds **zero business data** — just a salted commitment. Yet we re-derive every field of the decision and prove it against that on-chain commitment. Nothing confidential is published; the proof is." |
| 4 | 0:36–0:46 | Click **Counterparty only**: proves just decision + amount; "rest stays sealed". Copy the disclosure package. | "Selective disclosure: reveal exactly what a counterparty or auditor needs — the decision and the amount — prove it cryptographically, and expose nothing else. Bespoke terms stay confidential." |
| 5 | 0:46–1:04 | Click the **Cadbury** claim → **REQUEST MORE EVIDENCE** ("no visible date — provide a POS timestamp"). Type a timestamp → agent **revises** to partial credit (revision diff shows the flipped clause). | "When proof is borderline, it asks for the specific missing evidence instead of guessing — then revises on the answer." |
| 6 | 1:04–1:22 | On an approved claim: **Settlement proposed** panel. Click **Brand: Approve & authorize** (still pending) → **Retailer: Accept settlement** → **Settled** + attestation NFT. | "Settlement is a scheduled stablecoin transfer that executes **only** when the brand authorizes **and** the retailer accepts — both signing on-chain. No single key, and not the agent, can release the funds. A unique attestation NFT is minted, bound to the decision commitment." |
| 7 | 1:22–1:30 | Closing card: "Confidential. Verifiable. Mutually settled. On Hedera." | "Reads the contract. Judges the proof. Negotiates. Settles by mutual consent — provable to anyone, confidential to everyone else. PromoProof." |

**Optional beat:** the **Ritz** claim → **REJECT** ("location not met — aisle, not checkout") — committed on-chain, zero paid; and a **duplicate-proof** flag when the same photo is reused under a second claim.

**Pre-record checklist:** `LLM_PROVIDER` + LLM key set; `setup-hedera.mjs` + `setup-settlement.mjs` run and their ids in `.env.local`; warm the operator balance; run `scripts/test-v2-flow.mjs` once to confirm the full arc; HashScan testnet + Mirror Node open.

## Console layout & navigation (v2.4 shell)

The app is now a workspace shell (top nav): **Adjudication · Trust Center · Model Risk · Settlement & Fund.**
The script maps onto it:
- **Beats 2–6 (adjudicate → verify → negotiate → settle)** happen in **Adjudication**. "Verify against chain"
  (beats 3–4) is the **VerifyPanel on the verdict card** itself.
- After settling, a strong enterprise closer (≈8–10s): click **Trust Center** → the public commitment
  ledger (hash + timestamp only) and the **provable access & oversight log** (your verify/disclose just
  appeared there as a tamper-proof, linked event); then **Model Risk** → reviewer concurrence, citation
  integrity, safety-gate holds, pilot validation. Caption: *"Every decision is model-risk-managed and
  every access is provable — the diligence an enterprise actually runs."*

**Recording modes.** For a flawless take, record locally where the live agent runs (operator mode). To
showcase the hosted URL safely, the public lands in **read-only + scripted** mode (no keys, deterministic);
click **Operator access**, enter the token, and the live agent + on-chain actions unlock. Either way the
on-chain artifacts (HashScan) are real.
