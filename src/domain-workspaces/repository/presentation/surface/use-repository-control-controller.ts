"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";

import {
  getProposalRepositoryRequestRecords,
  subscribeProposalRepositoryRequestRecords,
} from "../../local-runtime/ingress/repository-ingress-runtime.ts";
import { recordProposalRepositoryGateResolution } from "../../../operation-integrations/proposal-repository-request-projection.ts";
import {
  getRepositoryRuntimeProjectionSnapshot,
  getRepositoryRuntimeCapabilities,
  recordRepositoryAdmissionCommand,
  recordRepositoryProposalGateResolutionCommand,
  subscribeRepositoryRuntimeProjection,
} from "../../local-runtime/repository-runtime.ts";
import {
  emptyRepositoryRequestDraft,
  type RepositoryRequestDraft,
} from "../../work-model/request/repository-request-model.ts";
import { projectRepositoryEffectiveRecordProjections } from "../../local-runtime/repository-effective-projection.ts";
import {
  repositoryWorkspaceReadModel,
  type RepositoryWorkspaceRecord,
} from "../../read-model/repository-workspace-read-model.ts";
import {
  repositoryRuntimeLaneStatusLabel,
  repositorySecurityBindingStatusLabel,
  repositoryStatusFilterOptions,
  type RepositoryStatusFilter,
} from "../shared/repository-display-model.ts";
import type { RepositoryGateResolutionDraft } from "../dialogs/gate-resolution/repository-gate-resolution-view-model.ts";
import {
  repositoryCanLinkCustody,
  repositoryCanOpenRepositoryReview,
  repositoryCanResolveProposalGate,
  repositorySummaryFromRecords,
} from "../shared/repository-control-projection.ts";
import { useRepositoryCustodyLiveRuntime } from "../../live-runtime/use-repository-custody-live-runtime.ts";
import {
  projectRepositoryCustodyResults,
  projectRepositoryProvisioningResults,
  repositoryProvisionedRecordId,
} from "../../live-runtime/repository-custody-live-projection.ts";
import type { RepositoryCustodyLinkIntent } from "../../live-runtime/repository-custody-live-types.ts";
import type {
  RepositoryLifecycleAction,
  RepositoryLifecycleCommandIntent,
} from "../../live-runtime/repository-lifecycle-live-types.ts";
import { useRepositoryLifecycleLiveRuntime } from "../../live-runtime/use-repository-lifecycle-live-runtime.ts";
import {
  repositoryRequestDraftComplete,
  repositoryRequestDraftDirty,
  repositoryProvisionIntentFromDraft,
} from "../dialogs/request/repository-request-view-model.ts";

const defaultRepositoryId =
  repositoryWorkspaceReadModel.records.find(
    (record) => record.admissionState === "ready",
  )?.id ??
  repositoryWorkspaceReadModel.records[0]?.id ??
  "";

