import type {
  ProposalDecisionDraft,
  ProposalRouteSelectionDraft,
} from "../work-model/proposal-disposition-model.ts";
import type { ProposalHandoffDraft } from "../work-model/proposal-handoff-model.ts";
import type { ProposalTriageDraft } from "../work-model/proposal-triage-model.ts";
import type { ProposalWorkflowCommandStep } from "../work-model/proposal-workflow-command-model.ts";
import type { ProposalWorkspaceScenario } from "../read-model/proposal-workspace-read-model.ts";
import type { ProposalWorkflowLocalReceipt } from "./proposal-runtime-model.ts";

export type ProposalWorkflowReceiptDraftProjection = {
  decisionDrafts: Record<string, ProposalDecisionDraft>;
  handoffDrafts: Record<string, ProposalHandoffDraft>;
  routeSelectionDrafts: Record<string, ProposalRouteSelectionDraft>;
  triageDrafts: Record<string, ProposalTriageDraft>;
};

export function proposalWorkflowDraftsFromReceipts({
  decisionDrafts,
  handoffDrafts,
  receiptsByProposal,
  routeSelectionDrafts,
  triageDrafts,
}: ProposalWorkflowReceiptDraftProjection & {
  receiptsByProposal: Record<string, ProposalWorkflowLocalReceipt[]>;
}): ProposalWorkflowReceiptDraftProjection {
  const projection: ProposalWorkflowReceiptDraftProjection = {
    decisionDrafts: { ...decisionDrafts },
    handoffDrafts: { ...handoffDrafts },
    routeSelectionDrafts: { ...routeSelectionDrafts },
    triageDrafts: { ...triageDrafts },
  };

  for (const receipts of Object.values(receiptsByProposal)) {
    for (const receipt of proposalWorkflowReceiptsOldestFirst(receipts)) {
      projectProposalWorkflowReceipt(projection, receipt);
    }
  }

  return projection;
}

export function latestProposalWorkflowReceipt(
  receipts: ProposalWorkflowLocalReceipt[],
  step: ProposalWorkflowCommandStep,
) {
  const chronologicalReceipts = proposalWorkflowReceiptsOldestFirst(receipts);

  for (let index = chronologicalReceipts.length - 1; index >= 0; index -= 1) {
    const receipt = chronologicalReceipts[index];
    if (receipt?.step === step) {
      return receipt;
    }
  }

  return null;
}

export function proposalWorkflowReceiptsForSource(
  proposal: ProposalWorkspaceScenario,
  receipts: ProposalWorkflowLocalReceipt[],
) {
  return proposalWorkflowReceiptsOldestFirst(receipts).filter(
    (receipt) =>
      receipt.proposalId === proposal.id &&
      receipt.sourceBackendRecordId === proposal.backendRecordId &&
      receipt.sourceRecordVersion === proposal.recordVersion,
  );
}

export function proposalWorkflowReceiptsOldestFirst(
  receipts: ProposalWorkflowLocalReceipt[],
) {
  return [...receipts].sort(
    (left, right) =>
      left.recordedAt.localeCompare(right.recordedAt) ||
      left.receiptId.localeCompare(right.receiptId),
  );
}

function projectProposalWorkflowReceipt(
  projection: ProposalWorkflowReceiptDraftProjection,
  receipt: ProposalWorkflowLocalReceipt,
) {
  const sourceStamp = {
    appliedAt: receipt.recordedAt,
    appliedReceiptId: receipt.receiptId,
    savedAt: receipt.recordedAt,
    sourceBackendRecordId: receipt.sourceBackendRecordId,
    sourceProjectionState: receipt.sourceProjectionState,
    sourceRecordVersion: receipt.sourceRecordVersion,
  };

  switch (receipt.payload.step) {
    case "triage":
      projection.triageDrafts[receipt.proposalId] = {
        ...sourceStamp,
        advisorDraft: receipt.payload.advisorDraft,
        advisorPrompt: receipt.payload.advisorPrompt,
        proposalId: receipt.proposalId,
        summary: receipt.payload.summary,
      };
      return;
    case "disposition":
      projection.decisionDrafts[receipt.proposalId] = {
        ...sourceStamp,
        advisorDraft: receipt.payload.decision.advisorDraft,
        advisorPrompt: receipt.payload.decision.advisorPrompt,
        notes: receipt.payload.decision.notes,
        outcome: receipt.payload.decision.outcome,
        proposalId: receipt.proposalId,
      };

      if (receipt.payload.route) {
        projection.routeSelectionDrafts[receipt.proposalId] = {
          ...sourceStamp,
          proposalId: receipt.proposalId,
          ...receipt.payload.route,
        };
      } else {
        delete projection.routeSelectionDrafts[receipt.proposalId];
      }
      return;
    case "handoff":
      projection.handoffDrafts[receipt.proposalId] = {
        ...sourceStamp,
        notes: receipt.payload.notes,
        proposalId: receipt.proposalId,
        result: receipt.payload.result,
      };
  }
}
