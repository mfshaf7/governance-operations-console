"use client";

import { repositoryCreationForProposal, repositoryCreationProposalId } from "../../../operation-integrations/proposal-repository-custody.ts";
import { useProposalRepositoryGateRuntime } from "../../../operation-integrations/use-proposal-repository-gate-runtime.ts";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import type { OperationSurfaceStatusModel } from "../../../operation-contracts/surface-status.ts";
import {
  consoleRuntimeCapabilityExecutable,
  useConsoleRuntimeCapabilities,
} from "../../../../console-integration/configuration/use-console-runtime-capabilities.ts";
import {
  resolveConsolePrimaryRecordIsolation,
  selectConsoleAuthorityProjection,
} from "../../../../console-integration/fixture-isolation/console-fixture-isolation.ts";

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
import { useWorkspaceContinuityRuntime } from "../../../../workspace-continuity/live-runtime/use-workspace-continuity-runtime.ts";
import { useRepositoryRegistrationStatus } from "../../../../workspace-registry/live-runtime/use-repository-registration-status.ts";
import { useRepositoryProviderObservations } from "../../live-runtime/use-repository-provider-observations.ts";
import { projectRepositoryProviderObservations } from "../../live-runtime/repository-provider-observation.ts";
import { projectRepositoryCurrentInventory } from "../../live-runtime/repository-inventory-live-projection.ts";
import { useRepositoryCustodyLiveRuntime } from "../../live-runtime/use-repository-custody-live-runtime.ts";
import { repositoryIntakeCustody } from "../dialogs/admission/repository-intake-candidate.ts";
import {
  projectRepositoryCustodyResults,
  projectRepositoryProvisioningResults,
  repositoryProvisionedRecordId,
  repositoryCustodyHistoryForRecord,
} from "../../live-runtime/repository-custody-live-projection.ts";
import type { RepositoryCustodyLinkIntent, RepositoryCustodyWorkflowResult } from "../../live-runtime/repository-custody-live-types.ts";
import type {
  RepositoryLifecycleAction,
  RepositoryLifecycleCommandIntent,
} from "../../live-runtime/repository-lifecycle-live-types.ts";
import { useRepositoryLifecycleLiveRuntime } from "../../live-runtime/use-repository-lifecycle-live-runtime.ts";
import {
  repositoryRequestDraftComplete,
  repositoryRequestDraftDirty,
  repositoryProvisionIntentFromDraft,
  repositoryProvisioningCanCorrect,
  repositoryRequestDraftFromResult,
} from "../dialogs/request/repository-request-view-model.ts";

const defaultRepositoryId =
  repositoryWorkspaceReadModel.records.find(
    (record) => record.admissionState === "ready",
  )?.id ??
  repositoryWorkspaceReadModel.records[0]?.id ??
  "";

