// The on-chain accrual fund. Trade spend is accrued up front and drawn down as
// validated claims settle. The brand treasury holds the pre-funded pUSDC accrual
// (the escrow); each mutually-consented settlement releases from it to the retailer.
// This reads the live balances so the console can show the fund drawing down.
import { getOperatorClient } from "@/lib/hedera/client";
import { AccountBalanceQuery } from "@hiero-ledger/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNIT = 1_000_000;

export async function GET() {
  const token = process.env.PUSDC_TOKEN_ID;
  const brand = process.env.BRAND_TREASURY_ID;
  const retailer = process.env.RETAILER_ACCOUNT_ID;
  const escrow = process.env.PROMO_ESCROW_ID ?? brand;
  if (!token || !escrow || !retailer) return Response.json({ configured: false });

  const client = getOperatorClient();
  const bal = async (id: string) => {
    const b = await new AccountBalanceQuery().setAccountId(id).execute(client);
    return Number(b.tokens?.get(token) ?? 0) / UNIT;
  };
  const [accrualBalance, released] = await Promise.all([bal(escrow), bal(retailer)]);

  return Response.json({
    configured: true,
    token: "pUSDC",
    escrowAccount: escrow,
    retailerAccount: retailer,
    accrualBalance, // remaining in the promotion fund (escrow)
    released, // total settled to the retailer
  });
}
