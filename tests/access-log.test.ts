import { describe, it, expect } from "vitest";
import { buildAccessDossier, accessRecord } from "../lib/access-log";

// The access-log confidentiality contract: the off-chain dossier captures the full
// who/what/when, while the on-chain proof-only record carries NONE of it — only the
// commitment, a link to the decision, and a timestamp.
describe("access-log", () => {
  const ev = {
    action: "disclose" as const,
    target_commitment: "a".repeat(64),
    actor_role: "auditor",
    scope: "counterparty",
    labels: ["decision", "max_settlement_hbar"],
  };
  const ts = "2026-05-30T12:00:00.000Z";

  it("seals the access detail into a salted Merkle commitment (off-chain)", () => {
    const d = buildAccessDossier(ev, ts);
    expect(d.commitment).toMatch(/^[0-9a-f]{64}$/);
    const labels = d.fields.map((f) => f.label);
    expect(labels).toContain("actor_role");
    expect(labels).toContain("labels");
    // every field is independently salted
    expect(new Set(d.fields.map((f) => f.salt)).size).toBe(d.fields.length);
  });

  it("anchors a PROOF-ONLY record with no business data on-chain", () => {
    const d = buildAccessDossier(ev, ts);
    const rec = accessRecord(d.commitment, ev.target_commitment, ts);
    const parsed = JSON.parse(rec);
    expect(parsed).toEqual({ schema: "PromoProof/v2", kind: "access-log", commitment: d.commitment, links_to: ev.target_commitment, ts });
    // none of the sensitive detail leaks into the on-chain payload
    expect(rec).not.toContain("auditor");
    expect(rec).not.toContain("counterparty");
    expect(rec).not.toContain("max_settlement_hbar");
  });
});
