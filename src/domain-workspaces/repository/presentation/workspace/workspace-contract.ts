import type { OperationWorkbenchDomainContract } from "../../../../operation-workbench/operation-workbench-contract.ts";

export function getRepositoryOperationWorkbenchContract(): OperationWorkbenchDomainContract {
  return {
    backendOwner: "Workspace repository registry through OOS after baseline",
    domain: "repository",
    handoff:
      "Prepare repository admission, custody, and ownership evidence for the source or target workflow that requested it.",
    localState:
      "Repository-local selected record, registry filters, detail modal, admission draft, and retained setup receipts.",
    mutationBoundary: "local admission drafts / OOS-mediated lifecycle actions",
    surfacePurpose:
      "Inspect repository inventory, ownership posture, admission state, and governed lifecycle readiness.",
    readModel: "Fixture-backed normalized Repository read model",
    sourceOfTruth:
      "Workspace repository registry, OOS lifecycle audit, and governance repository contracts",
  };
}
