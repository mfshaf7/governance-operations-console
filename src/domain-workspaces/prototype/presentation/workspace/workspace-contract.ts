import type { OperationWorkbenchDomainContract } from "../../../../operation-workbench/operation-workbench-contract.ts";
import { getPrototypeWorkspaceReadModel } from "../../read-model/prototype-workspace-read-model.ts";

export function getPrototypeOperationWorkbenchContract(): OperationWorkbenchDomainContract {
  const readModel = getPrototypeWorkspaceReadModel();

  return {
    backendOwner: "Workspace Prototype Studio until graduation",
    domain: "prototype",
    handoff:
      "Prepare versioned prototype transition intent; validators and target domains own admission, while named authorities own any permitted waiver decision.",
    localState:
      "Prototype-local filters, selected record, preview runtime modals, and profile draft state.",
    mutationBoundary: "prototype-local",
    surfacePurpose:
      "Review prototype posture, prepare local preview proof, and package movement evidence.",
    readModel: readModel.source.registry,
    sourceOfTruth: `${readModel.source.project} / ${readModel.source.recordSystem}`,
  };
}
