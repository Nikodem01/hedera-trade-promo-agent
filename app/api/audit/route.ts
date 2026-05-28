// Reads the immutable PromoProof decision ledger back from Hedera's Mirror Node
// REST API — independent of our own server, proving the on-chain audit trail is
// real and verifiable by anyone. Free, no key required. HCS_TOPIC_ID stays
// server-side; the client only ever sees decoded records.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MirrorMessage = {
  sequence_number: number;
  consensus_timestamp: string;
  message: string; // base64
};

export type AuditEntry = {
  sequenceNumber: number;
  consensusTimestamp: string;
  record: Record<string, unknown> | string; // parsed PromoProof record, or raw text
};

export async function GET() {
  const topicId = process.env.HCS_TOPIC_ID;
  if (!topicId) {
    return Response.json({ topicId: null, entries: [] });
  }

  const network = process.env.HEDERA_NETWORK ?? "testnet";
  const url = `https://${network}.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?order=desc&limit=25`;

  const res = await fetch(url);
  if (!res.ok) {
    return Response.json({ topicId, entries: [], error: `mirror node ${res.status}` }, { status: 502 });
  }

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

  return Response.json({ topicId, entries });
}
