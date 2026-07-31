import {
  getProposalRuntimeProjectionSnapshot,
  submitProposalWorkflowApplyCommand,
} from "../proposal/local-runtime/proposal-runtime.ts";
import { latestProposalWorkflowReceipt } from "../proposal/local-runtime/proposal-workflow-receipt-projection.ts";
import {
  proposalRouteSelectionComplete,
  proposalRouteSelectionDraftFromProposal,
  type ProposalRouteSelectionDraft,
} from "../proposal/work-model/proposal-disposition-model.ts";
import {
  proposalHandoffResultForProposal,
  type ProposalHandoffDraft,
} from "../proposal/work-model/proposal-handoff-model.ts";
import type { ProposalWorkflowApplyPayload } from "../proposal/work-model/proposal-workflow-command-model.ts";
import type { ProposalWorkflowSourceSnapshot } from "../proposal/work-model/proposal-source-projection-model.ts";
import type { ProposalWorkspaceScenario } from "../proposal/read-model/proposal-workspace-read-model.ts";
import { recordProposalDeliveryEntryPacketFromHandoff } from "./proposal-delivery-entry-projection.ts";
import {
  getProposalRepositoryGateResolutions,
  recordProposalRepositoryRequestPacketFromDisposition,
} from "./proposal-repository-request-projection.ts";
import { recordProposalPrototypeEntryPacketFromHandoff } from "./proposal-prototype-entry-projection.ts";

export async function submitProposalWorkflowIntegrationCommand({
  payload,
  proposal,
  proposalId,
  source,
  submittedAt,
}: {
  payload: ProposalWorkflowApplyPayload;
  proposal: ProposalWorkspaceScenario;
  proposalId: string;
  source: ProposalWorkflowSourceSnapshot;
  submittedAt?: string;
}) {
  assertProposalWorkflowSource({ proposal, proposalId, source });
  assertProposalWorkflowBoundary({
    payload,
    proposal,
    proposalId,
  });

  const result = await submitProposalWorkflowApplyCommand({
    payload,
    proposalId,
    source,
    submittedAt,
  });
  const producerReceipt = {
    receiptId: result.receipt.receipt.receiptId,
    recordedAt: result.receipt.receipt.recordedAt,
  };

  if (payload.step === "disposition") {
    recordProposalRepositoryRequestPacketFromDisposition({
      producerReceipt,
      proposal,
      routeSelectionDraft: payload.route
        ? {
            ...payload.route,
            proposalId,
          }
        : null,
    });
  }

  if (payload.step === "handoff") {
    const routeSelectionDraft = appliedProposalRouteSelectionDraft(
      proposal,
      proposalId,
    );

    if (routeSelectionDraft) {
      recordProposalHandoffPackets({
        handoffDraft: {
          notes: payload.notes,
          proposalId,
          result: payload.result,
        },
        producerReceipt,
        proposal,
        routeSelectionDraft,
      });
    }
  }

  return result;
}

function assertProposalWorkflowBoundary({
  payload,
  proposal,
  proposalId,
}: {
  payload: ProposalWorkflowApplyPayload;
  proposal: ProposalWorkspaceScenario;
  proposalId: string;
}) {
  if (payload.step === "disposition") {
    if (payload.decision.outcome !== "accepted") {
      if (payload.route !== null) {
        throw new Error(
          "Terminal Proposal disposition cannot retain a downstream route.",
        );
      }
      return;
    }

    if (
      !payload.route ||
      !proposalRouteSelectionComplete({
        ...payload.route,
        proposalId,
      })
    ) {
      throw new Error(
        "Accepted Proposal disposition requires a complete supported route.",
      );
    }
    return;
  }

  if (payload.step !== "handoff") {
    return;
  }

  const routeSelectionDraft = appliedProposalRouteSelectionDraft(
    proposal,
    proposalId,
  );
  const repositoryGateResolution =
    getProposalRepositoryGateResolutions()[proposal.id] ?? null;

  if (
    !routeSelectionDraft ||
    payload.result !== "ready" ||
    proposalHandoffResultForProposal(
      proposal,
      routeSelectionDraft,
      repositoryGateResolution,
    ) !== "ready"
  ) {
    throw new Error(
      "Proposal handoff requires an accepted route and resolved source custody.",
    );
  }
}

function appliedProposalRouteSelectionDraft(
  proposal: ProposalWorkspaceScenario,
  proposalId: string,
): ProposalRouteSelectionDraft | null {
  const receipts =
    getProposalRuntimeProjectionSnapshot().workflowReceipts[proposalId] ?? [];
  const dispositionReceipt = latestProposalWorkflowReceipt(
    receipts,
    "disposition",
  );

  if (!dispositionReceipt) {
    return proposalRouteSelectionDraftFromProposal(proposal);
  }

  if (
    dispositionReceipt.payload.step !== "disposition" ||
    !dispositionReceipt.payload.route
  ) {
    return null;
  }

  return {
    ...dispositionReceipt.payload.route,
    appliedAt: dispositionReceipt.recordedAt,
    appliedReceiptId: dispositionReceipt.receiptId,
    proposalId,
    savedAt: dispositionReceipt.recordedAt,
    sourceBackendRecordId: dispositionReceipt.sourceBackendRecordId,
    sourceProjectionState: dispositionReceipt.sourceProjectionState,
    sourceRecordVersion: dispositionReceipt.sourceRecordVersion,
  };
}

function recordProposalHandoffPackets({
  handoffDraft,
  producerReceipt,
  proposal,
  routeSelectionDraft,
}: {
  handoffDraft: ProposalHandoffDraft;
  producerReceipt: { receiptId: string; recordedAt: string };
  proposal: ProposalWorkspaceScenario;
  routeSelectionDraft: ProposalRouteSelectionDraft;
}) {
  const repositoryGateResolution =
    getProposalRepositoryGateResolutions()[proposal.id] ?? null;
  const input = {
    handoffDraft,
    producerReceipt,
    proposal,
    repositoryGateResolution,
    routeSelectionDraft,
  };

  recordProposalPrototypeEntryPacketFromHandoff(input);
  recordProposalDeliveryEntryPacketFromHandoff(input);
}

function assertProposalWorkflowSource({
  proposal,
  proposalId,
  source,
}: {
  proposal: ProposalWorkspaceScenario;
  proposalId: string;
  source: ProposalWorkflowSourceSnapshot;
}) {
  if (
    proposal.id !== proposalId ||
    proposal.backendRecordId !== source.backendRecordId ||
    proposal.recordVersion !== source.recordVersion
  ) {
    throw new Error(
      "Proposal workflow integration rejected mismatched source context.",
    );
  }
}
