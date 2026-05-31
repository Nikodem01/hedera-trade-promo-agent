# PromoProof Submission Copy

## 1. Project Name

PromoProof

## 2. Project Description

Enterprise trade-promotion adjudication agent that reads a contract, judges proof photos, negotiates missing evidence, and proposes mutual-consent settlement on Hedera without exposing confidential business data on-chain.

## 3. Project Summary

PromoProof turns a messy enterprise workflow into an auditable agent transaction: a retailer submits a bespoke trade-promotion contract, a proof photo, and a short narrative; the agent evaluates clause-level compliance, visually grounds its findings on the image, asks for missing evidence when needed, and computes a capped settlement recommendation.

The system uses Hedera as a neutral audit and consent layer. The full contract, photo, amount, and reasoning stay off-chain in an encrypted dossier. Hedera receives only proof-only artifacts: salted Merkle commitments, keyed image fingerprints, HCS consensus metadata, scheduled-transfer ids, and NFT attestation metadata. A counterparty can later verify a disclosed field, including the agent's reasoning summary, against the public HCS record without seeing the rest of the dossier.

For approved claims, the agent cannot move funds directly. It proposes a pUSDC scheduled transfer that executes only when both the brand approver and the retailer sign on-chain. This demonstrates a real enterprise payment workflow: AI adjudication, cryptographic auditability, human-controlled settlement, and Hedera-enforced mutual consent.

## 4. Implementation Details

PromoProof is built in TypeScript on the Hedera Agent Kit v4 and `@hashgraph/hedera-agent-kit-ai-sdk`. The custom `tpp-evaluator` plugin exposes three domain tools: `adjudicate_claim`, `compute_settlement`, and `propose_settlement`.

`adjudicate_claim` performs multimodal contract/photo/narrative review, returns a typed compliance assessment, builds a salted Merkle dossier, stores confidential evidence off-chain, and anchors proof-only commitments to Hedera Consensus Service. The live sandbox also invokes Hedera Agent Kit's `submit_topic_message_tool` so judges can see the HCS tool call stream during execution.

`compute_settlement` is deterministic code, not model discretion: it maps the verdict to a capped pUSDC amount and enforces the contract maximum and global hard cap. `propose_settlement` creates a Hedera Scheduled Transaction for the pUSDC transfer from the brand treasury to the retailer. The schedule remains pending until both parties sign on-chain, so the agent can propose value movement but cannot release funds.

The live workflow also invokes Hedera Agent Kit's `mint_non_fungible_token_tool` to mint a proof-only NFT attestation whose metadata is the decision commitment. The UI resolves the fresh NFT serial through Mirror Node, displays HashScan/Mirror links, and shows the full audit path: Agent Kit tool stream, visual grounding, criteria matrix, HCS commitment, selective-disclosure verification, scheduled settlement state, NFT attestation, and an enterprise governance vault with model-risk evidence and AP2-aligned payment mandate data.

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

The public demo contains a stable verified anchor run and a rate-limited live sandbox. If LLM quota is unavailable, the cached anchor still demonstrates a real captured execution with real testnet hashes.

## 7. Additional Resources

- Live demo: https://promoproof.liftbyai.com
- Repository: https://github.com/Nikodem01/hedera-trade-promo-agent
- HCS topic on HashScan: https://hashscan.io/testnet/topic/0.0.9104996
- NFT collection on HashScan: https://hashscan.io/testnet/token/0.0.9088330
- Latest verified NFT serial example: https://testnet.mirrornode.hedera.com/api/v1/tokens/0.0.9088330/nfts/13
- pUSDC token on HashScan: https://hashscan.io/testnet/token/0.0.9089483
