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
      "Take work from intake through work design, refinement, PI planning, and execution. Manage shared Delivery settings in Catalog.",
    readModel: "Fixture-backed normalized Delivery read model",
    sourceOfTruth:
      "Workspace Delivery ART through OpenProject, OOS, and WGCF read models",
  };
}
