const BASE = "https://hashscan.io/testnet";

/**
 * Deep link to a transaction. The SDK renders tx ids as
 * `0.0.123@1700000000.000000000`; HashScan's canonical path form is
 * `0.0.123-1700000000-000000000`.
 */
export const txUrl = (transactionId: string) =>
  `${BASE}/transaction/${transactionId
    .replace("@", "-")
    .replace(/-(\d+)\.(\d+)$/, "-$1-$2")}`;

export const topicUrl = (topicId: string) => `${BASE}/topic/${topicId}`;

export const tokenUrl = (tokenId: string) => `${BASE}/token/${tokenId}`;
