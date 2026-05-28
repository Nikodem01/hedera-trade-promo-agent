// Server-side store for retailer-supplied evidence photos uploaded mid-negotiation
// (e.g. a clearer shot when the agent can't read the original). Files live in the
// OS temp dir keyed by a server-generated id, so the LLM only ever passes a tiny
// opaque `upload:<id>` reference — never image bytes. Ids are strictly validated
// (uuid + known extension), so an attacker-controlled ref can't traverse the path.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DIR = join(tmpdir(), "promoproof-uploads");

/** uuid + image extension, exactly as minted by saveUpload — rejects anything else. */
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export const isValidUploadId = (id: string) => ID_RE.test(id);

export function uploadMediaType(id: string): string {
  if (id.endsWith(".png")) return "image/png";
  if (id.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function saveUpload(id: string, bytes: Buffer): Promise<void> {
  if (!isValidUploadId(id)) throw new Error("invalid upload id");
  await mkdir(DIR, { recursive: true });
  await writeFile(join(DIR, id), bytes);
}

export async function readUpload(id: string): Promise<Buffer> {
  if (!isValidUploadId(id)) throw new Error("invalid upload id");
  return readFile(join(DIR, id));
}
