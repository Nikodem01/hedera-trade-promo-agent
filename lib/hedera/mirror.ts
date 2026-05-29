// Reads the immutable PromoProof decision ledger back from Hedera's Mirror Node
// REST API — free, no key required. Shared by the audit read-back route
// (/api/audit) and the verify route (/api/verify) so both see the exact same
// on-chain records. HCS_TOPIC_ID stays server-side; callers only see decoded data.

export type AuditEntry = {
  sequenceNumber: number;
  consensusTimestamp: string;
  record: Record<string, unknown> | string; // parsed PromoProof record, or raw text
};

type MirrorMessage = {
  sequence_number: number;
  consensus_timestamp: string;
  message: string; // base64
};

export type AuditFetch = {
  topicId: string | null;
  entries: AuditEntry[];
  error?: string;
};

/** Fetch and decode the most recent decision records from the audit topic. */
export async function fetchAuditEntries(limit = 25): Promise<AuditFetch> {
  const topicId = process.env.HCS_TOPIC_ID;
  if (!topicId) return { topicId: null, entries: [] };

  const network = process.env.HEDERA_NETWORK ?? "testnet";
  const url = `https://${network}.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?order=desc&limit=${limit}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { topicId, entries: [], error: `mirror node ${res.status}` };

  const data = (await res.json()) as { messages?: MirrorMessage[] };
  const entries: AuditEntry[] = (data.messages ?? []).map((m) => {
    const text = Buffer.from(m.message, "base64").toString("utf-8");
    let record: Record<string, unknown> | string = text;
    try {
      record = JSON.parse(text) as Record<string, unknown>;
    } catch {
      // leave as raw text
    }
    return {
      sequenceNumber: m.sequence_number,
      consensusTimestamp: m.consensus_timestamp,
      record,
    };
  });

  return { topicId, entries };
}
