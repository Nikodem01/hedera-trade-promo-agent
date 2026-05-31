import { describe, it, expect } from "vitest";
import { buildPaymentMandate } from "../lib/ap2";

// The AP2 mandate must be a faithful CartMandate + PaymentMandate VC bound to our
// commitment and settlement — the verifiable, non-repudiable payment authorization.
describe("AP2 payment mandate", () => {
  const m = buildPaymentMandate({
    commitment: "a".repeat(64),
    decision: "approve",
    amount: 30,
    network: "testnet",
    payerAccount: "0.0.1111",
    payeeAccount: "0.0.2222",
    scheduleId: "0.0.3333",
    topicId: "0.0.9104996",
    createdAt: "2026-05-30T12:00:00.000Z",
  });

  it("is a Verifiable Credential of type PaymentMandate in the AP2 context", () => {
    expect(m["@context"]).toContain("https://ap2-protocol.org/context/v1");
    expect(m.type).toEqual(["VerifiableCredential", "PaymentMandate"]);
  });

  it("carries a CartMandate with payer/payee DIDs, a PaymentCurrencyAmount, and the commitment basis", () => {
    const pr = m.credentialSubject.cart_mandate.contents.payment_request;
    expect(m.credentialSubject.cart_mandate.type).toBe("CartMandate");
    expect(pr.payer).toBe("did:hedera:testnet:0.0.1111");
    expect(pr.payee).toBe("did:hedera:testnet:0.0.2222");
    expect(pr.amount).toEqual({ currencyCode: "pUSDC", value: 30 });
    expect(pr.basis.commitment).toBe("a".repeat(64));
    expect(pr.basis.decision).toBe("approve");
  });

  it("records the mutual-consent authorization model + the schedule id", () => {
    const ctx = m.credentialSubject.transaction_context;
    expect(ctx.agent_involved).toBe(true);
    expect(ctx.authorization_model).toMatch(/mutual-consent/i);
    expect(ctx.authorization_model).toMatch(/no fund-moving key/i);
    expect(m.credentialSubject.payment_details.schedule_id).toBe("0.0.3333");
  });
});
