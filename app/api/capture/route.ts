// DEV-ONLY capture utility (NOT a product surface). Runs ONE real claim through the
// UNCHANGED production pipeline — adjudicate_claim (real vision + independent reviewer
// + HCS anchor), compute_settlement, propose_settlement, the two-signature consent
// gate, the attestation mint, and a selective disclosure — and writes a ready-to-freeze
// FEATURED object to a temp file for the guided tour's data.ts. It invokes the protected
// logic; it never modifies it. Hard-gated: 403 on any public deploy.
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PUBLIC_READONLY } from "@/lib/guard";
import { getOperatorClient } from "@/lib/hedera/client";
import { adjudicate } from "@/lib/plugins/tpp-evaluator/adjudicate";
import { computeSettlement } from "@/lib/plugins/tpp-evaluator/settlement";
import { proposeSettlement } from "@/lib/plugins/tpp-evaluator/propose-settlement";
import { discloseFields } from "@/lib/dossier";
import { getDossier } from "@/lib/dossier-store";
import {
  PrivateKey,
  ScheduleSignTransaction,
  ScheduleInfoQuery,
  TokenMintTransaction,
} from "@hiero-ledger/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const OUT = join(tmpdir(), "featured-capture.json");
const COUNTERPARTY_LABELS = ["decision", "recommended_credit_pct", "max_settlement_hbar"];

type Adj = Awaited<ReturnType<typeof adjudicate>>;
const strip = (a: Adj) => ({
  decision: a.decision,
  confidence: a.confidence,
  recommended_credit_pct: a.recommended_credit_pct,
  max_settlement_hbar: a.max_settlement_hbar,
  criteria: a.criteria,
  reasoning_summary: a.reasoning_summary,
  evidence_requested: a.evidence_requested,
});

export async function POST(req: Request) {
  if (PUBLIC_READONLY) return Response.json({ error: "not available" }, { status: 403 });
  try {
    const result = await run(req);
    await writeFile(OUT, JSON.stringify(result, null, 2));
    return Response.json(result);
  } catch (e) {
    const err = { ok: false, error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined };
    await writeFile(OUT, JSON.stringify(err, null, 2)).catch(() => {});
    return Response.json(err, { status: 500 });
  }
}

