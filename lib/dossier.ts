// The off-chain decision dossier: the complete, confidential provenance of one
// adjudication — every audited field as a per-leaf-salted Merkle leaf. The Merkle
// ROOT (`commitment`) is the only thing anchored on-chain; the dossier itself,
// including the salts, NEVER leaves the operator's server. Per-leaf salts mean a
// selective disclosure that reveals one field's salt cannot be used to brute-force
// a low-entropy sibling (e.g. guessing decision=approve), because each sibling has
// its own secret salt.
import { randomBytes, createHmac, createHash } from "node:crypto";
import { leafHash, merkleRoot, merkleProof, verifyProof, type ProofStep } from "./merkle";

// Keyed (HMAC) image fingerprint: stable across claims (same key) so proof-reuse is
// detectable by parties holding the key, but not a public re-identifiable hash.
const IMAGE_FP_KEY = process.env.IMAGE_FP_KEY ?? "promoproof-demo-image-fp-key";

export function imageFingerprint(imageBytes: Buffer): string {
  return createHmac("sha256", IMAGE_FP_KEY).update(imageBytes).digest("hex");
}

const sha256hex = (b: Buffer) => createHash("sha256").update(b).digest("hex");

export type DossierField = { label: string; value: string; salt: string };

export type Dossier = {
  commitment: string; // Merkle root (hex) — the ONLY value anchored on-chain
  image_fp: string; // keyed fingerprint (hex) — anchored for cross-claim reuse detection
  fields: DossierField[]; // full confidential provenance — off-chain only
  created_at: string;
};

export type AssessmentForDossier = {
  decision: string;
  confidence: number;
  recommended_credit_pct: number;
  max_settlement_hbar: number;
  reasoning_summary: string;
  criteria: { clause_ref: string; requirement: string; status: string; observed_in_photo: string; concern: string }[];
};

export type DossierInput = {
  contract_text: string;
  narrative: string;
  prior_evidence?: string;
  imageBytes: Buffer;
  system_prompt: string;
  model: string;
  thinking_settings: string;
  assessment: AssessmentForDossier;
  authenticity?: string; // JSON of the evidence-authenticity signals
  citations?: string; // JSON of the citation-verification results
  review?: string; // JSON of the independent reviewer's audit
  safety_gate?: string; // JSON of the deterministic safety-gate evaluation (model_decision, reasons)
  retailer?: string;
  promotion?: string;
  adjudicated_at: string;
};

/** Build the full provenance dossier, salting each field independently and
 * committing all of them to a single Merkle root. */
export function buildDossier(input: DossierInput): Dossier {
  const raw: { label: string; value: string }[] = [
    { label: "contract_text", value: input.contract_text },
    { label: "narrative", value: input.narrative },
    ...(input.prior_evidence ? [{ label: "prior_evidence", value: input.prior_evidence }] : []),
    { label: "image_sha256", value: sha256hex(input.imageBytes) },
    { label: "system_prompt", value: input.system_prompt },
    { label: "model", value: input.model },
    { label: "thinking_settings", value: input.thinking_settings },
    { label: "decision", value: input.assessment.decision },
    { label: "confidence", value: String(input.assessment.confidence) },
    { label: "recommended_credit_pct", value: String(input.assessment.recommended_credit_pct) },
    { label: "max_settlement_hbar", value: String(input.assessment.max_settlement_hbar) },
    { label: "reasoning_summary", value: input.assessment.reasoning_summary },
    ...(input.authenticity ? [{ label: "authenticity", value: input.authenticity }] : []),
    ...(input.citations ? [{ label: "citations", value: input.citations }] : []),
    ...(input.review ? [{ label: "reviewer", value: input.review }] : []),
    ...(input.safety_gate ? [{ label: "safety_gate", value: input.safety_gate }] : []),
    ...(input.retailer ? [{ label: "retailer", value: input.retailer }] : []),
    ...(input.promotion ? [{ label: "promotion", value: input.promotion }] : []),
    { label: "adjudicated_at", value: input.adjudicated_at },
    ...input.assessment.criteria.map((c) => ({
      label: `criterion:${c.clause_ref}`,
      value: JSON.stringify({ requirement: c.requirement, status: c.status, observed_in_photo: c.observed_in_photo, concern: c.concern }),
    })),
  ];
  const fields: DossierField[] = raw.map((x) => ({ ...x, salt: randomBytes(16).toString("hex") }));
  const leaves = fields.map((x) => leafHash(Buffer.from(x.salt, "hex"), x.label, x.value));
  return {
    commitment: merkleRoot(leaves),
    image_fp: imageFingerprint(input.imageBytes),
    fields,
    created_at: input.adjudicated_at,
  };
}

/** The proof-only record anchored to HCS — contains NO business data. */
export function commitmentRecord(d: Dossier): string {
  return JSON.stringify({ schema: "PromoProof/v2", kind: "adjudication-commitment", commitment: d.commitment, image_fp: d.image_fp, ts: d.created_at });
}

/** Generic salted-Merkle commitment over arbitrary labelled fields — used for records
 * that aren't full adjudications (e.g. a human override). Same confidentiality model:
 * fields + salts stay off-chain; only the root is anchored. (No image, so image_fp ""). */
export function buildCommitment(rawFields: { label: string; value: string }[], created_at: string): Dossier {
  const fields: DossierField[] = rawFields.map((x) => ({ ...x, salt: randomBytes(16).toString("hex") }));
  const leaves = fields.map((x) => leafHash(Buffer.from(x.salt, "hex"), x.label, x.value));
  return { commitment: merkleRoot(leaves), image_fp: "", fields, created_at };
}

export type Disclosure = {
  commitment: string;
  revealed: { label: string; value: string; salt: string; proof: ProofStep[] }[];
};

/** Produce a disclosure package for the chosen labels: just those leaves, with their
 * salts and Merkle proofs — provable against the on-chain commitment, exposing nothing else. */
export function discloseFields(d: Dossier, labels: string[]): Disclosure {
  const leaves = d.fields.map((x) => leafHash(Buffer.from(x.salt, "hex"), x.label, x.value));
  const revealed = labels.flatMap((label) => {
    const idx = d.fields.findIndex((x) => x.label === label);
    if (idx < 0) return [];
    const x = d.fields[idx];
    return [{ label: x.label, value: x.value, salt: x.salt, proof: merkleProof(leaves, idx) }];
  });
  return { commitment: d.commitment, revealed };
}

/** Verify each revealed field against the disclosure's commitment (independent of any server). */
export function verifyDisclosure(disc: Disclosure): { label: string; value: string; ok: boolean }[] {
  return disc.revealed.map((r) => {
    const leaf = leafHash(Buffer.from(r.salt, "hex"), r.label, r.value);
    return { label: r.label, value: r.value, ok: verifyProof(leaf, r.proof, disc.commitment) };
  });
}
