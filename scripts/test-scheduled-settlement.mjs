// Proves the mutual-consent settlement: a scheduled pUSDC transfer brand->retailer
// that executes ONLY after BOTH the brand approver and the retailer sign on-chain.
// Run: node --env-file=.env.local scripts/test-scheduled-settlement.mjs
import {
  Client, PrivateKey, TransferTransaction,
  ScheduleCreateTransaction, ScheduleSignTransaction, ScheduleInfoQuery,
  AccountBalanceQuery,
} from "@hiero-ledger/sdk";

const op = process.env.HEDERA_ACCOUNT_ID;
const client = Client.forTestnet().setOperator(op, PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY));
const pusdc = process.env.PUSDC_TOKEN_ID;
const brand = process.env.BRAND_TREASURY_ID;
const retailer = process.env.RETAILER_ACCOUNT_ID;
const brandKey = PrivateKey.fromStringDer(process.env.BRAND_APPROVER_KEY);
const retailerKey = PrivateKey.fromStringDer(process.env.RETAILER_KEY);
const UNIT = 1e6;
const amt = 30 * UNIT;

const bal = async (id) => (await new AccountBalanceQuery().setAccountId(id).execute(client)).tokens.get(pusdc)?.toString() ?? "0";
const executed = async (id) => {
  const info = await new ScheduleInfoQuery().setScheduleId(id).execute(client);
  return info.executed ? info.executed.toDate().toISOString() : null;
};

console.log("retailer pUSDC before:", await bal(retailer));

// Propose: scheduled transfer brand -> retailer (NOT executed — needs both sigs)
const transfer = new TransferTransaction()
  .addTokenTransfer(pusdc, brand, -amt)
  .addTokenTransfer(pusdc, retailer, amt);
const createRcpt = await (await new ScheduleCreateTransaction()
  .setScheduledTransaction(transfer)
  .setScheduleMemo("PromoProof settlement — awaiting brand + retailer signatures")
  .execute(client)).getReceipt(client);
const scheduleId = createRcpt.scheduleId.toString();
console.log("scheduled:", scheduleId, "| executed?", await executed(scheduleId), "(expect null)");

// Brand approver signs
await (await (await new ScheduleSignTransaction().setScheduleId(scheduleId).freezeWith(client)).sign(brandKey)).execute(client);
console.log("after BRAND sign  | executed?", await executed(scheduleId), "(expect null)");

// Retailer accepts -> both signatures present -> Hedera executes
await (await (await new ScheduleSignTransaction().setScheduleId(scheduleId).freezeWith(client)).sign(retailerKey)).execute(client);
console.log("after RETAILER sign| executed?", await executed(scheduleId), "(expect a timestamp)");

console.log("retailer pUSDC after:", await bal(retailer), "(expect +30,000,000 base units = 30 pUSDC)");
client.close();
