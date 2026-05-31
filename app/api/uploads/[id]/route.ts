// Streams a previously uploaded evidence photo back for display in the console.
import { requireAccess } from "@/lib/guard";
import { readUpload, uploadMediaType } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAccess(req, { rate: { name: "uploads", limit: 80, windowMs: 60_000 } });
  if (denied) return denied;
  const { id } = await params;
  try {
    const bytes = await readUpload(id);
    return new Response(new Uint8Array(bytes), {
      headers: { "content-type": uploadMediaType(id), "cache-control": "private, max-age=300" },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
