import type { OperationWorkbenchDomainContract } from "../../../../operation-workbench/operation-workbench-contract.ts";

export function getRepositoryOperationWorkbenchContract(): OperationWorkbenchDomainContract {
  return {
    backendOwner: "Workspace repository registry through OOS after baseline",
    domain: "repository",
    handoff:
      "Prepare repository admission, custody, and ownership evidence for the source or target workflow that requested it.",
    localState:
      "Repository-local selected record, registry filters, detail modal, admission draft, and prototype receipts.",
    mutationBoundary: "prototype-local / future OOS-mediated",
    surfacePurpose:
      "Inspect repository inventory, ownership posture, admission state, and retirement readiness.",
    readModel: "Fixture-backed normalized Repository read model",
    sourceOfTruth:
      "Workspace repository registry and governance repository contracts",
  };
}
