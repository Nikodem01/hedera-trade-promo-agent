// Server-side store for the confidential decision dossiers. Keyed by commitment
// (the Merkle root that IS anchored on-chain). The full dossier — fields, values,
// per-leaf salts — lives only here and is NEVER sent to the LLM, the browser, or
// the chain. The operator's private console and the disclosure route read it back
// by commitment. File-backed (tmpdir) so it survives dev restarts; production would
// be an access-controlled, encrypted store.
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Dossier } from "./dossier";

const DIR = join(tmpdir(), "promoproof-dossiers");
const ID_RE = /^[0-9a-f]{64}$/; // a sha256 hex commitment

export async function putDossier(d: Dossier): Promise<void> {
  if (!ID_RE.test(d.commitment)) throw new Error("invalid commitment");
  await mkdir(DIR, { recursive: true });
  await writeFile(join(DIR, `${d.commitment}.json`), JSON.stringify(d), "utf-8");
}

export async function getDossier(commitment: string): Promise<Dossier | null> {
  if (!ID_RE.test(commitment)) return null;
  try {
    return JSON.parse(await readFile(join(DIR, `${commitment}.json`), "utf-8")) as Dossier;
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
      try { out.push(JSON.parse(await readFile(join(DIR, f), "utf-8")) as Dossier); } catch { /* skip */ }
    }
    return out;
  } catch {
    return [];
  }
}
