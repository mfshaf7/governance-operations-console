"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import {
  proposalWorkspaceReadModel,
  type ProposalWorkspaceScenario,
} from "../../read-model/proposal-workspace-read-model.ts";
import {
  createProposalCaptureRequestId,
  getProposalRuntimeCapabilities,
  getProposalRuntimeProjectionSnapshot,
  proposalLocalTimestamp,
  submitProposalCaptureCommand,
  subscribeProposalRuntimeProjection,
} from "../../local-runtime/proposal-runtime.ts";
import {
  projectProposalEffectiveProjection,
  proposalEffectiveRepositoryGateResolution,
} from "../../local-runtime/proposal-effective-projection.ts";
import { proposalWorkflowDraftsFromReceipts } from "../../local-runtime/proposal-workflow-receipt-projection.ts";
import {
  proposalFilterRegisterRows,
  proposalWorkspaceSummaryMetrics,
  proposalStatusFilterOptions,
  type ProposalIngressFilter,
  type ProposalStatusFilter,
} from "../shared/proposal-display-model.ts";
import { proposalHubProjection } from "../hub/proposal-hub-view-model.ts";
import { useProposalWorkflowDrafts } from "../workflows/session/use-proposal-workflow-drafts.ts";
import {
  getProposalRepositoryGateResolutions,
  subscribeProposalRepositoryRequestPacketProjections,
} from "../../../operation-integrations/proposal-repository-request-projection.ts";
import {
  getProposalPrototypeEntryPacketProjections,
  subscribeProposalPrototypeEntryPacketProjections,
} from "../../../operation-integrations/proposal-prototype-entry-projection.ts";
import {
  getProposalDeliveryEntryPacketProjections,
  subscribeProposalDeliveryEntryPacketProjections,
} from "../../../operation-integrations/proposal-delivery-entry-projection.ts";
import { submitProposalWorkflowIntegrationCommand } from "../../../operation-integrations/proposal-workflow-integration-runtime.ts";
import type { ProposalControlController } from "./proposal-control-types.ts";

