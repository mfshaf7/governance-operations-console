import type { OperationWorkbenchDomainContract } from "../../../../operation-workbench/operation-workbench-contract.ts";

export function getModelOperationsOperationWorkbenchContract(): OperationWorkbenchDomainContract {
  return {
    backendOwner:
      "Platform Engineering model configuration, profile registry and governed AI access plane",
    domain: "model-operations",
    handoff:
      "Submit verified operator intent through OOS for admitted model registration and workflow routing; retain owner progress, receipts, profile policy and caller eligibility.",
    localState:
      "Ephemeral settings drafts, selection, filters and non-authoritative request references; owner state is reread on recovery.",
    mutationBoundary: "OOS-coordinated operator requests; Platform owns configuration, verification and provider credentials.",
    surfacePurpose:
      "Configure system and per-workflow model, native effort and explicit fallback; inspect purpose-profile availability and owner evidence.",
    readModel: "Live revisioned configuration and caller-owned operation projections plus purpose-profile projections",
    sourceOfTruth:
      "Platform Engineering model-profile and access-plane contracts, Workspace Governance consumer contracts, and Security Architecture reviews",
  };
}
