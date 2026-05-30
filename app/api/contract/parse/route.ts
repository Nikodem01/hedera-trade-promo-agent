// Ingest a real contract: extract text from an uploaded PDF (CPG trade-promotion
// contracts are usually PDFs) so it can seed a claim's contract_text. Dynamic import
// keeps the PDF engine out of the main bundle.
import { requireAccess } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = requireAccess(req, { rate: { name: "parse", limit: 15, windowMs: 60_000 } });
  if (denied) return denied;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "no file provided" }, { status: 400 });
  if (file.type && file.type !== "application/pdf") return Response.json({ error: "expected a PDF" }, { status: 415 });

  try {
    const { PDFParse } = await import("pdf-parse");
    const buf = new Uint8Array(await file.arrayBuffer());
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    await parser.destroy?.();
    const text = (result?.text ?? "").trim();
    return Response.json({ text, chars: text.length });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "pdf parse failed" }, { status: 500 });
  }
}
