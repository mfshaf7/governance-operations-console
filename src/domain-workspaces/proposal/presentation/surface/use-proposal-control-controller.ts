"use client";
import { useWorkspaceViewState } from "../../../../console-integration/registers/workspace-view-state.ts";

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
  const [selectedProposalId, setSelectedProposalId] = useWorkspaceViewState('proposal:selectedProposalId',
    proposalWorkspaceReadModel.proposals[1]?.id ??
      proposalWorkspaceReadModel.proposals[0]?.id ??
      "",
  );
  const [proposalIngressFilter, setProposalIngressFilter] =
    useWorkspaceViewState<ProposalIngressFilter>('proposal:proposalIngressFilter', "all");
  const [proposalSearch, setProposalSearch] = useWorkspaceViewState('proposal:proposalSearch', "");
  const [proposalStatusFilter, setProposalStatusFilter] =
    useWorkspaceViewState<ProposalStatusFilter>('proposal:proposalStatusFilter', "all");
  const [hubProposalId, setHubProposalId] = useState<string | null>(null);
  const [inspectedProposalId, setInspectedProposalId] = useState<string | null>(
    null,
  );
  const proposalLiveRuntime = useProposalLiveRuntime({query:proposalSearch,status:proposalStatusFilter,ingress:proposalIngressFilter},selectedProposalId,hubProposalId ?? inspectedProposalId);
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
  const [captureContext, setCaptureContext] = useState("");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [capturePending, setCapturePending] = useState(false);
  const [captureCanRetry, setCaptureCanRetry] = useState(false);
  const [captureOutcomeUnknown, setCaptureOutcomeUnknown] = useState(false);
  const [captureResult, setCaptureResult] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureRequestId, setCaptureRequestId] = useState(
    createProposalCaptureRequestId,
  );
  const [captureTitle, setCaptureTitle] = useState("");


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
      if (!liveRecord || liveRecord.summaryOnly || liveSnapshot?.status !== "current") {
        throw new Error("Canonical Proposal state is unavailable for this command.");
      }
      const appliesToDelivery =
        input.payload.step === "handoff" &&
        liveRecord.projection.route?.target === "delivery" &&
        (input.payload.result === "ready" ||
          liveRecord.projection.handoff.state === "blocked" ||
          liveRecord.projection.handoff.state === "ready" ||
          liveRecord.projection.handoff.state === "waiting-on-target");
      const appliesToPrototype =
        input.payload.step === "handoff" &&
        liveRecord.projection.route?.target === "prototype" &&
        input.payload.result === "ready";
      if (
        appliesToDelivery &&
        liveRecord.projection.handoff.state !== "not-requested"
      ) {
        return applyLiveDeliveryHandoff(
          proposalLiveRuntime,
          liveRecord.projection,
        );
      }
      if (
        appliesToPrototype &&
        liveRecord.projection.handoff.state !== "not-requested"
      ) {
        return applyLivePrototypeHandoff(
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
      if (appliesToPrototype) {
        return applyLivePrototypeHandoff(proposalLiveRuntime, result.projection);
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
      !previewMode && liveSnapshot?.page ? proposals.filter(proposal=>liveSnapshot.records.some(record=>!record.selectedOnly && record.projection.proposal_id===proposal.id)) : proposalFilterRegisterRows({
        ingressFilter: proposalIngressFilter,
        proposals,
        search: proposalSearch,
        statusFilter: proposalStatusFilter,
      }),
    [proposalIngressFilter, proposalSearch, proposalStatusFilter, proposals, previewMode, liveSnapshot],
  );
  const selectedProposal = useMemo(
    () =>
      proposals.find((proposal) => proposal.id === selectedProposalId) ??
      proposals[0] ??
      null,
    [proposals, selectedProposalId],
  );
  const proposalStatusOptions = useMemo(
    () => previewMode ? proposalStatusFilterOptions(proposals) : [
      {label:"All states",value:"all" as const},...(["captured","triaged","ready-to-route","waiting-on-repository","waiting-on-source","parked","done","retired"] as const).map(value=>({value,label:({captured:"Captured",triaged:"Triaged","ready-to-route":"Review","waiting-on-repository":"Repo needed","waiting-on-source":"Needs source",parked:"Parked",done:"Done",retired:"Delivery retired"})[value]}))],
    [proposals,previewMode],
  );
  const summary = useMemo(
    () => {
      const metrics = proposalWorkspaceSummaryMetrics(!previewMode && liveSnapshot?.page ? filteredProposals : proposals);
      return !liveSnapshot || (!previewMode && liveSnapshot.status === "offline" && liveSnapshot.records.length === 0)
        ? metrics.map(metric=>({...metric,value:"—"})) : metrics;
    },
    [proposals,previewMode,liveSnapshot,filteredProposals],
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

    // A required move can refer to an older page. Read its exact source independently.
    setProposalIngressFilter("all");
    setProposalSearch("");
    setProposalStatusFilter("all");
    setSelectedProposalId(entryIntent.subjectRef);
  }, [entryIntent]);

  async function submitCapturedProposal() {
    if (!canSubmitCapture || capturePending) {
      return;
    }
    setCapturePending(true);
    setCaptureError(null);
    try {
    let recoveredCaptureId:string|null=null;
    if(captureOutcomeUnknown && !captureCanRetry){
      const result=await proposalLiveRuntime.checkCapture({body:captureContext.trim(),requestId:captureRequestId,title:captureTitle.trim()});
      recoveredCaptureId=result.proposalId;
      if(result.status==="not-found"){
        setCaptureCanRetry(true);setCaptureError("No saved proposal was found for this capture. You can retry the original request with the same details and identity.");return;
      }
    }
    setCaptureCanRetry(false);
    const capturedProposalId = recoveredCaptureId ?? (previewMode
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
        }));

    if (!capturedProposalId) {
      setCaptureError("The result is still unconfirmed. Check the backlog or check this result again. No additional proposal was sent.");return;
    }
    setCaptureOutcomeUnknown(false);setCaptureResult("Proposal created. Open its Hub to review the idea and choose its next step.");
    setProposalIngressFilter("all");setProposalStatusFilter("all");setProposalSearch("");
    setSelectedProposalId(capturedProposalId);
    setCaptureContext("");
    setCaptureRequestId(createProposalCaptureRequestId());
    setCaptureTitle("");
    setCaptureOpen(false);
    } catch (error) {
      setCaptureOutcomeUnknown(captureOutcomeUnknown || Boolean(error && typeof error === "object" && "outcomeUnknown" in error && error.outcomeUnknown));
      setCaptureError(error instanceof Error ? error.message : "Proposal capture was not confirmed. Your draft is retained.");
    } finally { setCapturePending(false); }
  }

  function inspectProposal(proposal: ProposalWorkspaceScenario) {
    setSelectedProposalId(proposal.id);
    setInspectedProposalId(proposal.id);
  }

  return {
    capture: {
      previewMode,
      pending: capturePending,
      outcomeUnknown: captureOutcomeUnknown,
      canRetry: captureCanRetry,
      error: captureError,
      available: previewMode || liveSnapshot?.status === "current",
      canSubmit: canSubmitCapture,
      close: () => { if (!capturePending) setCaptureOpen(false); },
      context: captureContext,
      onContextChange: value => {if(!captureOutcomeUnknown)setCaptureContext(value);},
      onTitleChange: value => {if(!captureOutcomeUnknown)setCaptureTitle(value);},
      open: captureOpen,
      openModal: () => setCaptureOpen(true),
      submit: submitCapturedProposal,
      title: captureTitle,
    },
    source: { loading: liveSnapshot === null, error: liveSnapshot?.error ?? null,
      page: liveSnapshot?.page ?? null, pagePending: proposalLiveRuntime.pagePending, pageError: proposalLiveRuntime.pageError,
      hasPrevious:proposalLiveRuntime.hasPrevious,onNext:proposalLiveRuntime.loadMore,onPrevious:proposalLiveRuntime.previousPage,
      pageOffset:proposalLiveRuntime.pageOffset,pageNumber:proposalLiveRuntime.pageNumber,
      onRefresh:()=>void proposalLiveRuntime.refresh(true),result:captureResult },
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
      previewMode, sourceLoading: !previewMode && Boolean(liveSnapshot?.records.find(record=>record.projection.proposal_id===hubProposalId)?.summaryOnly),
      sourceError:proposalLiveRuntime.detailError,onRetrySource:()=>void proposalLiveRuntime.refreshSelected(),
      sourceHistory:liveSnapshot?.records.find(record=>record.projection.proposal_id===hubProposalId)?.history ?? null,
      historyPending:proposalLiveRuntime.historyPending,historyError:proposalLiveRuntime.historyError,onLoadHistory:proposalLiveRuntime.loadHistory,
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
          ? applyHandoffDraftReceipt(draft, hubProposal).then((receipt) => ({
              complete: receipt.complete !== false,
            }))
          : Promise.resolve({ complete: false }),
      onCancelTargetApplication: () =>
        hubProposal
          ? proposalLiveRuntime
              .cancelTargetApplication(hubProposal.id)
              .then(() => undefined)
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
      targetApplication: hubProposal
        ? (proposalLiveRuntime.targetApplications[hubProposal.id] ?? null)
        : null,
      targetApplicationError: hubProposal
        ? (proposalLiveRuntime.targetApplicationErrors[hubProposal.id] ?? null)
        : null,
      targetApplicationPending: hubProposal
        ? (proposalLiveRuntime.targetApplicationPending[hubProposal.id] ?? false)
        : false,
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

async function applyLivePrototypeHandoff(
  runtime: Pick<
    ReturnType<typeof useProposalLiveRuntime>,
    | "continueTargetApplication"
    | "startTargetApplication"
    | "targetApplications"
  >,
  projection: NonNullable<
    ReturnType<typeof useProposalLiveRuntime>["snapshot"]
  >["records"][number]["projection"],
) {
  if (
    projection.status !== "accepted" ||
    projection.route?.target !== "prototype" ||
    projection.route.source_custody.repository_gate_state !== "resolved" ||
    projection.handoff.state !== "ready" ||
    !projection.handoff.packet_ref
  ) {
    throw new Error(
      "Canonical Proposal state is not ready for Prototype target application.",
    );
  }
  const current = runtime.targetApplications[projection.proposal_id];
  const result = current
    ? await runtime.continueTargetApplication(projection.proposal_id)
    : await runtime.startTargetApplication({
        proposalId: projection.proposal_id,
        source: {
          handoffPacketRef: projection.handoff.packet_ref,
          recordRef: projection.record_ref,
          recordVersion: projection.record_version,
          status: projection.status,
        },
      });
  if (
    result.status !== "succeeded" ||
    !result.target_result ||
    !result.proposal_acknowledgement
  ) {
    const recordedAt = result.history.at(-1)?.at ?? new Date().toISOString();
    return {
      complete: false,
      receiptId: result.application_id,
      recordedAt,
    };
  }
  return {
    complete: true,
    receiptId: result.target_result.receipt.receipt_ref,
    recordedAt: result.target_result.receipt.recorded_at,
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
