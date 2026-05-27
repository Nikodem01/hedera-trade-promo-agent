import { Client, PrivateKey } from "@hiero-ledger/sdk";

/**
 * Builds a Hedera testnet operator client from environment credentials.
 *
 * The operator is the brand's treasury account: it pays for and signs every
 * transaction the agent executes. ECDSA per the account created at
 * portal.hedera.com. Server-side only — never import this into client code.
 */
export function getOperatorClient(): Client {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;

  if (!accountId || !privateKey) {
    throw new Error(
      "HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in .env.local",
    );
  }

  return Client.forTestnet().setOperator(
    accountId,
    PrivateKey.fromStringECDSA(privateKey),
  );
}
