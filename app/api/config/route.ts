// Public client config — no secrets. Tells the UI whether it's a public deployment
// (so the shell defaults to the read-only + scripted-demo experience and offers an
// operator unlock) and the operator account id for display.
import { PUBLIC_READONLY } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    publicReadonly: PUBLIC_READONLY,
    operator: process.env.HEDERA_ACCOUNT_ID ?? null,
    network: process.env.HEDERA_NETWORK ?? "testnet",
  });
}
