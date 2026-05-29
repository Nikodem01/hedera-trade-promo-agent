// Refund the unspent accrual at the promotion window's end. Trade spend that isn't
// drawn down by validated claims returns to the brand. This schedules a HIP-423
// long-term transfer (escrow → brand) with waitForExpiry=true, so Hedera executes it
// automatically at the window end — no manual settlement, no custodian.
import { getOperatorClient } from "@/lib/hedera/client";
import { PrivateKey, AccountBalanceQuery, TransferTransaction, ScheduleCreateTransaction, Timestamp } from "@hiero-ledger/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = process.env.PUSDC_TOKEN_ID;
  const escrow = process.env.PROMO_ESCROW_ID;
  const brand = process.env.BRAND_TREASURY_ID;
  const brandKeyStr = process.env.BRAND_APPROVER_KEY;
  if (!token || !escrow || !brand || !brandKeyStr) {
    return Response.json({ error: "escrow not configured (need PROMO_ESCROW_ID + BRAND_TREASURY_ID + BRAND_APPROVER_KEY)" }, { status: 400 });
  }
  const { expirySeconds } = (await req.json().catch(() => ({}))) as { expirySeconds?: number };
  const client = getOperatorClient();

  const b = await new AccountBalanceQuery().setAccountId(escrow).execute(client);
  const remainingBase = Number(b.tokens?.get(token) ?? 0);
  if (remainingBase <= 0) return Response.json({ error: "escrow already empty" }, { status: 400 });

  const transfer = new TransferTransaction()
    .addTokenTransfer(token, escrow, -remainingBase)
    .addTokenTransfer(token, brand, remainingBase);
  const expiry = Timestamp.fromDate(new Date(Date.now() + (Number(expirySeconds) || 90) * 1000));
  const brandKey = PrivateKey.fromStringDer(brandKeyStr);

  const rcpt = await (
    await (
      await new ScheduleCreateTransaction()
        .setScheduledTransaction(transfer)
        .setExpirationTime(expiry)
        .setWaitForExpiry(true) // execute at the window end, not on signature
        .setScheduleMemo("PromoProof accrual refund — unspent budget returns at window end")
        .freezeWith(client)
    ).sign(brandKey)
  ).execute(client);
  const r = await rcpt.getReceipt(client);

  return Response.json({
    scheduleId: r.scheduleId?.toString() ?? null,
    refundAmount: remainingBase / 1_000_000,
    executesAt: expiry.toDate().toISOString(),
    waitForExpiry: true,
  });
}
