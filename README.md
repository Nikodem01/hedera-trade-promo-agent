# PromoProof

PromoProof is an enterprise trade-promotion agent for verifying in-store promotion claims and
coordinating settlement on Hedera.

The agent reviews agreed promotion terms, submitted proof photos, and claim narratives; evaluates
compliance clause by clause; explains the decision with visual evidence; requests missing proof when
needed; and proposes a capped settlement. Confidential business data stays off-chain while Hedera
provides the audit and consent layer.

Built for the Hedera AI Agent Bounties Week 2 challenge.

Live demo: https://promoproof.liftbyai.com

Feedback issue: https://github.com/hashgraph/hedera-agent-kit-js/issues/880

## What The Demo Shows

PromoProof demonstrates a real enterprise workflow:

1. A retailer claim is prepared with a contract, photo, and narrative.
2. The agent adjudicates the claim with multimodal reasoning and clause-level evidence.
3. The UI shows visual grounding boxes and a criteria matrix.
4. The decision provenance is sealed off-chain as a salted Merkle dossier.
5. A proof-only commitment is anchored to Hedera Consensus Service.
6. Selected fields, including the reasoning summary, can be proven later against the public HCS record.
7. For approved claims, the agent proposes a scheduled settlement transfer.
8. Funds remain human-controlled: settlement requires both brand and retailer signatures on-chain.
9. A proof-only NFT attestation is minted with the decision commitment as metadata.

The public demo includes a stable verified run plus a rate-limited live sandbox. The verified run keeps
the complete workflow visible even if LLM quota or Mirror Node timing slows the live path.

## Hedera Agent Kit Integration

PromoProof uses the Hedera Agent Kit in TypeScript:

- `@hashgraph/hedera-agent-kit`
- `@hashgraph/hedera-agent-kit-ai-sdk`
- `@hiero-ledger/sdk`

It includes a custom Agent Kit plugin at [`lib/plugins/tpp-evaluator`](lib/plugins/tpp-evaluator):

- `adjudicate_claim` - performs multimodal contract/photo/narrative review, returns a typed compliance assessment, builds the off-chain dossier, and anchors proof-only commitment data.
- `compute_settlement` - deterministic settlement calculation with contract and global payout caps.
- `propose_settlement` - creates a Hedera Scheduled Transaction for a settlement proposal.

The live sandbox also invokes non-query Hedera Agent Kit tools during execution:

- `submit_topic_message_tool` for HCS proof anchoring.
- `mint_non_fungible_token_tool` for a proof-only NFT attestation.

The agent has no tool that can unilaterally release funds. It can propose settlement, but value moves
only if both required parties sign the scheduled transaction on-chain.

## Hedera Testnet Artifacts

| Artifact | Purpose | Link |
|---|---|---|
| HCS topic `0.0.9104996` | Proof-only audit commitments | https://hashscan.io/testnet/topic/0.0.9104996 |
| NFT collection `0.0.9088330` | Per-run attestation NFT collection | https://hashscan.io/testnet/token/0.0.9088330 |
| pUSDC token `0.0.9089483` | Testnet settlement token | https://hashscan.io/testnet/token/0.0.9089483 |
| Brand treasury `0.0.9089484` | Demo payer account | https://hashscan.io/testnet/account/0.0.9089484 |
| Retailer account `0.0.9089486` | Demo payee account | https://hashscan.io/testnet/account/0.0.9089486 |

## Privacy Model

PromoProof follows a commitments-on-chain, data-off-chain pattern:

- Full contracts, photos, amounts, parties, and reasoning live off-chain.
- HCS receives salted Merkle roots, keyed image fingerprints, timestamps, and transaction metadata.
- Selective disclosure proves one field without revealing the whole dossier.
- NFT metadata contains only the decision commitment, not confidential claim text.

The live deployment uses Hedera testnet. `pUSDC` is a self-minted testnet token used to demonstrate the
settlement workflow.

## Local Development

```bash
pnpm install
cp .env.example .env.local
node --env-file=.env.local scripts/setup-hedera.mjs
node --env-file=.env.local scripts/setup-settlement.mjs
pnpm dev
pnpm test
```

## Submission Links

- Live demo: https://promoproof.liftbyai.com
- Public repository: https://github.com/Nikodem01/hedera-trade-promo-agent
- Hedera Agent Kit feedback: https://github.com/hashgraph/hedera-agent-kit-js/issues/880
- Submission copy: [`docs/SUBMISSION.md`](docs/SUBMISSION.md)
