// Evidence-authenticity signals for a proof photo. Objective signals (EXIF capture
// metadata) computed in code; a soft visual manipulation signal comes from the model.
// Cross-claim REUSE is detected separately, on-chain, via the keyed image fingerprint.
import exifr from "exifr";

export type Authenticity = {
  has_capture_metadata: boolean;
  capture_time?: string; // ISO, from EXIF DateTimeOriginal/CreateDate
  gps?: string;          // "lat, lng" if geotagged
  camera?: string;       // Make + Model
  manipulation_likelihood?: number; // 0-1, model's visual opinion (soft signal)
  manipulation_note?: string;
};

/** Read objective capture metadata from the image bytes (absent on stripped/edited
 * or stock photos — itself informative: no verifiable capture time/location). */
export async function parseExif(bytes: Buffer): Promise<{ capture_time?: string; gps?: string; camera?: string }> {
  try {
    const d = (await exifr.parse(bytes, { gps: true })) as Record<string, unknown> | undefined;
    if (!d) return {};
    const dt = (d.DateTimeOriginal ?? d.CreateDate ?? d.ModifyDate) as Date | string | undefined;
    const capture_time = dt ? new Date(dt as string).toISOString() : undefined;
    const lat = d.latitude as number | undefined;
    const lng = d.longitude as number | undefined;
    const gps = lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : undefined;
    const camera = [d.Make, d.Model].filter(Boolean).join(" ") || undefined;
    return { capture_time, gps, camera };
  } catch {
    return {};
  }
}

/** Combine code-derived EXIF with the model's soft manipulation opinion. */
export async function assessAuthenticity(
  bytes: Buffer,
  model?: { manipulation_likelihood?: number; note?: string },
): Promise<Authenticity> {
  const exif = await parseExif(bytes);
  return {
    has_capture_metadata: !!(exif.capture_time || exif.gps),
    capture_time: exif.capture_time,
    gps: exif.gps,
    camera: exif.camera,
    manipulation_likelihood: model?.manipulation_likelihood,
    manipulation_note: model?.note,
  };
}
