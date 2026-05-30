// The consent gate, on-chain. A scheduled pUSDC settlement (created by
// propose_settlement) executes only once BOTH parties sign. This route adds one
// party's signature: the brand approver (authorize the spend) or the retailer
// (accept the settlement). Hedera executes automatically when both are present —
// no single key, and certainly not the agent, can move the funds. On execution we
// mint the attestation NFT (metadata = the decision commitment).
import { getOperatorClient } from "@/lib/hedera/client";
import { requireAccess } from "@/lib/guard";
import {
  PrivateKey,
  ScheduleSignTransaction,
  ScheduleInfoQuery,
  TokenMintTransaction,
} from "@hiero-ledger/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = requireAccess(req, { rate: { name: "settle", limit: 20, windowMs: 60_000 } });
  if (denied) return denied;
  const { scheduleId, role, commitment } = (await req.json()) as {
    scheduleId?: string;
    role?: "brand" | "retailer";
    commitment?: string;
  };
  if (!scheduleId || (role !== "brand" && role !== "retailer")) {
    return Response.json({ error: "scheduleId and role ('brand'|'retailer') required" }, { status: 400 });
  }
  const keyStr = role === "brand" ? process.env.BRAND_APPROVER_KEY : process.env.RETAILER_KEY;
  if (!keyStr) return Response.json({ error: `${role} key not configured` }, { status: 500 });

  const client = getOperatorClient();
  const key = PrivateKey.fromStringDer(keyStr);

  // Already executed? (idempotent re-clicks) — report, don't re-sign or re-mint.
  const before = await new ScheduleInfoQuery().setScheduleId(scheduleId).execute(client);
  if (before.executed) {
    return Response.json({ scheduleId, role, executed: true, executedAt: before.executed.toDate().toISOString(), alreadyExecuted: true });
  }

  try {
    await (await (await new ScheduleSignTransaction().setScheduleId(scheduleId).freezeWith(client)).sign(key)).execute(client);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sign failed";
    if (!/ALREADY_EXECUTED|NO_NEW_VALID_SIGNATURES/i.test(msg)) {
      return Response.json({ error: msg }, { status: 502 });
    }
  }

  // Execution is externalized a moment after the signing receipt (it's a separate
  // record at consensusTimestamp+1ns), so poll briefly to catch it reliably.
  let executedAt: string | null = null;
  for (let i = 0; i < 5; i++) {
    const info = await new ScheduleInfoQuery().setScheduleId(scheduleId).execute(client);
    if (info.executed) {
      executedAt = info.executed.toDate().toISOString();
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  // On execution, mint the unique attestation NFT bound to the decision commitment.
  let nftSerial: string | null = null;
  const nftToken = process.env.HTS_RECEIPT_NFT_TOKEN_ID;
  if (executedAt && nftToken && typeof commitment === "string" && commitment) {
    try {
      const mint = await (
        await new TokenMintTransaction().setTokenId(nftToken).setMetadata([Buffer.from(commitment)]).execute(client)
      ).getReceipt(client);
      nftSerial = mint.serials?.[0]?.toString() ?? null;
    } catch {
      // attestation mint is best-effort; the settlement itself already executed
    }
  }

  return Response.json({ scheduleId, role, executed: !!executedAt, executedAt, nftSerial });
}
