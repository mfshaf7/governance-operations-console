import type { OperationWorkbenchDomainId } from "./operation-workbench-domain-registry";

export type OperationWorkbenchDomainContract = {
  backendOwner: string;
  domain: OperationWorkbenchDomainId;
  handoff: string;
  localState: string;
  mutationBoundary: string;
  surfacePurpose: string;
  readModel: string;
  sourceOfTruth: string;
};

export function getOperationWorkbenchSurfaceAttributes(
  contract: OperationWorkbenchDomainContract,
) {
  return {
    "data-operation-workbench": true,
    "data-operation-workbench-backend-owner": contract.backendOwner,
    "data-operation-workbench-domain": contract.domain,
    "data-operation-workbench-handoff": contract.handoff,
    "data-operation-workbench-local-state": contract.localState,
    "data-operation-workbench-mutation-boundary": contract.mutationBoundary,
    "data-operation-workbench-read-model": contract.readModel,
    "data-operation-workbench-source-of-truth": contract.sourceOfTruth,
    "data-operation-workbench-surface-purpose": contract.surfacePurpose,
  } as const;
}
