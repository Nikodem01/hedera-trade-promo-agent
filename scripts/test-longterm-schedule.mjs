// Determine the right long-term schedule config: a long collection window (HIP-423)
// that STILL executes immediately once both signatures are in (waitForExpiry=false).
// Run: node --env-file=.env.local scripts/test-longterm-schedule.mjs
import { Client, PrivateKey, TransferTransaction, ScheduleCreateTransaction, ScheduleSignTransaction, ScheduleInfoQuery, Timestamp } from "@hiero-ledger/sdk";

const client = Client.forTestnet().setOperator(process.env.HEDERA_ACCOUNT_ID, PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY));
const pusdc = process.env.PUSDC_TOKEN_ID, brand = process.env.BRAND_TREASURY_ID, retailer = process.env.RETAILER_ACCOUNT_ID;
const brandKey = PrivateKey.fromStringDer(process.env.BRAND_APPROVER_KEY), retailerKey = PrivateKey.fromStringDer(process.env.RETAILER_KEY);
const amt = 1 * 1e6;

const executed = async (id) => { const i = await new ScheduleInfoQuery().setScheduleId(id).execute(client); return i.executed ? i.executed.toDate().toISOString() : null; };

const transfer = new TransferTransaction().addTokenTransfer(pusdc, brand, -amt).addTokenTransfer(pusdc, retailer, amt);
const rcpt = await (await new ScheduleCreateTransaction()
  .setScheduledTransaction(transfer)
  .setExpirationTime(Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)))
  .setWaitForExpiry(false)
  .setScheduleMemo("longterm + waitForExpiry=false test")
  .execute(client)).getReceipt(client);
const id = rcpt.scheduleId.toString();
console.log("scheduled (60d expiry, waitForExpiry=false):", id);
await (await (await new ScheduleSignTransaction().setScheduleId(id).freezeWith(client)).sign(brandKey)).execute(client);
console.log("after brand   | executed?", await executed(id), "(expect null)");
await (await (await new ScheduleSignTransaction().setScheduleId(id).freezeWith(client)).sign(retailerKey)).execute(client);
console.log("after retailer| executed?", await executed(id), "(expect a timestamp = immediate execution)");
client.close();