export function useProposalControlController({
  entryIntent = null,
}: {
  entryIntent?: ConsoleSurfaceEntryIntent | null;
} = {}): ProposalControlController {
  const runtimeCapabilities = getProposalRuntimeCapabilities();
  const proposalRuntimeProjection = useSyncExternalStore(
    subscribeProposalRuntimeProjection,
    getProposalRuntimeProjectionSnapshot,
    getProposalRuntimeProjectionSnapshot,
  );
  const repositoryGateResolutions = useSyncExternalStore(
    subscribeProposalRepositoryRequestPacketProjections,
    getProposalRepositoryGateResolutions,
    getProposalRepositoryGateResolutions,
  );
  const prototypeEntryPackets = useSyncExternalStore(
    subscribeProposalPrototypeEntryPacketProjections,
    getProposalPrototypeEntryPacketProjections,
    getProposalPrototypeEntryPacketProjections,
  );
  const deliveryEntryPackets = useSyncExternalStore(
    subscribeProposalDeliveryEntryPacketProjections,
    getProposalDeliveryEntryPacketProjections,
    getProposalDeliveryEntryPacketProjections,
  );
  const handoffPacketProjections = useMemo(
    () => [...prototypeEntryPackets, ...deliveryEntryPackets],
    [deliveryEntryPackets, prototypeEntryPackets],
  );
  const effectiveProjection = useMemo(
    () =>
      projectProposalEffectiveProjection({
        handoffPacketProjections,
        repositoryGateResolutions,
        runtimeProjection: proposalRuntimeProjection,
        sourceRecords: proposalWorkspaceReadModel.proposals,
      }),
    [
      handoffPacketProjections,
      proposalRuntimeProjection,
      repositoryGateResolutions,
    ],
  );
  const proposals = effectiveProjection.records;
  const effectiveWorkflowReceipts =
    effectiveProjection.workflowReceiptsByProposal;
  const effectiveRepositoryGateResolutions = useMemo(
    () =>
      Object.fromEntries(
        proposals.flatMap((proposal) => {
          const resolution = proposalEffectiveRepositoryGateResolution(
            proposal,
            repositoryGateResolutions[proposal.id] ?? null,
          );

          return resolution ? [[proposal.id, resolution]] : [];
        }),
      ),
    [proposals, repositoryGateResolutions],
  );
  const [selectedProposalId, setSelectedProposalId] = useState(
    proposalWorkspaceReadModel.proposals[1]?.id ??
      proposalWorkspaceReadModel.proposals[0]?.id ??
      "",
  );
  const [captureContext, setCaptureContext] = useState("");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureRequestId, setCaptureRequestId] = useState(
    createProposalCaptureRequestId,
  );
  const [captureTitle, setCaptureTitle] = useState("");
  const [proposalIngressFilter, setProposalIngressFilter] =
    useState<ProposalIngressFilter>("all");
  const [proposalSearch, setProposalSearch] = useState("");
  const [proposalStatusFilter, setProposalStatusFilter] =
    useState<ProposalStatusFilter>("all");
  const [inspectedProposalId, setInspectedProposalId] = useState<string | null>(
    null,
  );
  const [hubProposalId, setHubProposalId] = useState<string | null>(null);
  const {
    applyDispositionDraft: applyDispositionDraftReceipt,
    applyHandoffDraft: applyHandoffDraftReceipt,
    applyTriageDraft: applyTriageDraftReceipt,
    decisionDrafts: localDecisionDrafts,
    handoffDrafts: localHandoffDrafts,
    routeSelectionDrafts: localRouteSelectionDrafts,
    saveDecisionDraft,
    saveHandoffDraft,
    saveRouteSelectionDraft,
    saveTriageDraft,
    triageDrafts: localTriageDrafts,
  } = useProposalWorkflowDrafts({
    now: proposalLocalTimestamp,
    recordWorkflowReceipt: async (input) => {
      const proposal = proposals.find(
        (candidate) => candidate.id === input.proposalId,
      );

      if (!proposal) {
        throw new Error(
          `Proposal workflow source "${input.proposalId}" is unavailable.`,
        );
      }

      const { receipt } = await submitProposalWorkflowIntegrationCommand({
        ...input,
        proposal,
      });

      return {
        receiptId: receipt.receipt.receiptId,
        recordedAt: receipt.receipt.recordedAt,
      };
    },
  });
  const { decisionDrafts, handoffDrafts, routeSelectionDrafts, triageDrafts } =
    useMemo(
      () =>
        proposalWorkflowDraftsFromReceipts({
          decisionDrafts: localDecisionDrafts,
          handoffDrafts: localHandoffDrafts,
          receiptsByProposal: effectiveWorkflowReceipts,
          routeSelectionDrafts: localRouteSelectionDrafts,
          triageDrafts: localTriageDrafts,
        }),
      [
        localDecisionDrafts,
        localHandoffDrafts,
        localRouteSelectionDrafts,
        localTriageDrafts,
        effectiveWorkflowReceipts,
      ],
    );
  const filteredProposals = useMemo(
    () =>
      proposalFilterRegisterRows({
        ingressFilter: proposalIngressFilter,
        proposals,
        search: proposalSearch,
        statusFilter: proposalStatusFilter,
      }),
    [proposalIngressFilter, proposalSearch, proposalStatusFilter, proposals],
  );
  const selectedProposal = useMemo(
    () =>
      proposals.find((proposal) => proposal.id === selectedProposalId) ??
      proposals[0] ??
      null,
    [proposals, selectedProposalId],
  );
  const proposalStatusOptions = useMemo(
    () => proposalStatusFilterOptions(proposals),
    [proposals],
  );
  const summary = useMemo(
    () => proposalWorkspaceSummaryMetrics(proposals),
    [proposals],
  );
  const inspectedProposal = useMemo(
    () =>
      inspectedProposalId
        ? (proposals.find((proposal) => proposal.id === inspectedProposalId) ??
          null)
        : null,
    [inspectedProposalId, proposals],
  );
  const hubProposal = useMemo(
    () =>
      hubProposalId
        ? (proposals.find((proposal) => proposal.id === hubProposalId) ?? null)
        : null,
    [hubProposalId, proposals],
  );
  const canSubmitCapture =
    runtimeCapabilities.canSubmit &&
    captureTitle.trim().length > 0 &&
    captureContext.trim().length > 0;
  const selectedProposalHubProjection = selectedProposal
    ? proposalHubProjection(
        selectedProposal,
        triageDrafts[selectedProposal.id] ?? null,
        decisionDrafts[selectedProposal.id] ?? null,
        routeSelectionDrafts[selectedProposal.id] ?? null,
        handoffDrafts[selectedProposal.id] ?? null,
        effectiveRepositoryGateResolutions[selectedProposal.id] ?? null,
      )
    : null;

  useEffect(() => {
    if (!entryIntent) {
      return;
    }

    const focusedProposal = proposals.find(
      (proposal) => proposal.id === entryIntent.subjectRef,
    );

    if (!focusedProposal) {
      return;
    }

    setProposalIngressFilter("all");
    setProposalSearch("");
    setProposalStatusFilter("all");
    setSelectedProposalId(focusedProposal.id);
  }, [entryIntent, proposals]);

  async function submitCapturedProposal() {
    if (!canSubmitCapture) {
      return;
    }

    const { record: capturedProposal } = await submitProposalCaptureCommand({
      bodyPreview: captureContext.trim(),
      captureRequestId,
      title: captureTitle.trim(),
    });

    setSelectedProposalId(capturedProposal.id);
    setCaptureContext("");
    setCaptureRequestId(createProposalCaptureRequestId());
    setCaptureTitle("");
    setCaptureOpen(false);
  }

  function inspectProposal(proposal: ProposalWorkspaceScenario) {
    setSelectedProposalId(proposal.id);
    setInspectedProposalId(proposal.id);
  }

  return {
    capture: {
      canSubmit: canSubmitCapture,
      close: () => setCaptureOpen(false),
      context: captureContext,
      onContextChange: setCaptureContext,
      onTitleChange: setCaptureTitle,
      open: captureOpen,
      openModal: () => setCaptureOpen(true),
      submit: submitCapturedProposal,
      title: captureTitle,
    },
    details: {
      close: () => setInspectedProposalId(null),
      inspect: inspectProposal,
      proposal: inspectedProposal,
    },
    filters: {
      ingress: proposalIngressFilter,
      onIngressChange: setProposalIngressFilter,
      onSearchChange: setProposalSearch,
      onStatusChange: setProposalStatusFilter,
      search: proposalSearch,
      status: proposalStatusFilter,
      statusOptions: proposalStatusOptions,
    },
    hub: {
      close: () => setHubProposalId(null),
      decisionDraft: hubProposal
        ? (decisionDrafts[hubProposal.id] ?? null)
        : null,
      handoffDraft: hubProposal
        ? (handoffDrafts[hubProposal.id] ?? null)
        : null,
      onApplyDispositionDraft: (drafts) =>
        hubProposal
          ? applyDispositionDraftReceipt({
              ...drafts,
              source: hubProposal,
            }).then(() => undefined)
          : Promise.resolve(),
      onApplyHandoffDraft: (draft) =>
        hubProposal
          ? applyHandoffDraftReceipt(draft, hubProposal).then(() => undefined)
          : Promise.resolve(),
      onApplyTriageDraft: (draft) =>
        hubProposal
          ? applyTriageDraftReceipt(draft, hubProposal).then(() => undefined)
          : Promise.resolve(),
      onChangeDecisionDraft: (draft) =>
        hubProposal && saveDecisionDraft(draft, hubProposal),
      onChangeHandoffDraft: (draft) =>
        hubProposal && saveHandoffDraft(draft, hubProposal),
      onChangeRouteSelectionDraft: (draft) =>
        hubProposal && saveRouteSelectionDraft(draft, hubProposal),
      onChangeTriageDraft: (draft) =>
        hubProposal && saveTriageDraft(draft, hubProposal),
      openSelected: () => {
        if (selectedProposal) {
          setHubProposalId(selectedProposal.id);
        }
      },
      proposal: hubProposal,
      repositoryGateResolution: hubProposal
        ? (effectiveRepositoryGateResolutions[hubProposal.id] ?? null)
        : null,
      routeSelectionDraft: hubProposal
        ? (routeSelectionDrafts[hubProposal.id] ?? null)
        : null,
      triageDraft: hubProposal ? (triageDrafts[hubProposal.id] ?? null) : null,
      workflowReceipts: hubProposal
        ? (effectiveWorkflowReceipts[hubProposal.id] ?? [])
        : [],
    },
    proposals: {
      all: proposals,
      filtered: filteredProposals,
    },
    register: {
      inspect: inspectProposal,
      select: (proposal) => setSelectedProposalId(proposal.id),
    },
    selectedProposal,
    selectedProposalHubProjection,
    summary,
  };
}
