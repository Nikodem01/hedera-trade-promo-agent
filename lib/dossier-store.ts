// Server-side store for the confidential decision dossiers. Keyed by commitment
// (the Merkle root that IS anchored on-chain). The full dossier — fields, values,
// per-leaf salts — lives only here and is NEVER sent to the LLM, the browser, or
// the chain. The operator's private console and the disclosure route read it back
// by commitment. File-backed (tmpdir) so it survives dev restarts.
//
// At rest the dossier is ENCRYPTED with AES-256-GCM when DOSSIER_ENC_KEY is set
// (required in production; documented in docs/SECURITY.md). Without the key it falls
// back to plaintext for local dev. Reads transparently handle both, so legacy plaintext
// files and newly-encrypted ones coexist.
import "server-only";
import { mkdir, readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Dossier } from "./dossier";
import { deriveKey, seal, open } from "./crypto-box";

const DIR = join(tmpdir(), "promoproof-dossiers");
const ID_RE = /^[0-9a-f]{64}$/; // a sha256 hex commitment
const KEY = process.env.DOSSIER_ENC_KEY ? deriveKey(process.env.DOSSIER_ENC_KEY) : null;

export async function putDossier(d: Dossier): Promise<void> {
  if (!ID_RE.test(d.commitment)) throw new Error("invalid commitment");
  await mkdir(DIR, { recursive: true });
  const plaintext = JSON.stringify(d);
  await writeFile(join(DIR, `${d.commitment}.json`), KEY ? seal(KEY, plaintext) : plaintext, "utf-8");
}

export async function getDossier(commitment: string): Promise<Dossier | null> {
  if (!ID_RE.test(commitment)) return null;
  try {
    return JSON.parse(open(KEY, await readFile(join(DIR, `${commitment}.json`), "utf-8"))) as Dossier;
  } catch {
    return null;
  }
}

/** All stored dossiers (operator-side; for the private portfolio view + reuse checks). */
export async function allDossiers(): Promise<Dossier[]> {
  try {
    const files = await readdir(DIR);
    const out: Dossier[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try { out.push(JSON.parse(open(KEY, await readFile(join(DIR, f), "utf-8"))) as Dossier); } catch { /* skip */ }
    }
    return out;
  } catch {
    return [];
  }
}

/** Crypto-shredding deletion (data-retention / right-to-erasure). Removing the off-chain
 * dossier renders its on-chain commitment PERMANENTLY opaque — the salted Merkle root can
 * never again be opened or disclosed — an EDPB/GDPR-aligned erasure that leaves the
 * immutable proof intact but unrecoverable. Returns true if a dossier was deleted. */
export async function deleteDossier(commitment: string): Promise<boolean> {
  if (!ID_RE.test(commitment)) return false;
  try {
    await unlink(join(DIR, `${commitment}.json`));
    return true;
  } catch {
    return false;
  }
}
