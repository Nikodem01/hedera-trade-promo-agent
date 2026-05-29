// Issue a W3C-Verifiable-Credential-shaped settlement attestation for a commitment.
// Issuer = the brand (did:hedera identifier from its account); subject = the retailer.
// The proof binds the credential to the on-chain commitment AND carries an issuer
// signature (operator key), so a holder can present it and a verifier can check both
// the signature and the commitment on the public ledger. (Full Hedera DID-document
// registration via the official DID SDK is the production path; this is the VC shape.)
import { getDossier } from "@/lib/dossier-store";
import { PrivateKey } from "@hiero-ledger/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const field = (d: { fields: { label: string; value: string }[] }, label: string) => d.fields.find((f) => f.label === label)?.value ?? "";

export async function GET(req: Request) {
  const commitment = new URL(req.url).searchParams.get("commitment");
  if (!commitment) return Response.json({ error: "commitment required" }, { status: 400 });
  const d = await getDossier(commitment);
  if (!d) return Response.json({ error: "no dossier for that commitment" }, { status: 404 });

  const net = process.env.HEDERA_NETWORK ?? "testnet";
  const issuer = `did:hedera:${net}:${process.env.HEDERA_ACCOUNT_ID}`;
  const subject = `did:hedera:${net}:${process.env.RETAILER_ACCOUNT_ID ?? "0.0.0"}`;

  const vc: Record<string, unknown> = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "TradePromotionSettlement"],
    issuer,
    issuanceDate: d.created_at,
    credentialSubject: {
      id: subject,
      retailer: field(d, "retailer") || undefined,
      promotion: field(d, "promotion") || undefined,
      decision: field(d, "decision"),
      commitment: d.commitment,
      auditTopic: process.env.HCS_TOPIC_ID ?? undefined,
    },
  };

  // Sign the canonical credential (sans proof) with the issuer's Hedera key.
  let proof: Record<string, unknown> = { type: "HederaCommitment2026", commitment: d.commitment, verificationMethod: `${issuer}#key-1` };
  const pk = process.env.HEDERA_PRIVATE_KEY;
  if (pk) {
    const key = PrivateKey.fromStringECDSA(pk);
    const sig = key.sign(Buffer.from(JSON.stringify(vc)));
    proof = { ...proof, proofPurpose: "assertionMethod", created: d.created_at, signatureHex: Buffer.from(sig).toString("hex"), publicKeyHex: key.publicKey.toStringRaw() };
  }
  vc.proof = proof;

  return new Response(JSON.stringify(vc, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="promoproof-vc-${commitment.slice(0, 10)}.json"` },
  });
}
