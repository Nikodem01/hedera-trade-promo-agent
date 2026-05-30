// AP2-aligned payment mandate for a settlement — a Verifiable Credential proving the
// authorized payment, in the Agent Payments Protocol vocabulary (CartMandate +
// PaymentMandate). The authorization is the on-chain mutual consent; this binds the
// mandate to it and signs it with the issuer key (as in /api/credential). Gated like
// other business-data routes (the mandate carries amount/parties → operator-only).
import { getDossier } from "@/lib/dossier-store";
import { computeSettlement } from "@/lib/plugins/tpp-evaluator/settlement";
import { buildPaymentMandate } from "@/lib/ap2";
import { requireAccess } from "@/lib/guard";
import { PrivateKey } from "@hiero-ledger/sdk";
import type { ComplianceAssessmentType } from "@/lib/plugins/tpp-evaluator/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const field = (d: { fields: { label: string; value: string }[] }, label: string) =>
  d.fields.find((f) => f.label === label)?.value ?? "";

export async function GET(req: Request) {
  const denied = requireAccess(req, { rate: { name: "mandate", limit: 40, windowMs: 60_000 } });
  if (denied) return denied;

  const url = new URL(req.url);
  const commitment = url.searchParams.get("commitment");
  if (!commitment) return Response.json({ error: "commitment required" }, { status: 400 });
  const d = await getDossier(commitment);
  if (!d) return Response.json({ error: "no dossier for that commitment" }, { status: 404 });

  const decision = field(d, "decision");
  const settlement = computeSettlement({
    decision: decision as ComplianceAssessmentType["decision"],
    recommended_credit_pct: Number(field(d, "recommended_credit_pct")) || 0,
    max_settlement_hbar: Number(field(d, "max_settlement_hbar")) || 0,
  });

  const net = process.env.HEDERA_NETWORK ?? "testnet";
  const mandate = buildPaymentMandate({
    commitment: d.commitment,
    decision,
    amount: settlement.amount_hbar,
    network: net,
    payerAccount: process.env.BRAND_TREASURY_ID,
    payeeAccount: process.env.RETAILER_ACCOUNT_ID,
    scheduleId: url.searchParams.get("scheduleId") ?? undefined,
    topicId: process.env.HCS_TOPIC_ID,
    createdAt: d.created_at,
  });

  // Issuer proof (signed with the operator key, as in /api/credential). The REAL
  // authorization is the on-chain mutual consent; this binds the mandate to the commitment.
  let proof: Record<string, unknown> = {
    type: "HederaConsensusAuthorization2026",
    proofPurpose: "assertionMethod",
    created: d.created_at,
    verificationMethod: `${mandate.issuer}#key-1`,
    commitment: d.commitment,
    note: "Authorization is enforced by Hedera consensus — both parties' on-chain signatures execute the scheduled transfer — not merely asserted by this signature.",
  };
  const pk = process.env.HEDERA_PRIVATE_KEY;
  if (pk) {
    const key = PrivateKey.fromStringECDSA(pk);
    const sig = key.sign(Buffer.from(JSON.stringify(mandate)));
    proof = { ...proof, signatureHex: Buffer.from(sig).toString("hex"), publicKeyHex: key.publicKey.toStringRaw() };
  }

  return new Response(JSON.stringify({ ...mandate, proof }, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="ap2-payment-mandate-${commitment.slice(0, 10)}.json"`,
    },
  });
}
