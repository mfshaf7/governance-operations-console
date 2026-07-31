import { createLocalOperationProjectionStore } from "../../operation-runtime/local-operation-projection-store.ts";

import type { ProposalWorkspaceScenario } from "../read-model/proposal-workspace-read-model.ts";
import {
  proposalRuntimeSource,
  type ProposalWorkflowLocalReceipt,
} from "./proposal-runtime-model.ts";

type ProposalRuntimeProjectionState = {
  capturedProposals: ProposalWorkspaceScenario[];
  workflowReceipts: Record<string, ProposalWorkflowLocalReceipt[]>;
};

export type ProposalRuntimeProjectionSnapshot = ProposalRuntimeProjectionState;

const proposalRuntimeProjectionStore = createLocalOperationProjectionStore<
  ProposalRuntimeProjectionState,
  ProposalRuntimeProjectionSnapshot
>({
  initialState: {
    capturedProposals: [],
    workflowReceipts: {},
  },
  projectSnapshot: (state) => state,
  runtimeSource: proposalRuntimeSource,
});

export function subscribeProposalRuntimeProjection(listener: () => void) {
  return proposalRuntimeProjectionStore.subscribe(listener);
}

export function getProposalRuntimeProjectionSnapshot() {
  return proposalRuntimeProjectionStore.getSnapshot();
}

export function getProposalLocalCaptureRecordCount() {
  return proposalRuntimeProjectionStore.getState().capturedProposals.length;
}

export function recordProposalLocalCaptureRecord(
  capturedProposal: ProposalWorkspaceScenario,
) {
  proposalRuntimeProjectionStore.updateState((currentState) => {
    const currentRecord = currentState.capturedProposals.find(
      (proposal) => proposal.id === capturedProposal.id,
    );

    if (currentRecord) {
      return currentState;
    }

    return {
      ...currentState,
      capturedProposals: [capturedProposal, ...currentState.capturedProposals],
    };
  });
}

export function recordProposalWorkflowReceipt(
  receipt: ProposalWorkflowLocalReceipt,
) {
  proposalRuntimeProjectionStore.updateState((currentState) => {
    const currentReceipts =
      currentState.workflowReceipts[receipt.proposalId] ?? [];

    if (
      currentReceipts.some(
        (currentReceipt) => currentReceipt.receiptId === receipt.receiptId,
      )
    ) {
      return currentState;
    }

    return {
      ...currentState,
      workflowReceipts: {
        ...currentState.workflowReceipts,
        [receipt.proposalId]: [...currentReceipts, receipt],
      },
    };
  });
}
