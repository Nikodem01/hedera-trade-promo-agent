import { requirePublicAccess } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIRROR = "https://testnet.mirrornode.hedera.com/api/v1";
const FALLBACK_NFT_TOKEN_ID = "0.0.9088330";

type MirrorNft = {
  account_id?: string;
  created_timestamp?: string;
  metadata?: string;
  serial_number?: number;
  token_id?: string;
};

type MirrorNftResponse = {
  nfts?: MirrorNft[];
};

function nftTokenId(): string {
  return process.env.HTS_RECEIPT_NFT_TOKEN_ID || FALLBACK_NFT_TOKEN_ID;
}

export async function POST(req: Request) {
  const denied = requirePublicAccess(req, {
    rate: { name: "public-nft-attestation", limit: 40, windowMs: 10 * 60_000 },
  });
  if (denied) return denied;

  const { commitment } = (await req.json()) as { commitment?: string };
  if (!commitment || !/^[a-f0-9]{64}$/i.test(commitment)) {
    return Response.json({ error: "valid commitment required" }, { status: 400 });
  }

  const tokenId = nftTokenId();
  const encoded = Buffer.from(commitment, "utf8").toString("base64");
  const mirrorUrl = `${MIRROR}/tokens/${tokenId}/nfts?limit=50&order=desc`;

  const res = await fetch(mirrorUrl, { cache: "no-store" });
  if (!res.ok) {
    return Response.json({ error: "mirror node lookup failed" }, { status: 502 });
  }

  const json = (await res.json()) as MirrorNftResponse;
  const match = json.nfts?.find((nft) => nft.metadata === encoded);
  if (!match?.serial_number) {
    return Response.json({ tokenId, found: false }, { status: 404 });
  }

  const serialNumber = String(match.serial_number);
  return Response.json({
    found: true,
    tokenId: match.token_id ?? tokenId,
    serialNumber,
    accountId: match.account_id ?? null,
    createdTimestamp: match.created_timestamp ?? null,
    metadata: match.metadata,
    mirrorUrl: `${MIRROR}/tokens/${tokenId}/nfts/${serialNumber}`,
  });
}
