"use client";
// Trust Center — the fintech trust-center + permission-dashboard pattern: the public
// commitment ledger, a provable access & oversight trail (who touched what, when), and
// an operator natural-language audit. Confidential to everyone, verifiable by anyone.
import { AuditLedger } from "./AuditLedger";
import { AccessLog } from "./AccessLog";
import { AskPanel } from "./AskPanel";
import { WorkspaceIntro, OperatorOnly } from "./workspace-ui";

export function TrustCenter({ refreshKey, canAct }: { refreshKey?: number; canAct?: boolean }) {
  return (
    <div className="pb-8 flex flex-col gap-2">
      <WorkspaceIntro
        title="Trust Center"
        body="The public commitment ledger holds only salted proofs — zero business data — yet any decision is verifiable against it. Every disclosure, override, and dispute is itself anchored as a tamper-proof event. (Verify a specific decision against the chain from its verdict card in Adjudication.)"
      />
      <AuditLedger refreshKey={refreshKey} />
      <AccessLog refreshKey={refreshKey} />
      {canAct ? <AskPanel /> : <OperatorOnly feature="Natural-language audit query" />}
    </div>
  );
}
