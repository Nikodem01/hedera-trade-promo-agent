import { describe, it, expect } from "vitest";
import { buildDossier, discloseFields, verifyDisclosure, commitmentRecord, type DossierInput } from "../lib/dossier";
import { leafHash } from "../lib/merkle";

const baseInput = (): DossierInput => ({
  contract_text: "§1.1 Display must run May 1–31. §2.1 Four facings minimum.",
  narrative: "Freestanding tower, all of May.",
  imageBytes: Buffer.from("fake-image-bytes-oreo"),
  system_prompt: "You are the adjudication core...",
  model: "gemini-3.1-flash-lite-preview",
  thinking_settings: JSON.stringify({ google: { thinkingConfig: { thinkingLevel: "high" } } }),
  assessment: {
    decision: "approve",
    confidence: 0.97,
    recommended_credit_pct: 100,
    max_settlement_hbar: 30,
    reasoning_summary: "All material requirements met.",
    criteria: [
      { clause_ref: "§1.1", requirement: "Display window", status: "met", observed_in_photo: "tower present", concern: "" },
      { clause_ref: "§2.1", requirement: "Four facings", status: "met", observed_in_photo: "6 facings", concern: "" },
    ],
  },
  retailer: "Walmart #2643",
  promotion: "Q2 OREO Floor Display",
  adjudicated_at: "2026-05-29T14:32:00.000Z",
});

describe("dossier commitment + selective disclosure", () => {
  it("discloses every field and proves all against the commitment", () => {
    const d = buildDossier(baseInput());
    const disc = discloseFields(d, d.fields.map((f) => f.label));
    const results = verifyDisclosure(disc);
    expect(results.length).toBe(d.fields.length);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(disc.commitment).toBe(d.commitment);
  });

  it("discloses a single field and proves it without revealing siblings", () => {
    const d = buildDossier(baseInput());
    const disc = discloseFields(d, ["decision"]);
    expect(disc.revealed.length).toBe(1);
    expect(disc.revealed[0].label).toBe("decision");
    expect(disc.revealed[0].value).toBe("approve");
    expect(verifyDisclosure(disc).every((r) => r.ok)).toBe(true);
    // nothing else leaks
    expect(JSON.stringify(disc)).not.toContain("Walmart");
    expect(JSON.stringify(disc)).not.toContain("facings");
  });

  it("fails verification when a revealed value is tampered", () => {
    const d = buildDossier(baseInput());
    const disc = discloseFields(d, ["decision", "max_settlement_hbar"]);
    const tampered = { ...disc, revealed: disc.revealed.map((r) => (r.label === "decision" ? { ...r, value: "reject" } : r)) };
    const results = verifyDisclosure(tampered);
    expect(results.find((r) => r.label === "decision")!.ok).toBe(false);
  });

  it("anchors a PROOF-ONLY record — no business data on-chain", () => {
    const input = baseInput();
    const d = buildDossier(input);
    const rec = commitmentRecord(d);
    const parsed = JSON.parse(rec);
    expect(Object.keys(parsed).sort()).toEqual(["commitment", "image_fp", "kind", "schema", "ts"]);
    // none of the confidential material appears in the anchored record
    // (numeric/hex-collidable values omitted; these all contain non-hex letters)
    for (const secret of [input.contract_text, input.narrative, input.assessment.reasoning_summary, "Walmart", "approve", "facings"]) {
      expect(rec).not.toContain(secret);
    }
  });

  it("same photo → same image fingerprint (reuse detectable); different photo → different", () => {
    const a = buildDossier(baseInput());
    const b = buildDossier({ ...baseInput(), contract_text: "totally different contract" });
    const c = buildDossier({ ...baseInput(), imageBytes: Buffer.from("a-different-photo") });
    expect(a.image_fp).toBe(b.image_fp); // same photo bytes, different claim
    expect(a.commitment).not.toBe(b.commitment); // different claim → different commitment
    expect(a.image_fp).not.toBe(c.image_fp); // different photo
  });

  it("canonicalizes text line endings before byte folding", () => {
    const salt = Buffer.from("00112233445566778899aabbccddeeff", "hex");
    expect(leafHash(salt, "reasoning_summary", "line one\r\nline two").toString("hex")).toBe(
      leafHash(salt, "reasoning_summary", "line one\nline two").toString("hex"),
    );
  });
});
