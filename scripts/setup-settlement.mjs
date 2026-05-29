// One-time settlement setup for PromoProof v2 mutual-consent settlement:
//   - pUSDC: a 6-decimal USD-pegged HTS token (demo stand-in for Circle USDC,
//            mainnet 0.0.456858 / Hedera Stablecoin Studio).
//   - Brand treasury account: holds pUSDC; its key is the BRAND APPROVER (distinct
//            from the agent/operator key) — so the agent can PROPOSE a payout but
//            never authorize it alone.
//   - Retailer account: receiverSigRequired=true — deposits need the retailer's
//            signature, so settlement also requires the retailer to ACCEPT.
// A scheduled pUSDC transfer brand->retailer therefore needs BOTH human signatures
// to execute (gold-standard, consensus-enforced no-drain).
//
// Per-resource idempotent; appends any newly-created ids/keys to .env.local.
// Run: node --env-file=.env.local scripts/setup-settlement.mjs
import {
  Client, PrivateKey, Hbar,
  AccountCreateTransaction, TokenCreateTransaction, TokenType, TokenSupplyType,
  TokenAssociateTransaction, TransferTransaction,
} from "@hiero-ledger/sdk";
import { readFileSync, appendFileSync, existsSync } from "node:fs";

const accountId = process.env.HEDERA_ACCOUNT_ID;
const privateKey = process.env.HEDERA_PRIVATE_KEY;
if (!accountId || !privateKey) { console.error("Missing HEDERA_ACCOUNT_ID / HEDERA_PRIVATE_KEY"); process.exit(1); }

const operatorKey = PrivateKey.fromStringECDSA(privateKey);
const client = Client.forTestnet().setOperator(accountId, operatorKey);
const DECIMALS = 6, UNIT = 10 ** DECIMALS;
const created = {};

// --- pUSDC stablecoin ---
let pusdc = process.env.PUSDC_TOKEN_ID;
if (!pusdc) {
  const r = await new TokenCreateTransaction()
    .setTokenName("PromoProof USD").setTokenSymbol("pUSDC")
    .setTokenType(TokenType.FungibleCommon).setDecimals(DECIMALS)
    .setInitialSupply(1_000_000 * UNIT)
    .setTreasuryAccountId(accountId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setAdminKey(operatorKey.publicKey).setSupplyKey(operatorKey.publicKey)
    .execute(client);
  pusdc = (await r.getReceipt(client)).tokenId.toString();
  created.PUSDC_TOKEN_ID = pusdc;
  console.log("created pUSDC:", pusdc);
}

// --- Brand treasury (key = brand approver) ---
let brandId = process.env.BRAND_TREASURY_ID;
const brandKey = process.env.BRAND_APPROVER_KEY ? PrivateKey.fromStringDer(process.env.BRAND_APPROVER_KEY) : PrivateKey.generateED25519();
if (!brandId) {
  const r = await new AccountCreateTransaction().setKeyWithoutAlias(brandKey.publicKey).setInitialBalance(new Hbar(5)).execute(client);
  brandId = (await r.getReceipt(client)).accountId.toString();
  created.BRAND_TREASURY_ID = brandId;
  created.BRAND_APPROVER_KEY = brandKey.toStringDer();
  console.log("created brand treasury:", brandId);
  await (await (await new TokenAssociateTransaction().setAccountId(brandId).setTokenIds([pusdc]).freezeWith(client)).sign(brandKey)).execute(client);
  await new TransferTransaction().addTokenTransfer(pusdc, accountId, -100_000 * UNIT).addTokenTransfer(pusdc, brandId, 100_000 * UNIT).execute(client);
  console.log("funded brand treasury with 100,000 pUSDC");
}

// --- Retailer (receiverSigRequired) ---
let retailerId = process.env.RETAILER_ACCOUNT_ID;
const retailerKey = process.env.RETAILER_KEY ? PrivateKey.fromStringDer(process.env.RETAILER_KEY) : PrivateKey.generateED25519();
if (!retailerId) {
  const r = await (await new AccountCreateTransaction()
    .setKeyWithoutAlias(retailerKey.publicKey).setInitialBalance(new Hbar(5))
    .setReceiverSignatureRequired(true).freezeWith(client).sign(retailerKey)).execute(client);
  retailerId = (await r.getReceipt(client)).accountId.toString();
  created.RETAILER_ACCOUNT_ID = retailerId;
  created.RETAILER_KEY = retailerKey.toStringDer();
  console.log("created retailer (receiverSigRequired):", retailerId);
  await (await (await new TokenAssociateTransaction().setAccountId(retailerId).setTokenIds([pusdc]).freezeWith(client)).sign(retailerKey)).execute(client);
  console.log("associated retailer to pUSDC");
}

// --- Promotion escrow (the accrual fund) ---
// A dedicated account holding a promotion's accrued budget. Settlements release FROM
// it on mutual consent; unspent accrual refunds to the brand at the promo window end
// (HIP-423 wait-for-expiry). Same key as the brand approver, so the brand authorizes
// both releases and the refund.
let escrowId = process.env.PROMO_ESCROW_ID;
if (!escrowId) {
  const r = await new AccountCreateTransaction().setKeyWithoutAlias(brandKey.publicKey).setInitialBalance(new Hbar(5)).execute(client);
  escrowId = (await r.getReceipt(client)).accountId.toString();
  created.PROMO_ESCROW_ID = escrowId;
  console.log("created promotion escrow:", escrowId);
  await (await (await new TokenAssociateTransaction().setAccountId(escrowId).setTokenIds([pusdc]).freezeWith(client)).sign(brandKey)).execute(client);
  // fund the accrual from the brand treasury (brand approver signs the debit)
  await (await (await new TransferTransaction().addTokenTransfer(pusdc, brandId, -10_000 * UNIT).addTokenTransfer(pusdc, escrowId, 10_000 * UNIT).freezeWith(client)).sign(brandKey)).execute(client);
  console.log("funded escrow with 10,000 pUSDC accrual");
}

// --- persist newly-created vars ---
const keys = Object.keys(created);
if (keys.length) {
  const existing = existsSync(".env.local") ? readFileSync(".env.local", "utf-8") : "";
  const lines = keys.filter((k) => !new RegExp(`^${k}=`, "m").test(existing)).map((k) => `${k}=${created[k]}`);
  if (lines.length) appendFileSync(".env.local", `\n# PromoProof v2 mutual-consent settlement (created ${new Date().toISOString().slice(0, 10)})\n${lines.join("\n")}\n`);
  console.log("\nappended to .env.local:\n  " + lines.join("\n  "));
} else {
  console.log("all settlement resources already configured — nothing to do.");
}
console.log("\nPUSDC_TOKEN_ID     =", pusdc);
console.log("BRAND_TREASURY_ID  =", brandId);
console.log("RETAILER_ACCOUNT_ID=", retailerId);
client.close();
