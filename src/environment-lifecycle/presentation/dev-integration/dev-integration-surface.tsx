"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
      description="Authority-shaped lifecycle, runtime, and handoff events for this profile."
      height="fill"
      kicker="Profile History"
      onClose={onBack}
      open
      title="Dev Integration Profile History"
      width="large"
    >
      <TerasZoneLayout variant="main-aside">
        <TerasZone fit="fill">
          <TerasPanel
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
  focusProfileId = null,
  historyEvents,
  onDirtyChange,
  profiles,
  runtime,
}: {
  focusProfileId?: string | null;
  historyEvents: readonly DevIntegrationProfileHistoryEvent[];
  onDirtyChange: (dirty: boolean) => void;
  profiles: readonly DevIntegrationProfile[];
  runtime: EnvironmentLifecycleRuntimeController;
}) {
  const [filters, setFilters] =
    useState<DevIntegrationProfileFilters>(initialFilters);
  const [mode, setMode] =
    useState<DevIntegrationSurfaceMode>("register");
  const [selectedProfileId, setSelectedProfileId] =
    useState<string | null>(profiles[0]?.profileId ?? null);
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
                    label: "Owner",
                    onValueChange: (ownerRepo) =>
                      setFilters((current) => ({ ...current, ownerRepo })),
                    options: [
                      { label: "All owners", value: "all" },
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
                    "Search profile, owner, purpose, or repository...",
                  value: filters.query,
                }}
              />
            }
            kicker="Dev Integration"
            statusLabel={`${filteredProfiles.length}/${profiles.length} shown`}
            statusTone="info"
            title="Profile Register"
          >
            {filteredProfiles.length > 0 ? (
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
                  onClick={() => {
                    onDirtyChange(false);
                    setMode("request");
                  }}
                >
                  <Plus aria-hidden="true" size={15} />
                  Request Profile
                </TerasActionButton>
              }
              boundary="Submission records a proposed profile for owner review. It does not admit the profile or launch a runtime."
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
      {mode === "request" ? (
        <DevIntegrationProfileRequest
          existingProfiles={profiles}
          onBack={() => setMode("register")}
          onCompleted={completeProfileRequest}
          onDirtyChange={onDirtyChange}
          onRetryOperation={runtime.retryOperation}
          onSubmitted={handleRequestSubmitted}
          operations={runtime.snapshot.operations}
          receipts={runtime.snapshot.receipts}
        />
      ) : null}
      {selectedProfile &&
      (mode === "dashboard" || mode === "history") ? (
        <DevIntegrationProfileDashboard
          onBack={() => setMode("register")}
          onOpenHistory={() => setMode("history")}
          onRetryOperation={runtime.retryOperation}
          onSubmitProfileAction={runtime.submitProfileAction}
          operations={runtime.snapshot.operations}
          profile={selectedProfile}
          receipts={runtime.snapshot.receipts}
        />
      ) : null}
      {selectedProfile && mode === "history" ? (
        <ProfileHistory
          events={historyEvents}
          onBack={() => setMode("dashboard")}
          operations={runtime.snapshot.operations}
          profile={selectedProfile}
          receipts={runtime.snapshot.receipts}
        />
      ) : null}
    </>
  );
}
