"use client";
import { useWorkspaceViewState } from "../../../console-integration/registers/workspace-view-state.ts";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { DevIntegrationProfilesRuntime } from "../../live-runtime/use-dev-integration-profiles.ts";
import { requestOptionsFromOwner } from "../../live-runtime/dev-integration-profile-contract.ts";
import { devIntegrationRequestOptions } from "../../fixtures/dev-integration-request-options.fixture.ts";

import {
  TerasActionButton,
  TerasDialog,
  TerasEmptyState,
  TerasFilterBar,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasRecordControlActionPanel,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasRegisterPagination,
  TerasLoadingState,
  TerasStatusPill,
  TerasTimeline,
  TerasTimelineItem,
  TerasZone,
  TerasZoneLayout,
  type TerasTone,
} from "@/teras";
import type {
  DevIntegrationProfileHistoryEvent,
} from "../../model/dev-integration-profile-history.ts";
import type {
  DevIntegrationLaneClass,
  DevIntegrationProfile,
  DevIntegrationProfileLifecycle,
} from "../../model/dev-integration-profile.ts";
import type {
  DevIntegrationProfileRequest as DevIntegrationProfileRequestRecord,
} from "../../model/dev-integration-profile-request.ts";
import type {
  EnvironmentLifecycleOperation,
  EnvironmentLifecycleOperationReceipt,
} from "../../model/environment-lifecycle-command.ts";
import {
  environmentLifecycleOperationLabel,
} from "../../read-model/environment-lifecycle-operation-selectors.ts";
import {
  filterDevIntegrationProfiles,
  selectDevIntegrationProfileById,
  type DevIntegrationProfileFilters,
} from "../../read-model/dev-integration-profile-selectors.ts";
import {
  DevIntegrationProfileDashboard,
} from "./dev-integration-profile-dashboard.tsx";
import {
  formatDevIntegrationObservedAt,
} from "./dev-integration-formatters.ts";
import {
  devIntegrationLaneLabels,
  devIntegrationLifecycleLabels,
  devIntegrationLifecycleTones,
  devIntegrationRuntimeLabels,
  devIntegrationRuntimeTones,
} from "./dev-integration-labels.ts";
import {
  DevIntegrationProfileRequest,
} from "./dev-integration-profile-request.tsx";
import type {
  EnvironmentLifecycleRuntimeController,
} from "../../state/use-environment-lifecycle-runtime.ts";
import {
  environmentProfileSubjectRef,
} from "../../work-model/commands/environment-lifecycle-command-factory.ts";
import {
  DevIntegrationSelectedProfile,
} from "./register/dev-integration-selected-profile.tsx";
import {
  DevIntegrationRegisterTable,
} from "./register/dev-integration-register-table.tsx";

type DevIntegrationSurfaceMode =
  | "dashboard"
  | "history"
  | "register"
  | "request";

const initialFilters: DevIntegrationProfileFilters = {
  laneClass: "all",
  lifecycle: "all",
  ownerRepo: "all",
  query: "",
};

const operationStateTones: Readonly<
  Record<EnvironmentLifecycleOperation["state"], TerasTone>
> = {
  cancelled: "muted",
  failed: "danger",
  queued: "info",
  requested: "info",
  running: "warn",
  succeeded: "ok",
};

