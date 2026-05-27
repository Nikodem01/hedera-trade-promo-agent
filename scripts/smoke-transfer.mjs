// Direct-SDK on-chain smoke test: proves the operator credentials build a
// working testnet client and can execute a real transaction. No LLM involved.
// Run: node --env-file=.env.local scripts/smoke-transfer.mjs
import {
  Client,
  PrivateKey,
  Hbar,
  TransferTransaction,
} from "@hiero-ledger/sdk";

const accountId = process.env.HEDERA_ACCOUNT_ID;
const privateKey = process.env.HEDERA_PRIVATE_KEY;
const TARGET = "0.0.98";

if (!accountId || !privateKey) {
  console.error("Missing HEDERA_ACCOUNT_ID / HEDERA_PRIVATE_KEY");
  process.exit(1);
}

const client = Client.forTestnet().setOperator(
  accountId,
  PrivateKey.fromStringECDSA(privateKey),
);

const response = await new TransferTransaction()
  .addHbarTransfer(accountId, new Hbar(-1))
  .addHbarTransfer(TARGET, new Hbar(1))
  .execute(client);

const receipt = await response.getReceipt(client);
const txId = response.transactionId.toString();
const hashscanId = txId.replace("@", "-").replace(/-(\d+)\.(\d+)$/, "-$1-$2");

console.log("status   :", receipt.status.toString());
console.log("txId     :", txId);
console.log(
  "hashscan :",
  `https://hashscan.io/testnet/transaction/${hashscanId}`,
);

client.close();
