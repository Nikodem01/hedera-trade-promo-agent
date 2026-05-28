// Accepts a retailer evidence photo, stores it server-side, and returns an opaque
// `upload:<id>` reference the agent can pass to adjudicate_claim. Bytes never pass
// through the LLM. Mirrors the bounty's image rules (JPG/PNG/WEBP, ≤6MB).
import { randomUUID } from "node:crypto";
import { saveUpload } from "@/lib/uploads";

export const runtime = "nodejs";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "no file provided" }, { status: 400 });
  }
  const ext = EXT[file.type];
  if (!ext) {
    return Response.json({ error: "unsupported image type — use JPG, PNG, or WEBP" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "image too large — max 6 MB" }, { status: 413 });
  }

  const id = `${randomUUID()}.${ext}`;
  await saveUpload(id, Buffer.from(await file.arrayBuffer()));
  return Response.json({ ref: `upload:${id}`, url: `/api/uploads/${id}` });
}
