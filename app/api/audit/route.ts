// Reads the immutable PromoProof decision ledger back from Hedera's Mirror Node
// REST API — independent of our own server, proving the on-chain audit trail is
// real and verifiable by anyone. Free, no key required. HCS_TOPIC_ID stays
// server-side; the client only ever sees decoded records.
import { fetchAuditEntries } from "@/lib/hedera/mirror";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { topicId, entries, error } = await fetchAuditEntries(25);
  if (error) {
    return Response.json({ topicId, entries, error }, { status: 502 });
  }
  return Response.json({ topicId, entries });
}
