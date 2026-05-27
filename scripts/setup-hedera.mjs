// One-time Hedera setup: creates the HCS audit topic and the HTS "PromoProof
// Receipt" token used for settlement attestations. Prints the IDs to paste into
// .env.local (HCS_TOPIC_ID, HTS_RECEIPT_TOKEN_ID). Hedera-only — no LLM key needed.
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

// Idempotency guard: never double-create if the IDs are already set.
if (process.env.HCS_TOPIC_ID || process.env.HTS_RECEIPT_TOKEN_ID) {
  console.log("HCS_TOPIC_ID / HTS_RECEIPT_TOKEN_ID already set in .env.local — skipping.");
  console.log("  HCS_TOPIC_ID        =", process.env.HCS_TOPIC_ID || "(unset)");
  console.log("  HTS_RECEIPT_TOKEN_ID=", process.env.HTS_RECEIPT_TOKEN_ID || "(unset)");
  process.exit(0);
}

const operatorKey = PrivateKey.fromStringECDSA(privateKey);
const client = Client.forTestnet().setOperator(accountId, operatorKey);

// HCS audit topic — the neutral, immutable ledger both parties trust.
const topicResp = await new TopicCreateTransaction()
  .setTopicMemo("PromoProof — trade promotion proof-of-performance audit trail")
  .execute(client);
const topicId = (await topicResp.getReceipt(client)).topicId.toString();

// HTS "PromoProof Receipt" — fungible, mintable per settlement (operator = treasury + supply key).
const tokenResp = await new TokenCreateTransaction()
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
const tokenId = (await tokenResp.getReceipt(client)).tokenId.toString();

console.log("\n=== PromoProof Hedera setup complete ===");
console.log("HCS_TOPIC_ID        =", topicId);
console.log("HTS_RECEIPT_TOKEN_ID=", tokenId);
console.log("topic  :", `https://hashscan.io/testnet/topic/${topicId}`);
console.log("token  :", `https://hashscan.io/testnet/token/${tokenId}`);
console.log("\nPaste the two IDs into .env.local.");

client.close();
