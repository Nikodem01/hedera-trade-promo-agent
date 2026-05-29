// One-time Hedera setup: creates the HCS audit topic, the HTS "PromoProof
// Receipt" fungible token, and (opt-in) the "PromoProof Attestation" NFT
// collection used for unique per-settlement attestation receipts. Prints the IDs
// to paste into .env.local. Per-resource idempotency: only missing IDs are
// created, so re-running after the fungible token exists adds just the NFT.
// Run: node --env-file=.env.local scripts/setup-hedera.mjs
import {
  Client,
  PrivateKey,
  TopicCreateTransaction,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
} from "@hiero-ledger/sdk";

const accountId = process.env.HEDERA_ACCOUNT_ID;
const privateKey = process.env.HEDERA_PRIVATE_KEY;
if (!accountId || !privateKey) {
  console.error("Missing HEDERA_ACCOUNT_ID / HEDERA_PRIVATE_KEY");
  process.exit(1);
}

const operatorKey = PrivateKey.fromStringECDSA(privateKey);
const client = Client.forTestnet().setOperator(accountId, operatorKey);

const result = {};

// HCS audit topic — the neutral, immutable ledger both parties trust.
if (!process.env.HCS_TOPIC_ID) {
  const r = await new TopicCreateTransaction()
    .setTopicMemo("PromoProof — trade promotion proof-of-performance audit trail")
    .execute(client);
  result.HCS_TOPIC_ID = (await r.getReceipt(client)).topicId.toString();
} else {
  result.HCS_TOPIC_ID = `${process.env.HCS_TOPIC_ID} (existing)`;
}

// HTS "PromoProof Receipt" — fungible, mintable per settlement (default receipt).
if (!process.env.HTS_RECEIPT_TOKEN_ID) {
  const r = await new TokenCreateTransaction()
    .setTokenName("PromoProof Receipt")
    .setTokenSymbol("PPR")
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(0)
    .setInitialSupply(0)
    .setTreasuryAccountId(accountId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setAdminKey(operatorKey.publicKey)
    .setSupplyKey(operatorKey.publicKey)
    .execute(client);
  result.HTS_RECEIPT_TOKEN_ID = (await r.getReceipt(client)).tokenId.toString();
} else {
  result.HTS_RECEIPT_TOKEN_ID = `${process.env.HTS_RECEIPT_TOKEN_ID} (existing)`;
}

// HTS "PromoProof Attestation" — NFT collection (opt-in). Each settlement mints a
// unique serial whose metadata anchors the decision's evidence_hash. Set the
// printed id as HTS_RECEIPT_NFT_TOKEN_ID to switch the receipt mint to NFTs.
if (!process.env.HTS_RECEIPT_NFT_TOKEN_ID) {
  const r = await new TokenCreateTransaction()
    .setTokenName("PromoProof Attestation")
    .setTokenSymbol("PPATT")
    .setTokenType(TokenType.NonFungibleUnique)
    .setInitialSupply(0)
    .setTreasuryAccountId(accountId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setAdminKey(operatorKey.publicKey)
    .setSupplyKey(operatorKey.publicKey)
    .execute(client);
  result.HTS_RECEIPT_NFT_TOKEN_ID = (await r.getReceipt(client)).tokenId.toString();
} else {
  result.HTS_RECEIPT_NFT_TOKEN_ID = `${process.env.HTS_RECEIPT_NFT_TOKEN_ID} (existing)`;
}

console.log("\n=== PromoProof Hedera setup ===");
for (const [k, v] of Object.entries(result)) console.log(`${k.padEnd(22)}=`, v);
console.log("\nPaste any newly-created IDs into .env.local.");
console.log("To enable NFT attestation receipts, set HTS_RECEIPT_NFT_TOKEN_ID to the value above.");

client.close();
