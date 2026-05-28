# Demo script (≤ 90 seconds)

The borderline negotiation is the hero — it proves the agent reasons under uncertainty, not
"detect logo → pay." Record at 1280×720+, testnet, with HashScan open in a second tab.

| # | Time | On screen | Voiceover / caption |
|---|------|-----------|---------------------|
| 1 | 0:00–0:10 | Title card → the PromoProof console | "CPG brands pay retailers ~$30B a year in trade promotions. Verifying proof-of-performance takes 60–120 days, by hand. PromoProof does it in seconds." |
| 2 | 0:10–0:22 | Click the **Oreo end-cap** claim (Walmart). Agent stream starts. | "A Walmart claim arrives: an Oreo end-cap, up to 30 HBAR. The agent reads Walmart's bespoke contract and the proof photo together." |
| 3 | 0:22–0:34 | `adjudicate_claim` card expands: decision **APPROVE**, per-criterion rows citing §2.1/§2.2/§2.3. | "It cites each clause — placement, four facings, branding — and explains what the photo shows. This is judgement, not OCR." |
| 4 | 0:34–0:55 | Click the **Cadbury** claim → decision **REQUEST MORE EVIDENCE**: "no visible date — provide a POS timestamp." Type a timestamp reply → agent **revises** to partial credit. | "Here's the difference. The display looks right, but the agent can't confirm it was live during the Easter window — so it asks for a POS timestamp instead of guessing. The retailer replies; the agent revises to a partial settlement." |
| 5 | 0:55–1:18 | Click **Approve & Settle**. Settlement receipt: HCS audit, HTS receipt mint, HBAR transfer — three HashScan links flash; click the transfer. | "On approval it settles on Hedera: the decision is written to an immutable HCS audit topic, an HTS receipt is minted, and the HBAR lands in the retailer's wallet — every step verifiable on HashScan." |
| 6 | 1:18–1:30 | Closing card: "Real money, real-time, on-chain auditable. Built on Hedera Agent Kit." | "Reads the contract. Judges the proof. Negotiates. Settles. PromoProof." |

**Optional 7th beat (if time):** the **Ritz** claim → **REJECT** ("R-1 location not met — product is on a standard aisle, not the checkout lane"), logged to HCS, zero paid. Shows the agent says no, on the record.

**Pre-record checklist:** test each photo against Opus first; confirm `.env.local` has the key + topic/token IDs; warm the testnet operator balance; have HashScan testnet open.
