import type { ProposalWorkspaceScenario } from "../domain/proposal-types.ts";

export type ProposalWorkflowSourceSnapshot = Pick<
  ProposalWorkspaceScenario,
  "backendRecordId" | "projectionState" | "recordVersion"
>;

export type ProposalWorkflowSourceStampedDraft = {
  appliedAt?: string;
  appliedReceiptId?: string;
  savedAt?: string;
  sourceBackendRecordId?: string;
  sourceProjectionState?: ProposalWorkspaceScenario["projectionState"];
  sourceRecordVersion?: string;
};

export function proposalWorkflowSourceSnapshot(
  source: ProposalWorkflowSourceSnapshot,
) {
  return {
    sourceBackendRecordId: source.backendRecordId,
    sourceProjectionState: source.projectionState,
    sourceRecordVersion: source.recordVersion,
  };
}

export function proposalWorkflowSourceReviewRequired(
  proposal: ProposalWorkspaceScenario,
  drafts: Array<ProposalWorkflowSourceStampedDraft | null | undefined>,
) {
  if (proposalWorkflowSourceUnavailable(proposal)) {
    return true;
  }

  return drafts.some((draft) =>
    proposalWorkflowDraftSourceChanged(proposal, draft),
  );
}

export function proposalWorkflowSourceUnavailable(
  proposal: ProposalWorkspaceScenario,
) {
  return (
    proposal.status === "waiting-on-source" ||
    proposal.projectionState === "error" ||
    proposal.projectionState === "offline" ||
    proposal.projectionState === "stale"
  );
}

function proposalWorkflowDraftSourceChanged(
  proposal: ProposalWorkspaceScenario,
  draft: ProposalWorkflowSourceStampedDraft | null | undefined,
) {
  if (!draft?.savedAt && !draft?.appliedAt) {
    return false;
  }

  if (!draft.sourceBackendRecordId || !draft.sourceRecordVersion) {
    return true;
  }

  return (
    draft.sourceBackendRecordId !== proposal.backendRecordId ||
    draft.sourceRecordVersion !== proposal.recordVersion
  );
}
