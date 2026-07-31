import type { OperationWorkbenchDomainContract } from "../../../../operation-workbench/operation-workbench-contract.ts";

export function getProposalOperationWorkbenchContract(): OperationWorkbenchDomainContract {
  return {
    backendOwner: "Workspace Proposals through OOS after baseline",
    domain: "proposal",
    handoff:
      "Prepare proposal route intent for Delivery or Prototype; target domains own admission, and any permitted waiver remains with the named control authority.",
    localState:
      "Proposal-local draft, triage, queue filters, modal state, and prototype route decisions.",
    mutationBoundary: "prototype-local / OOS-mediated when admitted",
    surfacePurpose:
      "Capture, triage, inspect, and route workspace proposal ideas before Delivery work or Prototype exploration.",
    readModel: "Fixture-backed normalized Proposal read model",
    sourceOfTruth:
      "Workspace Proposals through OOS and proposal intake adapters",
  };
}
