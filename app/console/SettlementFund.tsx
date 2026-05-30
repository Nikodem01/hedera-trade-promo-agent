"use client";
// Settlement & Fund — the financial workspace: the on-chain accrual fund drawing down on
// mutually-consented settlements, the operator's confidential portfolio (decisions, value,
// deductions caught), and dispute / chargeback. Settlement itself happens in Adjudication
// (two on-chain signatures); this is the fund + outcomes + the dispute lifecycle.
import { AccrualFund } from "./AccrualFund";
import { PortfolioPrivate } from "./PortfolioPrivate";
import { Dispute } from "./Dispute";
import { Ap2Mandate } from "./Ap2Mandate";
import { WorkspaceIntro } from "./workspace-ui";

export function SettlementFund({ refreshKey, canAct }: { refreshKey?: number; canAct?: boolean }) {
  return (
    <div className="pb-8 flex flex-col gap-2">
      <WorkspaceIntro
        title="Settlement & Fund"
        body="Trade spend is accrued up front and drawn down only on validated, mutually-consented proof. Unspent accrual auto-refunds to the brand. Disputes resurface as tamper-proof, linked on-chain records — defensible years later."
      />
      <AccrualFund refreshKey={refreshKey} canAct={canAct} />
      <PortfolioPrivate refreshKey={refreshKey} />
      <Dispute canAct={canAct} />
      <Ap2Mandate canAct={canAct} />
    </div>
  );
}
