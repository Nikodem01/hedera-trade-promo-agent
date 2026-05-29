// A minimal, dependency-free salted Merkle tree. Each audited field is a leaf
// `sha256(0x00 ‖ salt ‖ label ‖ value)`; internal nodes are `sha256(0x01 ‖ L ‖ R)`.
// The leaf/node domain-separation byte blocks second-preimage tricks, and the salt
// means the published root is not a re-identifiable fingerprint of the plaintext
// (per EDPB guidance). Single-leaf proofs let one field be revealed and verified
// against the on-chain root without exposing any sibling — the basis of selective
// disclosure.
import { createHash } from "node:crypto";

const LEAF = Buffer.from([0x00]);
const NODE = Buffer.from([0x01]);
const SEP = Buffer.from([0x1f]); // unit separator between salt/label/value

const sha256 = (...parts: Buffer[]) => createHash("sha256").update(Buffer.concat(parts)).digest();

/** Hash one labelled, salted field into a leaf. `value` may be text or raw bytes. */
export function leafHash(salt: Buffer, label: string, value: string | Buffer): Buffer {
  const valueBuf = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf-8");
  return sha256(LEAF, salt, SEP, Buffer.from(label, "utf-8"), SEP, valueBuf);
}

const nodeHash = (l: Buffer, r: Buffer) => sha256(NODE, l, r);

/** Build the parent levels of the tree from the leaf hashes (odd node duplicated). */
function levels(leaves: Buffer[]): Buffer[][] {
  if (leaves.length === 0) throw new Error("merkle tree needs at least one leaf");
  const all: Buffer[][] = [leaves];
  let cur = leaves;
  while (cur.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < cur.length; i += 2) {
      const l = cur[i];
      const r = i + 1 < cur.length ? cur[i + 1] : cur[i]; // duplicate last if odd
      next.push(nodeHash(l, r));
    }
    all.push(next);
    cur = next;
  }
  return all;
}

export function merkleRoot(leaves: Buffer[]): string {
  const lvls = levels(leaves);
  return lvls[lvls.length - 1][0].toString("hex");
}

export type ProofStep = { hash: string; right: boolean }; // sibling hash + whether it's the right node

/** Inclusion proof for the leaf at `index`: the sibling hashes from leaf to root. */
export function merkleProof(leaves: Buffer[], index: number): ProofStep[] {
  const lvls = levels(leaves);
  const proof: ProofStep[] = [];
  let idx = index;
  for (let l = 0; l < lvls.length - 1; l++) {
    const level = lvls[l];
    const isRight = idx % 2 === 1;
    const sibIdx = isRight ? idx - 1 : idx + 1;
    const sibling = sibIdx < level.length ? level[sibIdx] : level[idx]; // duplicated last
    proof.push({ hash: sibling.toString("hex"), right: !isRight });
    idx = Math.floor(idx / 2);
  }
  return proof;
}

/** Verify a revealed leaf against a published root using its proof. */
export function verifyProof(leaf: Buffer, proof: ProofStep[], rootHex: string): boolean {
  let acc = leaf;
  for (const step of proof) {
    const sib = Buffer.from(step.hash, "hex");
    acc = step.right ? nodeHash(acc, sib) : nodeHash(sib, acc);
  }
  return acc.toString("hex") === rootHex;
}
