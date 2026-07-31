import type { ConsoleBoundary } from "../console-architecture";
import { operationWorkbenchDomainIds } from "./operation-workbench-domain-registry";

export { OperationWorkbench } from "./operation-workbench";
export { OperationWorkbenchHost } from "./operation-workbench-host";
export { OperationWorkbenchSelector } from "./operation-workbench-selector";
export {
  getOperationWorkbenchSurfaceAttributes,
} from "./operation-workbench-contract";
export type {
  OperationWorkbenchDomainContract,
} from "./operation-workbench-contract";
export {
  getOperationWorkbenchDomainId,
  operationWorkbenchDomainIds,
  operationWorkbenchDomainRegistry,
  operationWorkbenchPathLabels,
} from "./operation-workbench-domain-registry";
export type {
  OperationWorkbenchDomainEntry,
  OperationWorkbenchDomainId,
  OperationWorkbenchPathLabel,
} from "./operation-workbench-domain-registry";
export {
  operationWorkbenchSelectorEntries,
} from "./operation-workbench-selector-model";
export type {
  OperationWorkbenchSelectorEntry,
} from "./operation-workbench-selector-model";
export type { OperationWorkbenchProps } from "./operation-workbench";

export const operationWorkbenchBoundary: ConsoleBoundary = {
  id: "operation-workbench",
  mustNotOwn: [
    "domain read models",
    "domain selectors",
    "domain workflow state",
    "domain action eligibility",
    "domain modals",
    "domain evidence history",
  ],
  owns: [
    "domain selector",
    "workspace frame",
    "domain handoff context",
  ],
  status: "active-contract",
};

export const operationWorkbenchDomains = operationWorkbenchDomainIds;
