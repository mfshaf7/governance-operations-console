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
  projectProposalCanonicalDrafts,
  projectProposalLiveRecords,
  proposalLiveWorkspaceStatus,
} from "../../live-runtime/proposal-live-projection.ts";
import { useProposalLiveRuntime } from "../../live-runtime/use-proposal-live-runtime.ts";
import type { ProposalWorkflowApplyPayload } from "../../work-model/proposal-workflow-command-model.ts";
import type { ProposalWorkflowSourceSnapshot } from "../../work-model/proposal-source-projection-model.ts";
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
  const proposalLiveRuntime = useProposalLiveRuntime();
  const liveSnapshot = proposalLiveRuntime.snapshot;
  const previewMode = liveSnapshot?.mode === "disconnected-preview";
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
  const canonicalProjection = useMemo(
    () => projectProposalCanonicalDrafts(liveSnapshot?.records ?? []),
    [liveSnapshot?.records],
  );
  const liveProposals = useMemo(
    () => projectProposalLiveRecords(liveSnapshot?.records ?? []),
    [liveSnapshot?.records],
  );
  const proposals = previewMode ? effectiveProjection.records : liveProposals;
  const effectiveWorkflowReceipts = previewMode
    ? effectiveProjection.workflowReceiptsByProposal
    : canonicalProjection.workflowReceipts;
  const effectiveRepositoryGateResolutions = useMemo(
    () =>
      previewMode
        ? Object.fromEntries(
            proposals.flatMap((proposal) => {
              const resolution = proposalEffectiveRepositoryGateResolution(
                proposal,
                repositoryGateResolutions[proposal.id] ?? null,
              );

              return resolution ? [[proposal.id, resolution]] : [];
            }),
          )
        : canonicalProjection.repositoryGateResolutions,
    [
      canonicalProjection.repositoryGateResolutions,
      previewMode,
      proposals,
      repositoryGateResolutions,
    ],
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

      if (previewMode) {
        const { receipt } = await submitProposalWorkflowIntegrationCommand({
          ...input,
          proposal,
        });

        return {
          receiptId: receipt.receipt.receiptId,
          recordedAt: receipt.receipt.recordedAt,
        };
      }

      const liveRecord = liveSnapshot?.records.find(
        (record) => record.projection.proposal_id === input.proposalId,
      );
      if (!liveRecord || liveSnapshot?.status !== "current") {
        throw new Error("Canonical Proposal state is unavailable for this command.");
      }
      const appliesToDelivery =
        input.payload.step === "handoff" &&
        liveRecord.projection.route?.target === "delivery" &&
        (input.payload.result === "ready" ||
          liveRecord.projection.handoff.state === "blocked" ||
          liveRecord.projection.handoff.state === "ready" ||
          liveRecord.projection.handoff.state === "waiting-on-target");
      if (
        appliesToDelivery &&
        liveRecord.projection.handoff.state !== "not-requested"
      ) {
        return applyLiveDeliveryHandoff(
          proposalLiveRuntime,
          liveRecord.projection,
        );
      }
      const result = await proposalLiveRuntime.command({
        commandId: proposalLiveCommandId(input),
        payload: input.payload,
        proposalId: input.proposalId,
        source: {
          projectionState: liveRecord.projection.projection_state,
          recordRef: liveRecord.projection.record_ref,
          recordVersion: liveRecord.projection.record_version,
          status: liveRecord.projection.status,
        },
      });
      if (appliesToDelivery) {
        return applyLiveDeliveryHandoff(
          proposalLiveRuntime,
          result.projection,
        );
      }
      return {
        receiptId: result.receipt.receipt_ref,
        recordedAt: result.receipt.recorded_at,
      };
    },
  });
  const { decisionDrafts, handoffDrafts, routeSelectionDrafts, triageDrafts } =
    useMemo(() => {
      if (previewMode) {
        return proposalWorkflowDraftsFromReceipts({
          decisionDrafts: localDecisionDrafts,
          handoffDrafts: localHandoffDrafts,
          receiptsByProposal: effectiveWorkflowReceipts,
          routeSelectionDrafts: localRouteSelectionDrafts,
          triageDrafts: localTriageDrafts,
        });
      }

      return {
        decisionDrafts: mergeCurrentProposalDrafts(
          canonicalProjection.decisionDrafts,
          localDecisionDrafts,
          proposals,
        ),
        handoffDrafts: mergeCurrentProposalDrafts(
          canonicalProjection.handoffDrafts,
          localHandoffDrafts,
          proposals,
        ),
        routeSelectionDrafts: mergeCurrentProposalDrafts(
          canonicalProjection.routeSelectionDrafts,
          localRouteSelectionDrafts,
          proposals,
        ),
        triageDrafts: mergeCurrentProposalDrafts(
          canonicalProjection.triageDrafts,
          localTriageDrafts,
          proposals,
        ),
      };
    }, [
      canonicalProjection.decisionDrafts,
      canonicalProjection.handoffDrafts,
      canonicalProjection.routeSelectionDrafts,
      canonicalProjection.triageDrafts,
      effectiveWorkflowReceipts,
      localDecisionDrafts,
      localHandoffDrafts,
      localRouteSelectionDrafts,
      localTriageDrafts,
      previewMode,
      proposals,
    ]);
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
    (previewMode
      ? runtimeCapabilities.canSubmit
      : liveSnapshot?.status === "current") &&
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

    const capturedProposalId = previewMode
      ? (
          await submitProposalCaptureCommand({
            bodyPreview: captureContext.trim(),
            captureRequestId,
            title: captureTitle.trim(),
          })
        ).record.id
      : await proposalLiveRuntime.capture({
          body: captureContext.trim(),
          requestId: captureRequestId,
          title: captureTitle.trim(),
        });

    setSelectedProposalId(capturedProposalId);
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
      available: previewMode || liveSnapshot?.status === "current",
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
    workspaceStatus: proposalLiveWorkspaceStatus(liveSnapshot),
  };
}