async function run(req: Request) {
  const body = (await req.json()) as {
    contractFile?: string;
    imageRef?: string;
    retailer?: string;
    retailerId?: string;
    promotion?: string;
    promoSub?: string;
    narrative?: string;
    priorEvidence?: string;
    sign?: boolean;
    dryRun?: boolean;
  };

  const contract_text = body.contractFile
    ? await readFile(join(process.cwd(), "examples", "contracts", body.contractFile), "utf8")
    : null;
  if (!contract_text || !body.imageRef) {
    throw new Error("need contractFile and imageRef");
  }

  // dryRun: run the UNCHANGED vision pipeline with NO client, so adjudicate never
  // anchors to HCS and we skip propose/sign/mint — a zero-chain preview of the exact
  // decisions/boxes/settlement before any on-chain write ("don't fire blind").
  const dry = body.dryRun === true;
  const client = dry ? undefined : getOperatorClient();
  const retailer = body.retailer ?? "Retailer";
  const promotion = body.promotion ?? "Promotion";
  const narrative = body.narrative ?? "Promotion executed as contracted. Requesting settlement.";

  const a1 = await adjudicate({ contract_text, image_ref: body.imageRef, narrative, retailer, promotion }, client);

  let a2: Adj | null = null;
  if (a1.decision === "request_more_evidence" && body.priorEvidence) {
    a2 = await adjudicate(
      { contract_text, image_ref: body.imageRef, narrative, prior_evidence: body.priorEvidence, retailer, promotion },
      client,
    );
  }
  const finalAdj = a2 ?? a1;

  const settlement = computeSettlement({
    decision: finalAdj.decision,
    recommended_credit_pct: finalAdj.recommended_credit_pct,
    max_settlement_hbar: finalAdj.max_settlement_hbar,
  });

  let scheduleId: string | null = null;
  let amountPusdc: number | null = null;
  let proposeError: string | null = null;
  if (!dry && client && (finalAdj.decision === "approve" || finalAdj.decision === "partial_credit")) {
    const proposed = await proposeSettlement({ amount: settlement.amount_hbar, commitment: finalAdj.provenance.commitment }, client);
    if ("scheduleId" in proposed) {
      scheduleId = proposed.scheduleId ?? null;
      amountPusdc = proposed.amount ?? null;
    } else {
      proposeError = proposed.error ?? null;
    }
  }

  let executedAt: string | null = null;
  let nftSerial: string | null = null;
  if (body.sign && scheduleId && client) {
    const brandKey = process.env.BRAND_APPROVER_KEY;
    const retailerKey = process.env.RETAILER_KEY;
    if (brandKey && retailerKey) {
      for (const ks of [brandKey, retailerKey]) {
        try {
          await (await (await new ScheduleSignTransaction().setScheduleId(scheduleId).freezeWith(client)).sign(PrivateKey.fromStringDer(ks))).execute(client);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "";
          if (!/ALREADY_EXECUTED|NO_NEW_VALID_SIGNATURES/i.test(msg)) throw e;
        }
      }
      for (let i = 0; i < 6; i++) {
        const info = await new ScheduleInfoQuery().setScheduleId(scheduleId).execute(client);
        if (info.executed) { executedAt = info.executed.toDate().toISOString(); break; }
        await new Promise((r) => setTimeout(r, 1000));
      }
      const nftToken = process.env.HTS_RECEIPT_NFT_TOKEN_ID;
      if (executedAt && nftToken) {
        try {
          const mint = await (await new TokenMintTransaction().setTokenId(nftToken).setMetadata([Buffer.from(finalAdj.provenance.commitment)]).execute(client)).getReceipt(client);
          nftSerial = mint.serials?.[0]?.toString() ?? null;
        } catch { /* best-effort */ }
      }
    }
  }

  const dossier = await getDossier(finalAdj.provenance.commitment);
  const disclosure = dossier ? discloseFields(dossier, COUNTERPARTY_LABELS) : null;

  const featured = {
    retailer,
    retailerId: body.retailerId ?? "",
    promotion,
    promoSub: body.promoSub ?? "",
    claimId: `CLM-${new Date().toISOString().slice(0, 10)}-CAP`,
    contractId: process.env.HCS_TOPIC_ID ?? "",
    submittedAt: new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC",
    submittedBy: "captured run",
    contractText: contract_text,
    narrative,
    imageRef: body.imageRef,
    assessment: strip(a1),
    review: a1.review ?? { agrees: true, concern: "none", recommended_action: "accept" },
    citations: a1.citations ?? [],
    evidenceReply: a2 ? body.priorEvidence : undefined,
    revisedAssessment: a2 ? strip(a2) : undefined,
    settlement: finalAdj.decision === "approve" || finalAdj.decision === "partial_credit" ? settlement : null,
    amountPusdc,
    scheduleId,
    nftSerial,
    commitment: finalAdj.provenance.commitment,
    imageFp: finalAdj.provenance.image_fp,
    seq: finalAdj.anchor?.sequenceNumber ?? 0,
    consensusTs: finalAdj.provenance.adjudicated_at.replace("T", " ").slice(0, 19) + " UTC",
    model: finalAdj.provenance.model,
    disclosure,
  };

  return {
    ok: true,
    summary: {
      pass1: a1.decision,
      pass2: a2?.decision ?? null,
      pass1_boxes: a1.criteria.filter((c) => Array.isArray(c.box)).length,
      final_boxes: finalAdj.criteria.filter((c) => Array.isArray(c.box)).length,
      seq1: a1.anchor?.sequenceNumber ?? null,
      seq2: a2?.anchor?.sequenceNumber ?? null,
      scheduleId,
      amountPusdc,
      executedAt,
      nftSerial,
      proposeError,
    },
    featured,
  };
}
