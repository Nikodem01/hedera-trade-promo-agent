# PromoProof Submission Copy

## 1. Project Name

PromoProof

## 2. Project Description

Enterprise trade-promotion agent for verifying in-store promotion claims, explaining the decision with visual evidence, and coordinating mutual-consent settlement on Hedera.

## 3. Project Summary

PromoProof is an enterprise trade-promotion agent for verifying in-store promotion claims and coordinating settlement. It reviews the agreed promotion terms, submitted proof photo, and narrative; evaluates compliance clause by clause; explains the decision with visual evidence; requests missing proof when needed; and proposes a capped settlement. Hedera provides the trust layer: the agent anchors proof-only audit records to HCS, mints a commitment-based NFT attestation, and creates a scheduled settlement that can execute only with both parties' on-chain signatures, so the workflow is auditable, confidential, and protected from unilateral fund movement.

## 4. Implementation Details

PromoProof is built in TypeScript with the Hedera Agent Kit v4 and `@hashgraph/hedera-agent-kit-ai-sdk`. The custom `tpp-evaluator` plugin exposes three domain tools: `adjudicate_claim`, `compute_settlement`, and `propose_settlement`.

`adjudicate_claim` performs multimodal contract/photo/narrative review, returns a typed compliance assessment, builds a salted Merkle dossier, stores confidential evidence off-chain, and anchors proof-only commitments to Hedera Consensus Service. The live sandbox also invokes Hedera Agent Kit's `submit_topic_message_tool`, making the HCS write visible in the agent's execution stream.

`compute_settlement` is deterministic code, not model discretion: it maps the verdict to a capped amount and enforces the contract maximum and global hard cap. `propose_settlement` creates a Hedera Scheduled Transaction for the settlement transfer. The schedule remains pending until both parties sign on-chain, so the agent can propose value movement but cannot release funds.

The live workflow also invokes Hedera Agent Kit's `mint_non_fungible_token_tool` to mint a proof-only NFT attestation whose metadata is the decision commitment. The UI resolves the fresh NFT serial through Mirror Node and shows the full audit path: Agent Kit tool stream, visual grounding, criteria matrix, HCS commitment, selective-disclosure verification, scheduled settlement state, NFT attestation, and governance evidence for model-risk review.

## 5. Feedback Link

https://github.com/hashgraph/hedera-agent-kit-js/issues/880

## 6. Additional Info

Live demo: https://promoproof.liftbyai.com

Public GitHub repository: https://github.com/Nikodem01/hedera-trade-promo-agent

Hedera testnet artifacts:
- HCS audit topic: `0.0.9104996`
- Attestation NFT collection: `0.0.9088330`
- pUSDC token: `0.0.9089483`
- Brand treasury: `0.0.9089484`
- Retailer account: `0.0.9089486`

The public demo contains a stable verified run and a rate-limited live sandbox. If LLM quota is unavailable, the verified run still demonstrates a captured execution with real testnet hashes.

## 7. Additional Resources

- Live demo: https://promoproof.liftbyai.com
- Repository: https://github.com/Nikodem01/hedera-trade-promo-agent
- HCS topic on HashScan: https://hashscan.io/testnet/topic/0.0.9104996
- NFT collection on HashScan: https://hashscan.io/testnet/token/0.0.9088330
- pUSDC token on HashScan: https://hashscan.io/testnet/token/0.0.9089483
