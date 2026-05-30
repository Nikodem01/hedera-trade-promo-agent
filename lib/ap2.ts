// AP2 (Agent Payments Protocol) alignment — https://ap2-protocol.org/specification/
//
// AP2's thesis is a cryptographically-verifiable MANDATE (a W3C Verifiable Credential)
// proving WHO authorized an agent's payment, so the payment is accountable and
// non-repudiable; the CartMandate is explicitly shared as dispute evidence. That is
// exactly PromoProof's settlement model. We express each settlement as an AP2-aligned
// CartMandate + PaymentMandate — but the authorization is enforced by HEDERA CONSENSUS
// (the brand approver AND the retailer both sign the scheduled transfer on-chain), not
// merely asserted, which is a STRONGER guarantee than a claimed mandate signature.
//
// Scope (honest): we adopt AP2's mandate/authorization vocabulary, not its full A2A
// shopping/negotiation stack — that's out of scope for a B2B trade-promotion settlement.

export type PaymentMandateInput = {
  commitment: string;
  decision: string;
  amount: number; // settled pUSDC amount (deterministic, hard-capped)
  network: string; // e.g. "testnet"
  payerAccount?: string; // brand treasury
  payeeAccount?: string; // retailer
  scheduleId?: string; // the on-chain scheduled-transfer id, if proposed/executed
  topicId?: string; // HCS audit topic
  createdAt: string;
};

const did = (net: string, acct?: string) => `did:hedera:${net}:${acct ?? "0.0.0"}`;

/** Build the AP2-aligned mandate (CartMandate contents inside a PaymentMandate envelope)
 * as an UNSIGNED Verifiable Credential. The route adds the issuer's cryptographic proof.
 * Pure + dependency-free so the structure is unit-testable. */
export function buildPaymentMandate(i: PaymentMandateInput) {
  const amount = { currencyCode: "pUSDC", value: i.amount }; // AP2 PaymentCurrencyAmount
  const cart_mandate = {
    type: "CartMandate",
    contents: {
      id: i.commitment,
      payment_request: {
        payer: did(i.network, i.payerAccount),
        payee: did(i.network, i.payeeAccount),
        amount,
        // The "cart" here is the adjudicated proof-of-performance, not retail goods.
        basis: {
          type: "TradePromotionProofOfPerformance",
          commitment: i.commitment,
          decision: i.decision,
          audit_topic: i.topicId,
        },
      },
    },
    // In AP2 the CartMandate is shared as dispute evidence; here the commitment IS the
    // on-chain, tamper-proof evidence anchor (selectively disclosable; see /api/dispute).
  };
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2", "https://ap2-protocol.org/context/v1"],
    type: ["VerifiableCredential", "PaymentMandate"],
    issuer: did(i.network, i.payerAccount),
    issuanceDate: i.createdAt,
    credentialSubject: {
      cart_mandate,
      payment_details: {
        method: "hedera-hts-scheduled-transfer",
        amount,
        cart_commitment: i.commitment,
        schedule_id: i.scheduleId,
      },
      transaction_context: {
        agent_involved: true,
        agent_id: "PromoProof/tpp-evaluator",
        human_present: true,
        authorization_model:
          "mutual-consent: the brand approver AND the retailer each sign the scheduled pUSDC transfer on-chain (Hedera Scheduled Transaction, receiver-signature-required); the agent holds no fund-moving key",
      },
    },
  };
}
