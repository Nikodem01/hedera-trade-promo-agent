// Batched anchoring: roll many decision commitments into ONE Merkle root anchored
// to HCS — cheaper at scale and hiding per-decision timing/volume. Each commitment
// still proves membership via its path to the batch root. File-backed for the demo.
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { merkleRoot, merkleProof, verifyProof, type ProofStep } from "./merkle";

const DIR = join(tmpdir(), "promoproof-batches");
const asLeaves = (commitments: string[]) => commitments.map((c) => Buffer.from(c, "hex"));

export type Batch = { root: string; commitments: string[]; ts: string; sequenceNumber?: number };

export function batchRoot(commitments: string[]): string {
  return merkleRoot(asLeaves(commitments));
}

export async function putBatch(b: Batch): Promise<void> {
  await mkdir(DIR, { recursive: true });
  await writeFile(join(DIR, `${b.root}.json`), JSON.stringify(b), "utf-8");
}

export async function allBatches(): Promise<Batch[]> {
  try {
    const files = await readdir(DIR);
    const out: Batch[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try { out.push(JSON.parse(await readFile(join(DIR, f), "utf-8")) as Batch); } catch { /* skip */ }
    }
    return out;
  } catch {
    return [];
  }
}

/** Commitments already sealed into some batch (so a re-seal only roots new ones). */
export async function sealedCommitments(): Promise<Set<string>> {
  const set = new Set<string>();
  for (const b of await allBatches()) for (const c of b.commitments) set.add(c);
  return set;
}

/** Prove a single commitment belongs to a batch root. */
export function proveInBatch(b: Batch, commitment: string): { proof: ProofStep[]; valid: boolean } | null {
  const idx = b.commitments.indexOf(commitment);
  if (idx < 0) return null;
  const proof = merkleProof(asLeaves(b.commitments), idx);
  return { proof, valid: verifyProof(Buffer.from(commitment, "hex"), proof, b.root) };
}
