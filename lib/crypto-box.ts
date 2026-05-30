// Authenticated encryption (AES-256-GCM) for the at-rest dossier store. Kept as a
// small, pure, dependency-free module so the seal/open round-trip is unit-testable
// independent of the filesystem and process env. The key is derived from a high-entropy
// secret (DOSSIER_ENC_KEY) via scrypt; the salt is fixed and app-specific on purpose so
// derivation is DETERMINISTIC — encrypted files must stay readable across restarts.
import "server-only";
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from "node:crypto";

const SALT = "promoproof-dossier-v1";

export function deriveKey(secret: string): Buffer {
  return scryptSync(secret, SALT, 32);
}

type Envelope = { __enc: 1; iv: string; tag: string; ct: string };

/** Encrypt `plaintext` into a self-describing JSON envelope (random IV + GCM auth tag). */
export function seal(key: Buffer, plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const env: Envelope = { __enc: 1, iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex"), ct: ct.toString("hex") };
  return JSON.stringify(env);
}

/** Decrypt an envelope produced by `seal`. Non-envelope input is returned as-is (legacy
 * plaintext dossiers written before encryption was enabled). A tampered ciphertext or
 * auth tag throws — the GCM tag verification fails closed. */
export function open(key: Buffer | null, raw: string): string {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return raw; }
  const env = parsed as Partial<Envelope>;
  if (!env || env.__enc !== 1) return raw; // legacy plaintext
  if (!key) throw new Error("DOSSIER_ENC_KEY is required to read an encrypted dossier");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(env.iv as string, "hex"));
  decipher.setAuthTag(Buffer.from(env.tag as string, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(env.ct as string, "hex")), decipher.final()]).toString("utf8");
}
