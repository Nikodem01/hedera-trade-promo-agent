// Production-posture compliant settlement token: HTS-native KYC + freeze + pause
// controls (the regulated alternative to the demo pUSDC; equivalent to Stablecoin
// Studio / ERC-3643 identity-gated tokens). Creates the token, associates +
// grants KYC to the brand and retailer, and demonstrates a freeze/unfreeze.
// Run: node --env-file=.env.local scripts/setup-compliant-token.mjs
import {
  Client, PrivateKey, Hbar,
  TokenCreateTransaction, TokenType, TokenSupplyType,
  TokenAssociateTransaction, TokenGrantKycTransaction, TokenFreezeTransaction, TokenUnfreezeTransaction,
} from "@hiero-ledger/sdk";

const op = process.env.HEDERA_ACCOUNT_ID;
const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);
const client = Client.forTestnet().setOperator(op, operatorKey);
const brand = process.env.BRAND_TREASURY_ID, retailer = process.env.RETAILER_ACCOUNT_ID;
const brandKey = PrivateKey.fromStringDer(process.env.BRAND_APPROVER_KEY);
const retailerKey = PrivateKey.fromStringDer(process.env.RETAILER_KEY);
const UNIT = 1e6;

const r = await new TokenCreateTransaction()
  .setTokenName("PromoProof USD (compliant)").setTokenSymbol("pUSDCc")
  .setTokenType(TokenType.FungibleCommon).setDecimals(6).setInitialSupply(1_000_000 * UNIT)
  .setTreasuryAccountId(op).setSupplyType(TokenSupplyType.Infinite)
  .setAdminKey(operatorKey.publicKey).setSupplyKey(operatorKey.publicKey)
  .setKycKey(operatorKey.publicKey).setFreezeKey(operatorKey.publicKey).setPauseKey(operatorKey.publicKey)
  .setMaxTransactionFee(new Hbar(40))
  .execute(client);
const token = (await r.getReceipt(client)).tokenId.toString();
console.log("created compliant token (KYC+freeze+pause):", token);

for (const [id, key, who] of [[brand, brandKey, "brand"], [retailer, retailerKey, "retailer"]]) {
  await (await (await new TokenAssociateTransaction().setAccountId(id).setTokenIds([token]).freezeWith(client)).sign(key)).execute(client);
  await (await new TokenGrantKycTransaction().setAccountId(id).setTokenId(token).execute(client)).getReceipt(client);
  console.log(`associated + KYC-granted: ${who} ${id}`);
}

// Demonstrate the compliance lever: freeze then unfreeze the retailer for this token.
await (await new TokenFreezeTransaction().setAccountId(retailer).setTokenId(token).execute(client)).getReceipt(client);
console.log("retailer FROZEN for token (transfers blocked) ✓");
await (await new TokenUnfreezeTransaction().setAccountId(retailer).setTokenId(token).execute(client)).getReceipt(client);
console.log("retailer UNFROZEN ✓");

console.log("\nCOMPLIANT_TOKEN_ID =", token, "— KYC-gated, freezable, pausable. Production settlement token.");
client.close();
