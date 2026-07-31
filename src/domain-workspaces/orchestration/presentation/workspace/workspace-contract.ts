import type { OperationWorkbenchDomainContract } from "../../../../operation-workbench/operation-workbench-contract.ts";

export function getOrchestrationOperationWorkbenchContract(): OperationWorkbenchDomainContract {
  return {
    backendOwner:
      "Operator Orchestration Service after definition, runtime, platform, and security admission",
    domain: "orchestration",
    handoff:
      "Qualify durable execution needs, prepare implementation-ready definitions, inspect aggregate runs, and submit only OOS-projected bounded controls; source domains retain business intent and corrected-input submission.",
    localState:
      "Contract-derived definition records, synthetic definition and run scenarios, definition draft continuity, prototype-local receipts, and run-control scenario overlays.",
    mutationBoundary:
      "prototype-local definition drafts and simulations / OOS-mediated definition requests and run controls after admission",
    surfacePurpose:
      "Qualify durable orchestration, inspect immutable definition versions, inspect aggregate run truth, and request bounded control actions without owning executable workflow source or runtime authority.",
    readModel:
      "Structured Orchestration definition, admission, run, node, wait, blocker, failure, event, receipt, and workspace-status projections",
    sourceOfTruth:
      "OOS catalog and aggregate projections after admission; executable source in implementation owner repos; contract-derived and synthetic fixtures before baseline",
  };
}
