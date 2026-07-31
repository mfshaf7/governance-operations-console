import type { OperationWorkbenchDomainContract } from "../../../../operation-workbench/operation-workbench-contract.ts";

export function getModelOperationsOperationWorkbenchContract(): OperationWorkbenchDomainContract {
  return {
    backendOwner:
      "Platform Engineering profile registry and governed AI access plane",
    domain: "model-operations",
    handoff:
      "Expose profile policy, caller eligibility, access-plane readiness, runtime gates, security acceptance, and audit evidence without claiming unavailable mutation capability.",
    localState:
      "Model Operations selection, register filters, dashboard state, and inspector state only.",
    mutationBoundary: "read-only prototype / future OOS-mediated request path",
    surfacePurpose:
      "Inspect governed model-profile availability and the controls that determine whether a caller may use a profile.",
    readModel: "Contract-backed normalized Model Operations read model",
    sourceOfTruth:
      "Platform Engineering model-profile and access-plane contracts, Workspace Governance consumer contracts, and Security Architecture reviews",
  };
}
