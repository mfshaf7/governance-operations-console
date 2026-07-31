import type { OperationWorkbenchDomainContract } from "../../../../operation-workbench/operation-workbench-contract.ts";

export function getDeliveryOperationWorkbenchContract(): OperationWorkbenchDomainContract {
  return {
    backendOwner: "Workspace Delivery ART through OOS/WGCF after baseline",
    domain: "delivery",
    handoff:
      "Prepare Delivery-owned records and source intent; route-specific validators, targets, and named decision authorities retain their own boundaries.",
    localState:
      "Delivery-local selected package, workflow modal, filters, local receipts, and prototype session state.",
    mutationBoundary: "prototype-local / future OOS-mediated",
    surfacePurpose:
      "Manage Delivery intake, work design, refinement, execution board, blocker handling, parking, and closeout preparation.",
    readModel: "Fixture-backed normalized Delivery read model",
    sourceOfTruth:
      "Workspace Delivery ART through OpenProject, OOS, and WGCF read models",
  };
}