function ProfileHistory({
  events,
  onBack,
  operations,
  profile,
  receipts,
}: {
  events: readonly DevIntegrationProfileHistoryEvent[];
  onBack: () => void;
  operations: readonly EnvironmentLifecycleOperation[];
  profile: DevIntegrationProfile;
  receipts: readonly EnvironmentLifecycleOperationReceipt[];
}) {
  const profileEvents = events
    .filter((event) => event.profileId === profile.profileId)
    .sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt),
    );
  const operationEvents = operations
    .filter(
      (operation) =>
        operation.subjectRef ===
        environmentProfileSubjectRef(profile.profileId),
    )
    .map((operation) => {
      const receipt =
        receipts.find(
          (candidate) =>
            candidate.operationId === operation.operationId,
        ) ?? null;
      const stateLabel =
        operation.state.charAt(0).toUpperCase() +
        operation.state.slice(1);

      return {
        detail:
          operation.failureDetail ??
          operation.events[operation.events.length - 1]?.summary ??
          "Operation recorded.",
        id: operation.operationId,
        label: environmentLifecycleOperationLabel(operation),
        occurredAt: operation.completedAt ?? operation.requestedAt,
        sourceRef: receipt?.receiptRef ?? "receipt pending",
        status: stateLabel,
        tone: operationStateTones[operation.state],
      };
    });
  const timelineItems = [
    ...profileEvents.map((event) => ({
      detail: `${event.detail} Source: ${event.sourceRef}.`,
      id: event.eventId,
      label: event.label,
      occurredAt: event.occurredAt,
      sourceRef: event.sourceRef,
      status:
        event.kind.charAt(0).toUpperCase() + event.kind.slice(1),
      tone: "info" as const,
    })),
    ...operationEvents,
  ]
    .sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt),
    );

  return (
    <TerasDialog
      closeLabel="Close Dev Integration profile history"
      contentOverflow="hidden"
      description="Design preview — Authority-shaped lifecycle, runtime, and handoff events for this profile."
      height="fill"
      kicker="Profile History"
      onClose={onBack}
      open
      title="Dev Integration Profile History"
      width="large"
    >
      <TerasZoneLayout variant="main-aside">
        <TerasZone fit="fill">
          <TerasPanel spacing="normal"
            fit="fill"
            frame="padded"
            overflow="hidden"
            treatment="neutral"
          >
            <TerasPanelHeader
              actions={
                <TerasStatusPill tone="info">
                  {timelineItems.length} events
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description="Newest recorded event appears first."
              kicker="Event Timeline"
              title="Profile events"
            />
            {timelineItems.length > 0 ? (
              <TerasTimeline ariaLabel="Dev Integration profile events">
                {timelineItems.map((item) => (
                  <TerasTimelineItem
                    detail={item.detail}
                    displayTimestamp={formatDevIntegrationObservedAt(
                      item.occurredAt,
                    )}
                    key={item.id}
                    label={item.label}
                    status={item.status}
                    timestamp={item.occurredAt}
                    tone={item.tone}
                  />
                ))}
              </TerasTimeline>
            ) : (
              <TerasEmptyState fill>
                Prototype-local proposed requests have no authority history.
              </TerasEmptyState>
            )}
          </TerasPanel>
        </TerasZone>
        <TerasZone fit="content">
          <TerasPanel
            fit="content"
            frame="padded"
            tone={devIntegrationLifecycleTones[profile.lifecycle]}
            treatment="rail"
          >
            <TerasPanelHeader
              description="Stable context for the event trail currently under review."
              kicker="Profile Record"
              statusLabel={devIntegrationLifecycleLabels[profile.lifecycle]}
              statusTone={devIntegrationLifecycleTones[profile.lifecycle]}
              title={profile.profileId}
            />
            <TerasMetadataList
              columns={1}
              items={[
                {
                  label: "Runtime",
                  tone:
                    devIntegrationRuntimeTones[
                      profile.runtime.observation.state
                    ],
                  value:
                    devIntegrationRuntimeLabels[
                      profile.runtime.observation.state
                    ],
                },
                {
                  detail: profile.source.provenance,
                  label: "Source",
                  value: profile.source.source,
                },
                {
                  label: "Events",
                  value: String(timelineItems.length),
                },
              ]}
              topOffset="compact"
            />
          </TerasPanel>
        </TerasZone>
      </TerasZoneLayout>
    </TerasDialog>
  );
}

