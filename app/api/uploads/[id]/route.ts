// Streams a previously uploaded evidence photo back for display in the console.
import { readUpload, uploadMediaType } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