export function useRepositoryControlController({
  entryIntent = null,
}: {
  entryIntent?: ConsoleSurfaceEntryIntent | null;
}) {
  const runtimeCapabilities = getRepositoryRuntimeCapabilities();
  const custodyRuntime = useRepositoryCustodyLiveRuntime();
  const lifecycleRuntime = useRepositoryLifecycleLiveRuntime();
  const proposalRequestRecords = useSyncExternalStore(
    subscribeProposalRepositoryRequestRecords,
    getProposalRepositoryRequestRecords,
    getProposalRepositoryRequestRecords,
  );
  const repositoryRuntimeProjection = useSyncExternalStore(
    subscribeRepositoryRuntimeProjection,
    getRepositoryRuntimeProjectionSnapshot,
    getRepositoryRuntimeProjectionSnapshot,
  );
  const recordProjections = useMemo(
    () =>
      projectRepositoryEffectiveRecordProjections({
        proposalRequestRecords,
        runtimeProjection: repositoryRuntimeProjection,
        sourceRecords: repositoryWorkspaceReadModel.records,
      }),
    [proposalRequestRecords, repositoryRuntimeProjection],
  );
  const records = useMemo(
    () => {
      const provisionedRecords = projectRepositoryProvisioningResults(
        recordProjections.map((projection) => projection.record),
        custodyRuntime.provisioningResultsByRequestId,
      );
      return projectRepositoryCustodyResults(
        provisionedRecords,
        custodyRuntime.resultsByRepositoryId,
      );
    },
    [
      custodyRuntime.provisioningResultsByRequestId,
      custodyRuntime.resultsByRepositoryId,
      recordProjections,
    ],
  );
  const recordProjectionById = useMemo(
    () =>
      new Map(
        recordProjections.map((projection) => [
          projection.record.id,
          projection,
        ]),
      ),
    [recordProjections],
  );
  const [inspectedRepositoryId, setInspectedRepositoryId] = useState<
    string | null
  >(null);
  const [custodyRepositoryId, setCustodyRepositoryId] = useState<string | null>(
    null,
  );
  const [historyRepositoryId, setHistoryRepositoryId] = useState<string | null>(
    null,
  );
  const [requestCloseGuardOpen, setRequestCloseGuardOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestId, setRequestId] = useState(createRepositoryProvisionRequestId);
  const [requestRequestedAt, setRequestRequestedAt] = useState(() =>
    new Date().toISOString(),
  );
  const [requestDraft, setRequestDraft] = useState<RepositoryRequestDraft>(
    emptyRepositoryRequestDraft,
  );
  const [requestSubmittedAt, setRequestSubmittedAt] = useState<string | null>(
    null,
  );
  const [statusFilter, setStatusFilter] =
    useState<RepositoryStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedRepositoryId, setSelectedRepositoryId] =
    useState(defaultRepositoryId);
  const [admissionRepositoryId, setAdmissionRepositoryId] = useState<
    string | null
  >(null);
  const [admissionRunRepositoryId, setAdmissionRunRepositoryId] = useState<
    string | null
  >(null);
  const [
    repositoryGateResolutionRepositoryId,
    setRepositoryGateResolutionRepositoryId,
  ] = useState<string | null>(null);
  const [lifecycleRepositoryId, setLifecycleRepositoryId] = useState<
    string | null
  >(null);
  const [lifecycleInitialAction, setLifecycleInitialAction] = useState<
    RepositoryLifecycleAction | undefined
  >(undefined);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesStatus =
          statusFilter === "all" || record.admissionState === statusFilter;
        const matchesSearch = normalizedSearch
          ? [
              record.admissionState,
              record.boundary,
              record.githubUrl,
              record.id,
              record.lastValidation,
              record.lifecycle,
              record.name,
              record.nextAction,
              record.owner,
              record.purpose,
              record.repoClass,
              record.role,
              record.routeSource,
              record.runtimeLane.decision,
              record.runtimeLane.profileRef,
              repositoryRuntimeLaneStatusLabel(record.runtimeLane.status),
              repositorySecurityBindingStatusLabel(
                record.securityBinding.status,
              ),
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch)
          : true;

        return matchesStatus && matchesSearch;
      }),
    [normalizedSearch, records, statusFilter],
  );
  const selectedRepository = useMemo(
    () =>
      records.find((record) => record.id === selectedRepositoryId) ??
      records[0],
    [records, selectedRepositoryId],
  );
  const inspectedRepository = useMemo(
    () =>
      inspectedRepositoryId
        ? (records.find((record) => record.id === inspectedRepositoryId) ??
          null)
        : null,
    [inspectedRepositoryId, records],
  );
  const custodyRepository = useMemo(
    () =>
      custodyRepositoryId
        ? (records.find((record) => record.id === custodyRepositoryId) ?? null)
        : null,
    [custodyRepositoryId, records],
  );
  const historyRepository = useMemo(
    () =>
      historyRepositoryId
        ? (records.find((record) => record.id === historyRepositoryId) ?? null)
        : null,
    [historyRepositoryId, records],
  );
  const admissionRepository = useMemo(
    () =>
      admissionRepositoryId
        ? (records.find((record) => record.id === admissionRepositoryId) ??
          null)
        : null,
    [admissionRepositoryId, records],
  );
  const admissionRunRepository = useMemo(
    () =>
      admissionRunRepositoryId
        ? (records.find((record) => record.id === admissionRunRepositoryId) ??
          null)
        : null,
    [admissionRunRepositoryId, records],
  );
  const repositoryGateResolutionRepository = useMemo(
    () =>
      repositoryGateResolutionRepositoryId
        ? (records.find(
            (record) => record.id === repositoryGateResolutionRepositoryId,
          ) ?? null)
        : null,
    [records, repositoryGateResolutionRepositoryId],
  );
  const lifecycleRepository = useMemo(
    () =>
      lifecycleRepositoryId
        ? (records.find(
            (record) => record.id === lifecycleRepositoryId,
          ) ?? null)
        : null,
    [lifecycleRepositoryId, records],
  );
  const statusOptions = useMemo(
    () => repositoryStatusFilterOptions(records),
    [records],
  );
  const summary = useMemo(
    () => repositorySummaryFromRecords(records),
    [records],
  );
  const requestDraftDirty = repositoryRequestDraftDirty(requestDraft);
  const requestResult = custodyRuntime.provisioningResultsByRequestId[requestId];
  const requestError = custodyRuntime.provisioningErrorsByRequestId[requestId];
  const requestPending = custodyRuntime.pendingProvisioningRequestId === requestId;
  const requestDraftCanSubmit =
    !requestPending &&
    repositoryRequestDraftComplete(requestDraft) &&
    requestResult?.status !== "succeeded" &&
    (!requestResult ||
      requestResult.retryable ||
      requestResult.status === "applying");

  useEffect(() => {
    if (!entryIntent) {
      return;
    }

    const focusedRecord = records.find(
      (record) =>
        record.id === entryIntent.subjectRef ||
        record.proposalGate?.proposalId === entryIntent.subjectRef,
    );

    if (!focusedRecord) {
      return;
    }

    setStatusFilter("all");
    setSearch("");
    setSelectedRepositoryId(focusedRecord.id);
  }, [entryIntent, records]);

  function openRepositoryRequestDraft() {
    setRequestDialogOpen(true);
    setRequestCloseGuardOpen(false);
    setRequestSubmittedAt(null);
  }

  function updateRepositoryRequestDraft(
    field: keyof RepositoryRequestDraft,
    value: RepositoryRequestDraft[keyof RepositoryRequestDraft],
  ) {
    if (requestResult) {
      setRequestId(createRepositoryProvisionRequestId());
      setRequestRequestedAt(new Date().toISOString());
    }
    setRequestDraft((current) => {
      const next = { ...current, [field]: value } as RepositoryRequestDraft;
      if (
        field === "name" &&
        typeof value === "string" &&
        (!current.workspaceOwnerRef ||
          current.workspaceOwnerRef === `repo:${current.name}`)
      ) {
        next.workspaceOwnerRef = value.trim() ? `repo:${value.trim()}` : "";
      }
      return next;
    });
    setRequestSubmittedAt(null);
  }

  function requestRepositoryDraftClose() {
    if (requestResult?.status === "succeeded") {
      closeRepositoryRequestDraft({ discard: true });
      return;
    }
    if (requestDraftDirty) {
      setRequestCloseGuardOpen(true);
      return;
    }

    closeRepositoryRequestDraft({ discard: false });
  }

  function closeRepositoryRequestDraft({ discard }: { discard: boolean }) {
    setRequestCloseGuardOpen(false);
    setRequestDialogOpen(false);

    if (discard) {
      setRequestDraft(emptyRepositoryRequestDraft);
      setRequestSubmittedAt(null);
      setRequestId(createRepositoryProvisionRequestId());
      setRequestRequestedAt(new Date().toISOString());
    }
  }

  async function submitRepositoryRequestDraft() {
    if (!requestDraftCanSubmit) {
      return;
    }

    const result =
      requestResult?.status === "applying"
        ? await custodyRuntime.readProvisioning(requestId)
        : await custodyRuntime.provision(
            repositoryProvisionIntentFromDraft(requestDraft, {
              requestedAt: requestRequestedAt,
              requestId,
            }),
          );
    if (result.status === "succeeded") {
      const recordId = repositoryProvisionedRecordId(result);
      if (recordId) setSelectedRepositoryId(recordId);
      setRequestSubmittedAt(result.receipt?.completed_at ?? new Date().toISOString());
      setRequestCloseGuardOpen(false);
    }
  }

  function inspectRepository(record: RepositoryWorkspaceRecord) {
    setSelectedRepositoryId(record.id);

    if (repositoryCanResolveProposalGate(record)) {
      openRepositoryGateResolution(record);
      return;
    }

    if (repositoryCanLinkCustody(record)) {
      setCustodyRepositoryId(record.id);
      return;
    }

    if (repositoryCanOpenRepositoryReview(record)) {
      setAdmissionRepositoryId(record.id);
      return;
    }

    setInspectedRepositoryId(record.id);
  }

  async function runRepositoryAdmission(record: RepositoryWorkspaceRecord) {
    if (!runtimeCapabilities.canSubmit) {
      return;
    }

    await recordRepositoryAdmissionCommand(record);
  }

  async function linkRepositoryCustody(intent: RepositoryCustodyLinkIntent) {
    await custodyRuntime.link(intent);
  }

  function startRepositoryAdmissionRun(record: RepositoryWorkspaceRecord) {
    setAdmissionRepositoryId(null);
    setAdmissionRunRepositoryId(record.id);
  }

  function returnToRepositoryAdmission(
    record: RepositoryWorkspaceRecord | null,
  ) {
    setAdmissionRunRepositoryId(null);
    setAdmissionRepositoryId(record?.id ?? null);
  }

  function openRepositoryLifecycle(
    record: RepositoryWorkspaceRecord,
    initialAction?: RepositoryLifecycleAction,
  ) {
    if (!record.providerIdentity) return;
    setAdmissionRepositoryId(null);
    setInspectedRepositoryId(null);
    setLifecycleInitialAction(initialAction);
    setLifecycleRepositoryId(record.id);
    void lifecycleRuntime
      .refresh({
        provider: record.providerIdentity.provider,
        providerRepositoryId: record.providerIdentity.repositoryId,
        repositoryId: record.id,
      })
      .catch(() => undefined);
  }

  function openRepositoryGateResolution(record: RepositoryWorkspaceRecord) {
    setInspectedRepositoryId(null);
    setRepositoryGateResolutionRepositoryId(record.id);
  }

  function openRepositoryHistory(record: RepositoryWorkspaceRecord) {
    setAdmissionRepositoryId(null);
    setInspectedRepositoryId(null);
    setLifecycleRepositoryId(null);
    setHistoryRepositoryId(record.id);
    if (record.providerIdentity) {
      void lifecycleRuntime
        .refresh({
          provider: record.providerIdentity.provider,
          providerRepositoryId: record.providerIdentity.repositoryId,
          repositoryId: record.id,
        })
        .catch(() => undefined);
    }
  }

  async function resolveRepositoryGate(
    record: RepositoryWorkspaceRecord,
    draft: RepositoryGateResolutionDraft,
  ) {
    if (!record.proposalGate || record.proposalGate.status !== "pending") {
      return;
    }

    const resolutionReceipt =
      await recordRepositoryProposalGateResolutionCommand({
        notes: draft.notes,
        record,
        resolvedOwner: draft.resolvedOwner,
        resolvedRepoRef: draft.resolvedRepoRef,
      });
    recordProposalRepositoryGateResolution(resolutionReceipt);
    setSelectedRepositoryId(record.id);
    setRepositoryGateResolutionRepositoryId(null);
  }

  async function executeRepositoryLifecycle(
    intent: RepositoryLifecycleCommandIntent,
  ) {
    await lifecycleRuntime.execute(intent);
  }

  return {
    custody: {
      close: () => setCustodyRepositoryId(null),
      error: custodyRepository
        ? custodyRuntime.errorsByRepositoryId[custodyRepository.id]
        : undefined,
      onLink: linkRepositoryCustody,
      pending: custodyRuntime.pendingRepositoryId === custodyRepository?.id,
      repository: custodyRepository,
      result: custodyRepository
        ? custodyRuntime.resultsByRepositoryId[custodyRepository.id]
        : undefined,
    },
    admission: {
      close: () => setAdmissionRepositoryId(null),
      onOpenHistory: openRepositoryHistory,
      onOpenLifecycle: (record: RepositoryWorkspaceRecord) =>
        openRepositoryLifecycle(record, "retire-workspace-record"),
      onStart: startRepositoryAdmissionRun,
      receipt: admissionRepository
        ? (recordProjectionById.get(admissionRepository.id)?.admissionReceipt ??
          undefined)
        : undefined,
      repository: admissionRepository,
    },
    admissionRun: {
      close: () => setAdmissionRunRepositoryId(null),
      onBack: returnToRepositoryAdmission,
      onRun: runRepositoryAdmission,
      receipt: admissionRunRepository
        ? (recordProjectionById.get(admissionRunRepository.id)
            ?.admissionReceipt ?? undefined)
        : undefined,
      repository: admissionRunRepository,
    },
    details: {
      close: () => setInspectedRepositoryId(null),
      onOpenHistory: openRepositoryHistory,
      onOpenLifecycle: openRepositoryLifecycle,
      onResolveProposalGate: openRepositoryGateResolution,
      repository: inspectedRepository,
    },
    filters: {
      onSearchChange: setSearch,
      onStatusChange: setStatusFilter,
      search,
      status: statusFilter,
      statusOptions,
    },
    gateResolution: {
      close: () => setRepositoryGateResolutionRepositoryId(null),
      onRecordResolution: resolveRepositoryGate,
      repository: repositoryGateResolutionRepository,
    },
    history: {
      lifecycleAudit: historyRepository
        ? lifecycleRuntime.snapshotsByRepositoryId[historyRepository.id]?.audit ??
          lifecycleRuntime.resultsByRepositoryId[historyRepository.id]?.audit ??
          null
        : null,
      close: () => setHistoryRepositoryId(null),
      receipts: historyRepository
        ? (repositoryRuntimeProjection.receiptsByRecord[historyRepository.id] ??
          [])
        : [],
      repository: historyRepository,
    },
    overview: {
      onOpenRepositoryRequestDraft: openRepositoryRequestDraft,
      requestSubmittedAt,
      summary,
      workspaceStatus: repositoryWorkspaceReadModel.workspaceStatus,
    },
    records: {
      all: records,
      filtered: filteredRecords,
    },
    register: {
      inspect: inspectRepository,
      select: (record: RepositoryWorkspaceRecord) =>
        setSelectedRepositoryId(record.id),
    },
    request: {
      canSubmit: requestDraftCanSubmit,
      close: requestRepositoryDraftClose,
      closeGuardOpen: requestCloseGuardOpen,
      discard: () => closeRepositoryRequestDraft({ discard: true }),
      draft: requestDraft,
      error: requestError,
      keepEditing: () => setRequestCloseGuardOpen(false),
      onSubmit: submitRepositoryRequestDraft,
      onUpdateDraft: updateRepositoryRequestDraft,
      open: requestDialogOpen,
      pending: requestPending,
      result: requestResult,
    },
    lifecycle: {
      close: () => setLifecycleRepositoryId(null),
      custodyResult: lifecycleRepository
        ? custodyRuntime.resultsByRepositoryId[lifecycleRepository.id]
        : undefined,
      error: lifecycleRepository
        ? lifecycleRuntime.errorsByRepositoryId[lifecycleRepository.id]
        : undefined,
      initialAction: lifecycleInitialAction,
      onExecute: executeRepositoryLifecycle,
      onOpenHistory: openRepositoryHistory,
      pending:
        lifecycleRuntime.pendingRepositoryId === lifecycleRepository?.id,
      repository: lifecycleRepository,
      result: lifecycleRepository
        ? lifecycleRuntime.resultsByRepositoryId[lifecycleRepository.id]
        : undefined,
      snapshot: lifecycleRepository
        ? lifecycleRuntime.snapshotsByRepositoryId[lifecycleRepository.id]
        : undefined,
    },
    selectedRepository,
    selectedRepositoryCustodyResult:
      custodyRuntime.resultsByRepositoryId[selectedRepository?.id ?? ""],
    selectedRepositoryAction: {
      open: () => {
        if (!selectedRepository) {
          return;
        }

        if (repositoryCanResolveProposalGate(selectedRepository)) {
          openRepositoryGateResolution(selectedRepository);
          return;
        }

        inspectRepository(selectedRepository);
      },
    },
  };
}

export type RepositoryControlController = ReturnType<
  typeof useRepositoryControlController
>;

function createRepositoryProvisionRequestId() {
  return `repository-custody-request:console-${crypto.randomUUID()}`;
}
