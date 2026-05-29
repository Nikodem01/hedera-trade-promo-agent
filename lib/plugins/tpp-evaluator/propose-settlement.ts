import { z } from "zod";
import { BaseTool, type Context } from "@hashgraph/hedera-agent-kit";
import { Client, TransferTransaction, ScheduleCreateTransaction, Timestamp } from "@hiero-ledger/sdk";

export const PROPOSE_SETTLEMENT = "propose_settlement";

// Defense-in-depth cap, independent of the LLM. Recipient + source are FIXED env
// accounts, never model-chosen.
const HARD_CAP = Number(process.env.SETTLEMENT_HARD_CAP_HBAR ?? 50);
const UNIT = 1_000_000; // pUSDC has 6 decimals

const proposeParameters = (_context: Context = {}) =>
  z.object({
    amount: z
      .number()
      .min(0)
      .describe("The settled amount from compute_settlement, to be paid in pUSDC."),
    commitment: z
      .string()
      .describe("The adjudication commitment (from adjudicate_claim provenance) this settlement is for."),
  });

type ProposeParams = z.infer<ReturnType<typeof proposeParameters>>;

/** Create a SCHEDULED pUSDC transfer brand-treasury -> retailer. It does NOT execute:
 * the schedule needs the brand approver's signature (authorize the spend) AND the
 * retailer's signature (accept, via receiverSigRequired). The agent/operator that
 * creates it holds neither key, so it can never move the funds — consent is enforced
 * by Hedera consensus, not by app logic. */
export async function proposeSettlement(p: ProposeParams, client: Client) {
  const brand = process.env.BRAND_TREASURY_ID;
  const retailer = process.env.RETAILER_ACCOUNT_ID;
  const token = process.env.PUSDC_TOKEN_ID;
  if (!brand || !retailer || !token) {
    return { error: "settlement not configured — run scripts/setup-settlement.mjs and set PUSDC_TOKEN_ID / BRAND_TREASURY_ID / RETAILER_ACCOUNT_ID" };
  }
  // Release from the promotion escrow (the accrual fund) if configured; the escrow's
  // key is the brand approver's, so the brand still authorizes the release.
  const source = process.env.PROMO_ESCROW_ID ?? brand;
  const capped = Math.min(Math.max(p.amount, 0), HARD_CAP);
  const base = Math.round(capped * UNIT);
  const transfer = new TransferTransaction()
    .addTokenTransfer(token, source, -base)
    .addTokenTransfer(token, retailer, base);
  // HIP-423 long-term schedule: a ~60-day window for the brand + retailer to both
  // sign (real approval cycles span days). waitForExpiry=false → it still executes
  // the instant both signatures are in (verified on testnet).
  const expirationTime = Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));
  const rcpt = await (
    await new ScheduleCreateTransaction()
      .setScheduledTransaction(transfer)
      .setExpirationTime(expirationTime)
      .setWaitForExpiry(false)
      .setScheduleMemo(`PromoProof settlement · commit ${p.commitment.slice(0, 16)}`)
      .execute(client)
  ).getReceipt(client);
  if (!rcpt.scheduleId) return { error: "schedule creation returned no scheduleId" };
  return {
    scheduleId: rcpt.scheduleId.toString(),
    amount: capped,
    token: "pUSDC",
    commitment: p.commitment,
    brand_treasury: brand,
    retailer_account: retailer,
    status: "awaiting_signatures",
    required: ["brand_approver", "retailer"],
    note: "Executes on-chain ONLY after BOTH the brand approver and the retailer sign. The agent cannot move these funds.",
  };
}

export class ProposeSettlementTool extends BaseTool {
  method = PROPOSE_SETTLEMENT;
  name = "Propose Settlement";
  description: string;
  parameters: ReturnType<typeof proposeParameters>;

  constructor(context: Context) {
    super();
    this.description =
      "After compute_settlement, propose the on-chain settlement for an approve/partial_credit decision: this creates a SCHEDULED pUSDC transfer from the brand treasury to the registered retailer for the computed amount. It does NOT pay — it returns a scheduleId that executes only once BOTH the brand approver AND the retailer sign on-chain (mutual consent). You cannot and must not move funds any other way. Pass the adjudication's commitment.";
    this.parameters = proposeParameters(context);
  }

  async normalizeParams(params: ProposeParams, _context: Context, _client: Client) {
    return params;
  }

  async coreAction(params: ProposeParams, _context: Context, client: Client) {
    return proposeSettlement(params, client);
  }

  async shouldSecondaryAction() {
    return false;
  }

  async secondaryAction(_request: unknown, _client: Client, _context: Context): Promise<never> {
    throw new Error("propose_settlement only schedules the transfer; signing happens off-agent via the consent gate.");
  }
}

const tool = (context: Context): BaseTool => new ProposeSettlementTool(context);
export default tool;