export function useRepositoryControlController({
  entryIntent = null,
  onOpenDeliveryCatalog,
}: {
  entryIntent?: ConsoleSurfaceEntryIntent | null;
  onOpenDeliveryCatalog?: (repositoryId: string) => void;
}) {
  const runtimeCapabilities = getRepositoryRuntimeCapabilities();
  const consoleRuntime = useConsoleRuntimeCapabilities();
  const custodyRuntime = useRepositoryCustodyLiveRuntime();
  const repositoryRequests = useProposalRepositoryGateRuntime();
  const [view, setView] = useState<"requests" | "repositories">("repositories");
  const continuityRuntime = useWorkspaceContinuityRuntime();
  useEffect(() => {
    if (consoleRuntime.projection?.mode !== "live" && consoleRuntime.projection?.mode !== "invalid") return;
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try { await continuityRuntime.load(); } catch { /* Owner error clears current inventory. */ }
      finally { pending = false; }
    };
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [consoleRuntime.projection?.mode, continuityRuntime.load]);
  const primaryRecordIsolation = resolveConsolePrimaryRecordIsolation({
    liveAuthorityAvailable: custodyRuntime.sourceStatus === "current",
    runtimeMode: consoleRuntime.projection?.mode ?? null,
    runtimeStatus: consoleRuntime.status,
  });
  const sourceRecords = useMemo(
    () =>
      selectConsoleAuthorityProjection({
        decision: primaryRecordIsolation,
        fixture: primaryRecordIsolation.fixtureAllowed
          ? repositoryWorkspaceReadModel.records
          : [],
        live: null,
      }) ?? [],
    [
      primaryRecordIsolation.fixtureAllowed,
      primaryRecordIsolation.liveAuthorityAllowed,
    ],
  );
  const canProvisionRepository = consoleRuntimeCapabilityExecutable(
    consoleRuntime,
    "repository-provisioning",
    "mutation",
  );
  const canClassifyRepository = consoleRuntimeCapabilityExecutable(consoleRuntime, "workspace-intake", "mutation");
  const canPrepareRepositoryLink = custodyRuntime.sourceStatus === "current" && consoleRuntimeCapabilityExecutable(consoleRuntime, "repository-custody", "source");
  const canLinkRepository = consoleRuntimeCapabilityExecutable(consoleRuntime, "repository-custody", "mutation");
  const lifecycleRuntime = useRepositoryLifecycleLiveRuntime();
  const providerObservations = useRepositoryProviderObservations();
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
      primaryRecordIsolation.fixtureAllowed
        ? projectRepositoryEffectiveRecordProjections({
            proposalRequestRecords,
            runtimeProjection: repositoryRuntimeProjection,
            sourceRecords,
          })
        : [],
    [
      primaryRecordIsolation.fixtureAllowed,
      proposalRequestRecords,
      repositoryRuntimeProjection,
      sourceRecords,
    ],
  );
  const registrationNames = Object.values(custodyRuntime.provisioningResultsByRequestId).map(result => result.request.requested_custody.workspace_owner_ref)
    .concat(Object.values(custodyRuntime.resultsByRepositoryId).map(result => result.request.requested_custody.workspace_owner_ref))
    .filter((value): value is string => typeof value === "string" && value.startsWith("repo:")).map(value => value.slice(5));
  const registrationStatus = useRepositoryRegistrationStatus(registrationNames, !primaryRecordIsolation.fixtureAllowed && consoleRuntime.projection?.mode === "live");
  const records = useMemo(
    () => {
      const provisionedRecords = projectRepositoryProvisioningResults(
        recordProjections.map((projection) => projection.record),
        custodyRuntime.provisioningResultsByRequestId,
      );
      const custodyRecords = projectRepositoryCustodyResults(
        provisionedRecords,
        custodyRuntime.resultsByRepositoryId,
      );
      const inventoryRecords = primaryRecordIsolation.fixtureAllowed ? custodyRecords
        : projectRepositoryCurrentInventory(custodyRecords, continuityRuntime.projection, registrationStatus.value);
      return primaryRecordIsolation.fixtureAllowed ? inventoryRecords : projectRepositoryProviderObservations(inventoryRecords, providerObservations.snapshots);
    },
    [
      providerObservations.snapshots,
      custodyRuntime.provisioningResultsByRequestId,
      custodyRuntime.resultsByRepositoryId,
      recordProjections,
      continuityRuntime.projection,
      registrationStatus.value,
      primaryRecordIsolation.fixtureAllowed,
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
  const [canonicalGateOpen, setCanonicalGateOpen] = useState(false);
  const [standaloneLinkOpen, setStandaloneLinkOpen] = useState(false);
  const [historyReloading, setHistoryReloading] = useState(false);
  const [canonicalGateSubject, setCanonicalGateSubject] = useState<string | undefined>();
  useEffect(() => {
    if (entryIntent?.requiredMoveRef === "repository.resolve-proposal-gate" && entryIntent.subjectRef) {
      setView("requests"); setCanonicalGateSubject(entryIntent.subjectRef); setCanonicalGateOpen(true);
    }
  }, [entryIntent]);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [intakeRepositoryId, setIntakeRepositoryId] = useState<string | null>(null);
  const allCustodyResults = [...Object.values(custodyRuntime.resultsByRepositoryId),
    ...Object.values(custodyRuntime.provisioningResultsByRequestId), ...custodyRuntime.retainedResults];
  const [requestCloseGuardOpen, setRequestCloseGuardOpen] = useState(false);
  const [requestSwitchTo, setRequestSwitchTo] = useState<string | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestProposalId, setRequestProposalId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(createRepositoryProvisionRequestId);
  const [requestCorrectionOf, setRequestCorrectionOf] = useState<string | null>(null);
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
  const selectedRepositoryCustodyResult = allCustodyResults.find(result => repositoryIntakeCustody(selectedRepository, result));
  const intakeRepository = records.find((record) => record.id === intakeRepositoryId) ?? null;
  const intakeCustodyResult = allCustodyResults.find((result) => repositoryIntakeCustody(intakeRepository, result));
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
  const currentOwnersAvailable = custodyRuntime.sourceStatus === "current" && continuityRuntime.mode === "live";
  const localAdmissionAvailable = primaryRecordIsolation.fixtureAllowed && runtimeCapabilities.canSubmit;
  function workspaceRegistrationFor(record: RepositoryWorkspaceRecord | null | undefined) {
    const native = registrationStatus.value?.mode === "current" ? registrationStatus.value.records.find(row => row.record_id === record?.custody?.workspaceOwnerRef) : undefined;
    const required = !primaryRecordIsolation.fixtureAllowed && record?.admissionState === "ready" && native?.status !== "admitted";
    const custody = allCustodyResults.find((result) => repositoryIntakeCustody(record ?? null, result));
    const unavailableReason = !currentOwnersAvailable
      ? "Workspace registration needs current repository and workspace records. Refresh when the connection is available."
      : !canClassifyRepository
        ? "Workspace registration is unavailable with the current connection or permissions."
        : !custody
          ? "Workspace registration needs a successful custody receipt for this exact repository."
          : null;
    return { required, available: required && !unavailableReason, unavailableReason };
  }
  const selectedRegistration = workspaceRegistrationFor(selectedRepository);
  const admissionRegistration = workspaceRegistrationFor(admissionRepository);
  const workspaceStatus: OperationSurfaceStatusModel =
    primaryRecordIsolation.fixtureAllowed
      ? repositoryWorkspaceReadModel.workspaceStatus
      : {
          ariaLabel: "Repository control status",
          items: [
            {
              detail: currentOwnersAvailable
                ? "Custody history is projected from OOS; current admission is reconciled with canonical Workspace inventory."
                : custodyRuntime.sourceError ?? continuityRuntime.error?.message ?? "Current repository source records are loading.",
              facts: [
                { label: "Custody history", value: custodyRuntime.sourceStatus },
                { label: "Current inventory", value: continuityRuntime.mode },
                { label: "Internal registrations", value: registrationStatus.error ? "unavailable" : registrationStatus.value?.mode === "current" ? "current" : registrationStatus.value?.mode === "not-configured" ? "not configured" : "loading" },
                { label: "Fixture fallback", value: "disabled" },
              ],
              id: "source",
              label: "Source",
              state: currentOwnersAvailable ? "online" : custodyRuntime.sourceStatus === "loading" ? "syncing" : "offline",
              tone: currentOwnersAvailable ? "ok" : custodyRuntime.sourceStatus === "loading" ? "info" : "danger",
            },
            {
              detail: canProvisionRepository
                ? "Repository provisioning is independently executable through OOS."
                : "Repository provisioning is not executable under the current runtime capability projection.",
              facts: [
                {
                  label: "Provisioning",
                  value: canProvisionRepository ? "available" : "unavailable",
                },
              ],
              id: "write-path",
              label: "Creation",
              state: canProvisionRepository ? "online" : "offline",
              tone: canProvisionRepository ? "ok" : "warn",
            },
          ],
          kicker: "Repository Status",
          statusLabel: currentOwnersAvailable ? "Canonical source current" : "Current admission unavailable",
          summary:
            "Live mode shows only authoritative Repository results returned by workflow services.",
          title: "Repository control status",
          tone: currentOwnersAvailable ? "ok" : "danger",
        };
  const activeRequestResult = custodyRuntime.provisioningResultsByRequestId[requestId];
  const correctionSource = repositoryProvisioningCanCorrect(activeRequestResult)
    ? activeRequestResult
    : requestCorrectionOf ? custodyRuntime.provisioningResultsByRequestId[requestCorrectionOf] : undefined;
  const requestResult = activeRequestResult ?? correctionSource;
  const requestDraftDirty = requestResult?.status !== "succeeded" && repositoryRequestDraftDirty(
    requestDraft, requestResult ? repositoryRequestDraftFromResult(requestResult) : emptyRepositoryRequestDraft,
  );
  const requestError = custodyRuntime.provisioningErrorsByRequestId[requestId];
  const requestPending = custodyRuntime.pendingProvisioningRequestId === requestId;
  const resumeApprovedRequest = Boolean(activeRequestResult?.retryable || activeRequestResult?.status === "applying");
  const requestDraftCanSubmit =
    canProvisionRepository &&
    !requestPending &&
    (resumeApprovedRequest || repositoryRequestDraftComplete(requestDraft)) &&
    requestResult?.status !== "succeeded" &&
    (!requestResult ||
      requestResult.retryable ||
      requestResult.status === "applying" ||
      repositoryProvisioningCanCorrect(requestResult));

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

  function openRepositoryRequestForProposal(proposalId: string) {
    const requirement = repositoryRequests.requests.find(request => request.proposalId === proposalId);
    if (!requirement || requirement.resolution) return;
    const retained = Object.values(custodyRuntime.provisioningResultsByRequestId)
      .filter(result => repositoryCreationForProposal(result, proposalId))
      .sort((a, b) => a.request.requested_at.localeCompare(b.request.requested_at)).at(-1);
    if (!retained && (!canProvisionRepository || custodyRuntime.sourceStatus !== "current" || !requirement.sourceCurrent)) return;
    const target = retained?.request.request_id ?? `new-for:${proposalId}`;
    setRequestDialogOpen(true);
    if (requestDraftDirty && requestProposalId !== proposalId) {
      setRequestSwitchTo(target); setRequestCloseGuardOpen(true); return;
    }
    if (retained?.request.request_id !== requestId || requestProposalId !== proposalId) applyRetainedProvisioningRequest(target);
  }

  function openRepositoryRequestDraft() {
    if (!canProvisionRepository) return;
    if (!requestDraftDirty && !resumeApprovedRequest && !requestPending) {
      applyRetainedProvisioningRequest("new", null);
    }
    setRequestDialogOpen(true);
    setRequestCloseGuardOpen(false);
    setRequestSubmittedAt(null);
  }

  function updateRepositoryRequestDraft(
    field: keyof RepositoryRequestDraft,
    value: RepositoryRequestDraft[keyof RepositoryRequestDraft],
  ) {
    if (requestPending || resumeApprovedRequest) return;
    if (correctionSource && !["approvalNote", "templateReviewed"].includes(field)) return;
    if (requestResult && !correctionSource) {
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

  function selectRetainedProvisioningRequest(retainedId: string) {
    if (requestPending) return;
    if (requestDraftDirty) {
      setRequestSwitchTo(retainedId);
      setRequestCloseGuardOpen(true);
      return;
    }
    applyRetainedProvisioningRequest(retainedId);
  }

  function applyRetainedProvisioningRequest(retainedId: string, proposalId = requestProposalId) {
    setRequestCorrectionOf(null);
    setRequestSubmittedAt(null);
    if (retainedId === "new" || retainedId.startsWith("new-for:")) {
      setRequestProposalId(retainedId.startsWith("new-for:") ? retainedId.slice(8) : proposalId);
      setRequestDraft(emptyRepositoryRequestDraft);
      setRequestId(createRepositoryProvisionRequestId());
      setRequestRequestedAt(new Date().toISOString());
      return;
    }
    const result = custodyRuntime.provisioningResultsByRequestId[retainedId];
    if (!result) return;
    setRequestProposalId(repositoryCreationProposalId(result));
    setRequestId(retainedId);
    setRequestRequestedAt(result.request.requested_at);
    setRequestDraft(repositoryRequestDraftFromResult(result));
  }

  function requestRepositoryDraftClose() {
    setRequestSwitchTo(null);
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
    setRequestSwitchTo(null);
    setRequestDialogOpen(false);

    if (discard) {
      setRequestProposalId(null);
      setRequestDraft(emptyRepositoryRequestDraft);
      setRequestSubmittedAt(null);
      setRequestId(createRepositoryProvisionRequestId());
      setRequestCorrectionOf(null);
      setRequestRequestedAt(new Date().toISOString());
    }
  }

  async function submitRepositoryRequestDraft() {
    if (!requestDraftCanSubmit) {
      return;
    }

    const correcting = repositoryProvisioningCanCorrect(activeRequestResult);
    const nextRequestId = correcting ? createRepositoryProvisionRequestId() : requestId;
    const nextRequestedAt = correcting ? new Date().toISOString() : requestRequestedAt;
    const correctionOfRequestId = correcting ? activeRequestResult!.request.request_id : requestCorrectionOf;
    if (correcting) {
      setRequestId(nextRequestId);
      setRequestRequestedAt(nextRequestedAt);
      setRequestCorrectionOf(correctionOfRequestId);
    }
    const result =
      resumeApprovedRequest
        ? await custodyRuntime.provision({ requestId, resume: true })
        : await custodyRuntime.provision(
            repositoryProvisionIntentFromDraft(requestDraft, {
              requestedAt: nextRequestedAt,
              requestId: nextRequestId,
              ...(correctionOfRequestId ? { correctionOfRequestId } : {}),
              ...(requestProposalId ? { proposalId: requestProposalId } : {}),
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
    if (!localAdmissionAvailable) {
      return;
    }

    await recordRepositoryAdmissionCommand(record);
  }

  async function linkRepositoryCustody(intent: RepositoryCustodyLinkIntent) {
    await custodyRuntime.link(intent);
  }

  function startRepositoryAdmissionRun(record: RepositoryWorkspaceRecord) {
    if (!localAdmissionAvailable) return;
    setAdmissionRepositoryId(null);
    setAdmissionRunRepositoryId(record.id);
  }

  function returnToRepositoryAdmission(
    record: RepositoryWorkspaceRecord | null,
  ) {
    setAdmissionRunRepositoryId(null);
    setAdmissionRepositoryId(record?.id ?? null);
  }

  function openWorkspaceRegistration(record: RepositoryWorkspaceRecord) {
    if (!workspaceRegistrationFor(record).available) return;
    setSelectedRepositoryId(record.id);
    setAdmissionRepositoryId(null);
    setIntakeRepositoryId(record.id);
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
    if (consoleRuntime.projection?.mode === "live") void providerObservations.refresh(record);
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
    navigation: { view, setView },
    repositoryRequests,
    canonicalGate: {
      available: consoleRuntime.projection?.mode === "live",
      open: canonicalGateOpen,
      openDialog: (subjectRef?: string) => { setCanonicalGateSubject(subjectRef); setCanonicalGateOpen(true); },
      close: () => setCanonicalGateOpen(false),
      subjectRef: canonicalGateSubject,
    },
    verification: {
      open: verificationOpen,
      show: () => setVerificationOpen(true),
      close: () => setVerificationOpen(false),
      ownerRepo: selectedRepositoryCustodyResult?.request.requested_custody.workspace_owner_ref?.replace(/^repo:/, "") ?? "",
      custodyRequestId: selectedRepositoryCustodyResult?.request.request_id ?? "",
      available: Boolean(currentOwnersAvailable && selectedRepository?.admissionState === "admitted" && selectedRepositoryCustodyResult?.status === "succeeded" &&
        (continuityRuntime.projection?.inventory.some(record => record.kind === "repo" && record.posture === "active" &&
          record.record_id === selectedRepositoryCustodyResult.request.requested_custody.workspace_owner_ref) ||
          registrationStatus.value?.mode === "current" && registrationStatus.value.records.some(record => record.phase === "inventory" && record.status === "active" &&
            record.record_id === selectedRepositoryCustodyResult.request.requested_custody.workspace_owner_ref))),
    },
    intake: {
      ownerRepositories: currentOwnersAvailable ? (continuityRuntime.projection?.inventory ?? [])
        .filter(record => record.kind === "repo" && record.posture === "active").map(record => record.name).sort() : [],
      classification: currentOwnersAvailable ? (registrationStatus.value?.mode === "current" ? registrationStatus.value.records.find(record =>
        record.phase === "intake" && record.record_id === intakeCustodyResult?.request.requested_custody.workspace_owner_ref)?.status as "out-of-scope" | "proposed" | "admitted" | undefined : undefined)
        ?? continuityRuntime.projection?.intake.find(record => record.kind === "repo" && record.record_id === intakeCustodyResult?.request.requested_custody.workspace_owner_ref)?.status : undefined,
      canPrepare: selectedRegistration.available,
      required: selectedRegistration.required,
      unavailableReason: selectedRegistration.unavailableReason,
      open: () => { if (selectedRepository) openWorkspaceRegistration(selectedRepository); },
      close: () => setIntakeRepositoryId(null),
      repository: intakeRepository,
      custodyResult: intakeCustodyResult,
    },
    proposalGate: {
      custodyCurrent: custodyRuntime.sourceStatus === "current",
      attachmentAvailable: consoleRuntimeCapabilityExecutable(consoleRuntime,"repository-custody","mutation"),
      attach: custodyRuntime.link,
      custodyResults: [...new Map([...custodyRuntime.retainedResults,
        ...Object.values(custodyRuntime.resultsByRepositoryId),
        ...Object.values(custodyRuntime.provisioningResultsByRequestId),
      ].map(result => [result.request.request_id,result])).values()],
    },
    standaloneLink: {
      open: standaloneLinkOpen,
      enabled: canPrepareRepositoryLink,
      executionAvailable: canLinkRepository,
      show: () => setStandaloneLinkOpen(true),
      close: () => setStandaloneLinkOpen(false),
      results: allCustodyResults,
      link: custodyRuntime.link,
      openRepository: (result: RepositoryCustodyWorkflowResult) => {
        const id = repositoryProvisionedRecordId(result);
        if (!id) return;
        setSelectedRepositoryId(id);
        setView("repositories");
        setStandaloneLinkOpen(false);
      },
    },
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
      localReviewAvailable: localAdmissionAvailable,
      registration: admissionRegistration,
      onOpenRegistration: openWorkspaceRegistration,
      close: () => setAdmissionRepositoryId(null),
      onOpenDeliveryCatalog: (record: RepositoryWorkspaceRecord) => {
        setAdmissionRepositoryId(null);
        onOpenDeliveryCatalog?.(consoleRuntime.projection?.mode === "live" ? `repo:${record.name}` : record.id);
      },
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
      available: localAdmissionAvailable,
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
      providerRead: historyRepository ? providerObservations.snapshots[historyRepository.id] : undefined,
      refreshing: historyReloading || Boolean(historyRepository && lifecycleRuntime.refreshingRepositoryIds.has(historyRepository.id)) || custodyRuntime.sourceStatus === "loading",
      retryProvider: () => { if (historyRepository && consoleRuntime.projection?.mode === "live") void providerObservations.refresh(historyRepository); },
      retry: async () => {
        if (!historyRepository) return;
        const pending: Promise<unknown>[] = [];
        setHistoryReloading(true);
        if (custodyRuntime.sourceStatus === "offline" && custodyRuntime.sourceRetryable) pending.push(custodyRuntime.refresh());
        if (historyRepository.providerIdentity && lifecycleRuntime.errorsByRepositoryId[historyRepository.id]?.retryable) {
          pending.push(lifecycleRuntime.refresh({
            repositoryId: historyRepository.id,
            provider: historyRepository.providerIdentity.provider,
            providerRepositoryId: historyRepository.providerIdentity.repositoryId,
          }));
        }
        try { await Promise.allSettled(pending); } finally { setHistoryReloading(false); }
      },
      custodyResults: repositoryCustodyHistoryForRecord(historyRepository, allCustodyResults),
      custodySourceStatus: custodyRuntime.sourceStatus,
      custodySourceError: custodyRuntime.sourceError,
      custodyRetryable: custodyRuntime.sourceRetryable,
      liveMode: consoleRuntime.projection?.mode === "live",
      lifecycleSnapshot: historyRepository ? lifecycleRuntime.snapshotsByRepositoryId[historyRepository.id] : undefined,
      lifecycleError: historyRepository ? lifecycleRuntime.errorsByRepositoryId[historyRepository.id]?.message : undefined,
      lifecycleFailure: historyRepository ? lifecycleRuntime.errorsByRepositoryId[historyRepository.id] : undefined,
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
      canProvisionRepository,
      onOpenRepositoryRequestDraft: openRepositoryRequestDraft,
      requestSubmittedAt,
      summary,
      workspaceStatus,
    },
    records: {
      all: records,
      filtered: filteredRecords,
    },
    sourceAvailability: {
      loading: consoleRuntime.status === "loading" || continuityRuntime.mode === "loading" || custodyRuntime.sourceStatus === "loading",
      error: consoleRuntime.error,
      reasonCode: primaryRecordIsolation.reasonCode,
      unavailable: !primaryRecordIsolation.fixtureAllowed && records.length === 0,
    },
    register: {
      inspect: inspectRepository,
      select: (record: RepositoryWorkspaceRecord) =>
        setSelectedRepositoryId(record.id),
    },
    request: {
      canSubmit: requestDraftCanSubmit && (!requestProposalId || resumeApprovedRequest || Boolean(correctionSource) ||
        repositoryRequests.requests.some(request => request.proposalId === requestProposalId && request.sourceCurrent && !request.resolution)),
      proposalId: requestProposalId,
      proposalTitle: repositoryRequests.requests.find(request => request.proposalId === requestProposalId)?.title,
      openForProposal: openRepositoryRequestForProposal,
      creationAvailable: canProvisionRepository && custodyRuntime.sourceStatus === "current",
      close: requestRepositoryDraftClose,
      closeGuardOpen: requestCloseGuardOpen,
      guardTitle: requestSwitchTo !== null ? "Switch repository request?" : "Close repository draft?",
      guardDescription: requestSwitchTo !== null
        ? "Switching requests will discard the changes you have not submitted. Keep editing or discard them and switch."
        : "This request has changes you have not submitted. Keep editing or discard the draft.",
      discard: () => {
        if (requestSwitchTo !== null) {
          const next = requestSwitchTo;
          setRequestSwitchTo(null);
          setRequestCloseGuardOpen(false);
          applyRetainedProvisioningRequest(next);
        } else closeRepositoryRequestDraft({ discard: true });
      },
      draft: requestDraft,
      error: requestError,
      keepEditing: () => { setRequestCloseGuardOpen(false); setRequestSwitchTo(null); },
      onSubmit: submitRepositoryRequestDraft,
      onUpdateDraft: updateRepositoryRequestDraft,
      open: requestDialogOpen,
      pending: requestPending,
      result: requestResult,
      correction: Boolean(correctionSource),
      resume: resumeApprovedRequest,
      retainedRequests: Object.values(custodyRuntime.provisioningResultsByRequestId).filter(result => !requestProposalId || repositoryCreationForProposal(result, requestProposalId)),
      selectedRequestId: activeRequestResult ? requestId : requestCorrectionOf ?? "new",
      onSelectRetained: selectRetainedProvisioningRequest,
    },
    lifecycle: {
      executionAvailable: consoleRuntimeCapabilityExecutable(consoleRuntime, "repository-lifecycle", "mutation"),
      close: () => setLifecycleRepositoryId(null),
      custodyResult: lifecycleRepository
        ? repositoryCustodyHistoryForRecord(lifecycleRepository, allCustodyResults)
          .filter(result => result.status === "succeeded" && result.request.requested_custody.workspace_owner_ref === lifecycleRepository.custody?.workspaceOwnerRef).at(-1)
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
