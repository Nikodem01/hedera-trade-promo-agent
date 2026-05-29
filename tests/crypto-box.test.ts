import { describe, it, expect } from "vitest";
import { deriveKey, seal, open } from "../lib/crypto-box";

// At-rest encryption for the confidential dossier store. The contract: a sealed payload
// round-trips under the right key, fails closed if tampered, and a plaintext (legacy)
// payload passes through untouched.
describe("crypto-box (AES-256-GCM dossier encryption)", () => {
  const key = deriveKey("test-secret-key");
  const dossier = JSON.stringify({ commitment: "a".repeat(64), fields: [{ label: "decision", value: "approve", salt: "ff" }] });

  it("round-trips a sealed payload under the same key", () => {
    const sealed = seal(key, dossier);
    expect(sealed).not.toContain("approve"); // ciphertext does not leak plaintext
    expect(open(key, sealed)).toBe(dossier);
  });

  it("derives the same key deterministically from the same secret", () => {
    expect(deriveKey("test-secret-key").equals(key)).toBe(true);
  });

  it("fails closed when the ciphertext is tampered (GCM auth tag)", () => {
    const env = JSON.parse(seal(key, dossier));
    env.ct = env.ct.slice(0, -2) + (env.ct.endsWith("00") ? "11" : "00"); // flip last byte
    expect(() => open(key, JSON.stringify(env))).toThrow();
  });

  it("fails closed under the wrong key", () => {
    const sealed = seal(key, dossier);
    expect(() => open(deriveKey("other-secret"), sealed)).toThrow();
  });

  it("passes legacy plaintext through untouched (no key needed)", () => {
    expect(open(null, dossier)).toBe(dossier);
    expect(open(key, dossier)).toBe(dossier);
  });

  it("requires a key to open an encrypted envelope", () => {
    const sealed = seal(key, dossier);
    expect(() => open(null, sealed)).toThrow(/DOSSIER_ENC_KEY/);
  });
});
