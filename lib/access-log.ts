// Provable access-audit log. Every read of confidential decision data (a disclosure)
// is recorded as a tamper-proof event: the who/what/when is sealed OFF-CHAIN as its own
// salted Merkle commitment (a dossier, itself selectively disclosable), and only a
// PROOF-ONLY record linking the access to the decision it touched is anchored on HCS.
//
// This is the SOC2/ISO-42001 access-logging control — but PROVABLE: a database access
// log is editable by whoever hosts it; a consensus-anchored one cannot be altered or
// backdated, and a counterparty/auditor can verify it without trusting our server.
// Same confidentiality model as adjudication: commitments on-chain, business data off.
import "server-only";
import { getOperatorClient } from "./hedera/client";
import { TopicMessageSubmitTransaction } from "@hiero-ledger/sdk";
import { buildCommitment, type Dossier } from "./dossier";
import { putDossier } from "./dossier-store";

export type AccessEvent = {
  action: "disclose" | "verify" | "export";
  target_commitment: string; // the decision commitment whose data was accessed
  actor_role: string; // attribution only (no auth): adjudicator | approver | auditor | retailer | operator
  scope?: string; // e.g. "full" | "counterparty" | "selective"
  labels?: string[]; // the field labels revealed
};

/** Build the confidential off-chain access-event dossier (salted Merkle commitment).
 * Pure — no I/O — so the confidentiality contract is unit-testable. */
export function buildAccessDossier(ev: AccessEvent, ts: string): Dossier {
  return buildCommitment(
    [
      { label: "kind", value: "access" },
      { label: "action", value: ev.action },
      { label: "target_commitment", value: ev.target_commitment },
      { label: "actor_role", value: ev.actor_role },
      { label: "scope", value: ev.scope ?? "" },
      { label: "labels", value: JSON.stringify(ev.labels ?? []) },
      { label: "accessed_at", value: ts },
    ],
    ts,
  );
}

/** The PROOF-ONLY record anchored to HCS: links the access commitment to the decision
 * it touched and carries NO business data (no role, no fields, no scope, no action). */
export function accessRecord(commitment: string, target_commitment: string, ts: string): string {
  return JSON.stringify({ schema: "PromoProof/v2", kind: "access-log", commitment, links_to: target_commitment, ts });
}

export type AccessResult = { commitment: string; anchor: { topicId: string; sequenceNumber: number } | null; ts: string };

/** Record an access. The off-chain dossier is sealed first (durable), then the proof-only
 * commitment is anchored on HCS best-effort — an anchor failure must never break the
 * primary action (the disclosure) that triggered the log. */
export async function logAccess(ev: AccessEvent): Promise<AccessResult> {
  const ts = new Date().toISOString();
  const dossier = buildAccessDossier(ev, ts);
  await putDossier(dossier);

  const topicId = process.env.HCS_TOPIC_ID;
  let anchor: AccessResult["anchor"] = null;
  if (topicId) {
    try {
      const client = getOperatorClient();
      const resp = await new TopicMessageSubmitTransaction({
        topicId,
        message: accessRecord(dossier.commitment, ev.target_commitment, ts),
      }).execute(client);
      const r = await resp.getReceipt(client);
      anchor = { topicId, sequenceNumber: Number(r.topicSequenceNumber ?? 0) };
    } catch {
      /* anchor is best-effort; the off-chain access record is already sealed */
    }
  }
  return { commitment: dossier.commitment, anchor, ts };
}