export function DevIntegrationSurface({
  live,
  focusProfileId = null,
  historyEvents,
  onDirtyChange,
  profiles,
  runtime,
}: {
  live?: { runtime: DevIntegrationProfilesRuntime;
    controls: (profileId: string, tab: "runtime" | "handoff") => ReactNode;
    history: (profileId: string) => ReactNode };
  focusProfileId?: string | null;
  historyEvents: readonly DevIntegrationProfileHistoryEvent[];
  onDirtyChange: (dirty: boolean) => void;
  profiles: readonly DevIntegrationProfile[];
  runtime?: EnvironmentLifecycleRuntimeController;
}) {
  const [localFilters, setLocalFilters] =
    useWorkspaceViewState<DevIntegrationProfileFilters>('dev-integration-view:localFilters', initialFilters);
  const filters = live?.runtime.filters ?? localFilters;
  const setFilters = live?.runtime.setFilters ?? setLocalFilters;
  const [mode, setMode] =
    useState<DevIntegrationSurfaceMode>("register");
  const [selectedProfileId, setSelectedProfileId] =
    useWorkspaceViewState<string | null>('dev-integration-view:selectedProfileId', profiles[0]?.profileId ?? null);
  const filteredProfiles = useMemo(
    () => filterDevIntegrationProfiles(profiles, filters),
    [filters, profiles],
  );
  const selectedProfile = selectedProfileId
    ? selectDevIntegrationProfileById(profiles, selectedProfileId)
    : null;
  const selectedRegisterProfile =
    filteredProfiles.find(
      (profile) => profile.profileId === selectedProfileId,
    ) ??
    filteredProfiles[0] ??
    null;
  const ownerOptions = useMemo(
    () => [...new Set(profiles.map((profile) => profile.ownerRepo))].sort(),
    [profiles],
  );

  useEffect(() => {
    if (
      !focusProfileId ||
      !profiles.some((profile) => profile.profileId === focusProfileId)
    ) {
      return;
    }

    setFilters(initialFilters);
    setMode("register");
    setSelectedProfileId(focusProfileId);
  }, [focusProfileId, profiles]);

  function openProfileDashboard(profileId: string) {
    setSelectedProfileId(profileId);
    setMode("dashboard");
  }

  async function handleRequestSubmitted(
    request: DevIntegrationProfileRequestRecord,
  ) {
    if (!runtime) throw new Error("The simulated request adapter is unavailable in live mode.");
    return runtime.submitProfileRequest(request);
  }

  function completeProfileRequest(profileId: string) {
    setSelectedProfileId(profileId);
    setMode("dashboard");
  }

  return (
    <>
      <TerasRecordControlLayout
        composition="fullscreen-register"
        mode="register-selected"
        register={
          <TerasRegisterPanel
            footer={live ? <TerasRegisterPagination label="Dev Integration profiles" offset={live.runtime.offset} count={profiles.length} total={live.runtime.projection?.page.total} page={Math.floor(live.runtime.offset/live.runtime.pageSize)+1}
              pending={live.runtime.loading} unavailable={Boolean(live.runtime.error)} hasPrevious={live.runtime.offset>0} hasNext={live.runtime.current && live.runtime.projection?.page.next_offset!=null}
              onReset={live.runtime.error?live.runtime.first:undefined} onPrevious={live.runtime.previous} onNext={()=>void live.runtime.next()} /> : undefined}
            description="Profile lifecycle and runtime observation remain separate."
            filterBar={
              <TerasFilterBar
                filters={[
                  {
                    label: "Lifecycle",
                    onValueChange: (lifecycle) =>
                      setFilters((current) => ({
                        ...current,
                        lifecycle:
                          lifecycle as DevIntegrationProfileLifecycle | "all",
                      })),
                    options: [
                      { label: "All lifecycle", value: "all" },
                      ...Object.entries(devIntegrationLifecycleLabels).map(
                        ([value, label]) => ({ label, value }),
                      ),
                    ],
                    value: filters.lifecycle,
                  },
                  {
                    label: "Lane",
                    onValueChange: (laneClass) =>
                      setFilters((current) => ({
                        ...current,
                        laneClass:
                          laneClass as DevIntegrationLaneClass | "all",
                      })),
                    options: [
                      { label: "All lanes", value: "all" },
                      ...Object.entries(devIntegrationLaneLabels).map(
                        ([value, label]) => ({ label, value }),
                      ),
                    ],
                    value: filters.laneClass,
                  },
                  {
                    label: "Implementation repository",
                    onValueChange: (ownerRepo) =>
                      setFilters((current) => ({ ...current, ownerRepo })),
                    options: [
                      { label: "All implementation repositories", value: "all" },
                      ...ownerOptions.map((owner) => ({
                        label: owner,
                        value: owner,
                      })),
                    ],
                    value: filters.ownerRepo,
                  },
                ]}
                search={{
                  ariaLabel: "Search Dev Integration profiles",
                  onValueChange: (query) =>
                    setFilters((current) => ({ ...current, query })),
                  placeholder:
                    "Search profile, purpose, or implementation repository...",
                  value: filters.query,
                }}
              />
            }
            kicker="Dev Integration"
            statusLabel={live ? `${profiles.length} of ${live.runtime.projection?.page.total ?? 0} matching` : `${filteredProfiles.length}/${profiles.length} shown`}
            statusTone="info"
            title="Profile Register"
          >
            {live?.runtime.loading ? <TerasLoadingState fill label="Loading matching profiles…" /> : filteredProfiles.length > 0 ? (
              <DevIntegrationRegisterTable
                onInspect={(profile) =>
                  openProfileDashboard(profile.profileId)
                }
                onSelect={(profile) =>
                  setSelectedProfileId(profile.profileId)
                }
                profiles={filteredProfiles}
                selectedProfileId={selectedRegisterProfile?.profileId ?? null}
              />
            ) : (
              <TerasEmptyState fill>
                No profiles match the current search and filters.
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
          <TerasZone fit="content" spacing="compact">
            <TerasRecordControlActionPanel
              action={
                <TerasActionButton
                  disabled={Boolean(live && (!live.runtime.current || live.runtime.pendingId()))}
                  onClick={() => {
                    onDirtyChange(false);
                    setMode("request");
                  }}
                >
                  <Plus aria-hidden="true" size={15} />
                  Request Profile
                </TerasActionButton>
              }
              boundary="Submission records a proposed profile for implementation review. It does not admit the profile or launch a runtime."
              boundaryKicker="Request Boundary"
              description="Define a local integration profile and its runtime contract."
              kicker="Profile Ingress"
              title="Request a profile"
              tone="info"
            />
            <DevIntegrationSelectedProfile
              onOpenDashboard={(profile) =>
                openProfileDashboard(profile.profileId)
              }
              profile={selectedRegisterProfile}
            />
          </TerasZone>
        }
      />
      {mode === "request" && (!live || live.runtime.projection) ? (
        <DevIntegrationProfileRequest
          options={live ? requestOptionsFromOwner(live.runtime.projection!) : devIntegrationRequestOptions}
          live={live?.runtime.projection ? { current: live.runtime.current, sourceVersion: live.runtime.projection.source_version,
            submit: live.runtime.submit, read: live.runtime.read, pendingId: live.runtime.pendingId } : undefined}
          existingProfiles={profiles}
          onBack={() => setMode("register")}
          onCompleted={completeProfileRequest}
          onDirtyChange={onDirtyChange}
          onRetryOperation={runtime?.retryOperation ?? (async () => {throw new Error("Use the original service operation controls.");})}
          onSubmitted={handleRequestSubmitted}
          operations={runtime?.snapshot.operations ?? []}
          receipts={runtime?.snapshot.receipts ?? []}
        />
      ) : null}
      {selectedProfile &&
      (mode === "dashboard" || mode === "history") ? (
        <DevIntegrationProfileDashboard
          connected={Boolean(live)}
          sourceCurrent={live?.runtime.current}
          runtimeControls={live?.controls(selectedProfile.profileId, "runtime")}
          handoffControls={live?.controls(selectedProfile.profileId, "handoff")}
          onBack={() => setMode("register")}
          onOpenHistory={() => setMode("history")}
          onRetryOperation={runtime?.retryOperation ?? (async () => {throw new Error("Use the original service operation controls.");})}
          onSubmitProfileAction={runtime?.submitProfileAction ?? (async () => {throw new Error("Use the native service operation controls.");})}
          operations={runtime?.snapshot.operations ?? []}
          profile={selectedProfile}
          receipts={runtime?.snapshot.receipts ?? []}
        />
      ) : null}
      {selectedProfile && mode === "history" && !live ? (
        <ProfileHistory
          events={historyEvents}
          onBack={() => setMode("dashboard")}
          operations={runtime?.snapshot.operations ?? []}
          profile={selectedProfile}
          receipts={runtime?.snapshot.receipts ?? []}
        />
      ) : null}
      {selectedProfile && mode === "history" && live ? <TerasDialog open title="Profile operation history"
        kicker={selectedProfile.profileId} description="Loaded service operations for this profile. This does not invent missing admission or lifetime audit events."
        width="large" height="fill" contentOverflow="auto" onClose={() => setMode("dashboard")}>{live.history(selectedProfile.profileId)}</TerasDialog> : null}
    </>
  );
}