async function applyLiveDeliveryHandoff(
  runtime: Pick<
    ReturnType<typeof useProposalLiveRuntime>,
    "applyDeliveryHandoff"
  >,
  projection: NonNullable<
    ReturnType<typeof useProposalLiveRuntime>["snapshot"]
  >["records"][number]["projection"],
) {
  if (
    projection.status !== "accepted" ||
    projection.route?.target !== "delivery" ||
    !projection.handoff.packet_ref
  ) {
    throw new Error(
      "Canonical Proposal state is not ready for Delivery application.",
    );
  }
  const result = await runtime.applyDeliveryHandoff({
    proposalId: projection.proposal_id,
    source: {
      handoffPacketRef: projection.handoff.packet_ref,
      recordRef: projection.record_ref,
      recordVersion: projection.record_version,
      status: projection.status,
    },
  });
  return {
    receiptId: result.receipt.receipt_ref,
    recordedAt: result.receipt.recorded_at,
  };
}

function mergeCurrentProposalDrafts<TDraft extends { sourceRecordVersion?: string }>(
  canonicalDrafts: Record<string, TDraft>,
  localDrafts: Record<string, TDraft>,
  proposals: ProposalWorkspaceScenario[],
) {
  const currentVersions = new Map(
    proposals.map((proposal) => [proposal.id, proposal.recordVersion]),
  );
  return {
    ...canonicalDrafts,
    ...Object.fromEntries(
      Object.entries(localDrafts).filter(
        ([proposalId, draft]) =>
          draft.sourceRecordVersion === currentVersions.get(proposalId),
      ),
    ),
  };
}

function proposalLiveCommandId(input: {
  payload: ProposalWorkflowApplyPayload;
  proposalId: string;
  source: ProposalWorkflowSourceSnapshot;
}) {
  const value = JSON.stringify(input);
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `proposal-command:${input.proposalId}:${input.payload.step}:${(hash >>> 0).toString(16)}`;
}
