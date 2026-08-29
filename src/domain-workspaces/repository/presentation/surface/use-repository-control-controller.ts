"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";

import {
  getProposalRepositoryRequestRecords,
  subscribeProposalRepositoryRequestRecords,
} from "../../local-runtime/ingress/repository-ingress-runtime.ts";
import { recordProposalRepositoryGateResolution } from "../../../operation-integrations/proposal-repository-request-projection.ts";
import {
  createRepositoryRequestId,
  getRepositoryRuntimeProjectionSnapshot,
  getRepositoryRuntimeCapabilities,
  recordRepositoryAdmissionCommand,
  recordRepositoryProposalGateResolutionCommand,
  recordRepositoryRetirementRequestCommand,
  subscribeRepositoryRuntimeProjection,
  submitRepositoryRequestCommand,
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
import { projectRepositoryCustodyResults } from "../../live-runtime/repository-custody-live-projection.ts";
import type { RepositoryCustodyLinkIntent } from "../../live-runtime/repository-custody-live-types.ts";
import {
  repositoryRequestDraftComplete,
  repositoryRequestDraftDirty,
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
    () =>
      projectRepositoryCustodyResults(
        recordProjections.map((projection) => projection.record),
        custodyRuntime.resultsByRepositoryId,
      ),
    [custodyRuntime.resultsByRepositoryId, recordProjections],
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
  const [requestId, setRequestId] = useState(createRepositoryRequestId);
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
  const [retirementRequestGuardOpen, setRetirementRequestGuardOpen] =
    useState(false);
  const [retirementRequestRepositoryId, setRetirementRequestRepositoryId] =
    useState<string | null>(null);
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
  const retirementRequestRepository = useMemo(
    () =>
      retirementRequestRepositoryId
        ? (records.find(
            (record) => record.id === retirementRequestRepositoryId,
          ) ?? null)
        : null,
    [records, retirementRequestRepositoryId],
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
  const requestDraftCanSubmit =
    runtimeCapabilities.canSubmit &&
    repositoryRequestDraftComplete(requestDraft);

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
    value: string,
  ) {
    setRequestDraft((current) => ({ ...current, [field]: value }));
    setRequestSubmittedAt(null);
  }

  function requestRepositoryDraftClose() {
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
    }
  }

  async function submitRepositoryRequestDraft() {
    if (!requestDraftCanSubmit) {
      return;
    }

    const result = await submitRepositoryRequestCommand(requestDraft, {
      requestId,
    });

    setSelectedRepositoryId(result.record.id);
    setRequestSubmittedAt(result.submittedAt);
    setRequestDraft(emptyRepositoryRequestDraft);
    setRequestId(createRepositoryRequestId());
    setRequestCloseGuardOpen(false);
    setRequestDialogOpen(false);
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

  function openRepositoryRetirementRequest(record: RepositoryWorkspaceRecord) {
    setAdmissionRepositoryId(null);
    setRetirementRequestRepositoryId(record.id);
    setRetirementRequestGuardOpen(false);
  }

  function openRepositoryGateResolution(record: RepositoryWorkspaceRecord) {
    setInspectedRepositoryId(null);
    setRepositoryGateResolutionRepositoryId(record.id);
  }

  function openRepositoryHistory(record: RepositoryWorkspaceRecord) {
    setHistoryRepositoryId(record.id);
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

  function requestRepositoryRetirementRecord() {
    setRetirementRequestGuardOpen(true);
  }

  async function recordRepositoryRetirementRequest() {
    if (!runtimeCapabilities.canSubmit || !retirementRequestRepository) {
      return;
    }

    await recordRepositoryRetirementRequestCommand(retirementRequestRepository);
    setRetirementRequestGuardOpen(false);
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
      onOpenRetirementRequest: openRepositoryRetirementRequest,
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
      keepEditing: () => setRequestCloseGuardOpen(false),
      onSubmit: submitRepositoryRequestDraft,
      onUpdateDraft: updateRepositoryRequestDraft,
      open: requestDialogOpen,
    },
    retirement: {
      close: () => {
        setRetirementRequestRepositoryId(null);
        setRetirementRequestGuardOpen(false);
      },
      guardDescription: retirementRequestRepository
        ? `Recording this request keeps ${retirementRequestRepository.name} admitted in the prototype projection, but marks a retirement request receipt for later owner-routed handling.`
        : "Recording this request creates a prototype-local retirement request receipt.",
      guardOpen: retirementRequestGuardOpen,
      onKeepEditing: () => setRetirementRequestGuardOpen(false),
      onRecordRequest: recordRepositoryRetirementRequest,
      onRequestRecord: requestRepositoryRetirementRecord,
      receipt: retirementRequestRepository
        ? (recordProjectionById.get(retirementRequestRepository.id)
            ?.retirementRequestReceipt ?? undefined)
        : undefined,
      repository: retirementRequestRepository,
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
