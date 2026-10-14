"use client";

import { useState } from "react";

import {
  TerasDraftCloseGuardDialog,
  TerasFullscreenSurfaceFrame,
  TerasModalShell,
  TerasSurfaceSummaryHeader,
  type TerasSurfaceStatusItem,
  type TerasSurfaceSummaryMetric,
} from "@/teras";
import type { ConsoleEntryIntent } from "../../../console-architecture";

import type { DevIntegrationProfileHistoryEvent } from "../../model/dev-integration-profile-history";
import type { DevIntegrationProfile } from "../../model/dev-integration-profile";
import type { ProductReleaseCapability } from "../../model/product-release-capability";
import { buildEnvironmentLifecycleSummary } from "../../read-model/environment-lifecycle-summary";
import { useEnvironmentLifecycleRuntime } from "../../state/use-environment-lifecycle-runtime";
import { usePlatformOperationsRuntime } from "../../live-runtime/use-platform-operations-runtime";
import type { PlatformOperationsLiveSnapshot } from "../../live-runtime/platform-operation-types";
import { projectPlatformRuntimeReadiness } from "../../read-model/platform-runtime-readiness";
import { PlatformOperationHistory, PlatformOperationsLiveSurface } from "../live/platform-operations-live-surface";
import { DevIntegrationSurface } from "../dev-integration/dev-integration-surface";
import { GovernedReleasesSurface } from "../governed-releases/governed-releases-surface";

type EnvironmentLifecycleWorkspaceId =
  | "dev-integration"
  | "governed-releases";

const workspaceCopy: Record<
  EnvironmentLifecycleWorkspaceId,
  Readonly<{
    description: string;
    kicker: string;
    summaryTitle: string;
    title: string;
  }>
> = {
  "dev-integration": {
    description:
      "Request and operate local integration profiles, runtime observations, and stage handoff evidence.",
    kicker: "Environment",
    summaryTitle: "Profile State",
    title: "Dev Integration",
  },
  "governed-releases": {
    description:
      "Inspect each product's highest real endpoint and run only supported governed release operations.",
    kicker: "Environment",
    summaryTitle: "Release Capability",
    title: "Governed Releases",
  },
};

function buildWorkspaceMetrics(
  activeWorkspaceId: EnvironmentLifecycleWorkspaceId,
  profiles: readonly DevIntegrationProfile[],
  products: readonly ProductReleaseCapability[],
  liveSnapshot: PlatformOperationsLiveSnapshot,
): TerasSurfaceSummaryMetric[] {
  if (liveSnapshot.mode !== "disconnected-preview") {
    const readiness = projectPlatformRuntimeReadiness(liveSnapshot, new Date(), activeWorkspaceId === "dev-integration"
      ? ["dev-integration-profile", "profile-request"]
      : ["product-release", "product-runtime-lifecycle"]);
    const subjects = liveSnapshot.catalog?.subjects ?? [];
    const selected = subjects.filter((subject) =>
      activeWorkspaceId === "dev-integration"
        ? subject.kind === "dev-integration-profile" || subject.kind === "profile-request"
        : subject.kind === "product-release" || subject.kind === "product-runtime-lifecycle",
    );
    const operations = liveSnapshot.operations.filter((operation) =>
      selected.some((subject) => subject.ref === operation.command.subject.ref),
    );
    return [
      { id: "subjects", label: "Live Subjects", value: String(selected.length) },
      { id: "available", label: "Executable", tone: readiness.actionable ? "ok" : "warn", value: readiness.actionable ? String(selected.flatMap((subject) => subject.capabilities).filter((capability) => capability.available).length) : "0" },
      { id: "operations", label: "Operations", tone: "info", value: String(operations.length) },
    ];
  }
  const summary = buildEnvironmentLifecycleSummary(profiles, products);

  return activeWorkspaceId === "dev-integration"
    ? [
        {
          id: "profiles",
          label: "Profiles",
          value: String(summary.devIntegration.profiles),
        },
        {
          id: "active",
          label: "Active",
          tone: "ok",
          value: String(summary.devIntegration.activeProfiles),
        },
        {
          id: "running",
          label: "Running",
          tone: "info",
          value: String(summary.devIntegration.runningProfiles),
        },
      ]
    : [
        {
          id: "products",
          label: "Products",
          value: String(summary.governedReleases.products),
        },
        {
          id: "stage",
          label: "Stage",
          tone: "ok",
          value: String(summary.governedReleases.stageSupported),
        },
        {
          id: "production",
          label: "Production",
          tone: "info",
          value: String(summary.governedReleases.productionSupported),
        },
      ];
}

function buildWorkspaceStatuses(
  activeWorkspaceId: EnvironmentLifecycleWorkspaceId,
  snapshot: PlatformOperationsLiveSnapshot,
): TerasSurfaceStatusItem[] {
  if (snapshot.mode !== "disconnected-preview") {
    const readiness = projectPlatformRuntimeReadiness(snapshot, new Date(), activeWorkspaceId === "dev-integration"
      ? ["dev-integration-profile", "profile-request"]
      : ["product-release", "product-runtime-lifecycle"]);
    return [
      {
        detail: readiness.ready
          ? "Current subjects and capability availability come from the OOS Platform-operation catalog."
          : readiness.detail,
        facts: [], id: "source", label: "Projection",
        stateLabel: readiness.label,
        tone: readiness.tone,
      },
      {
        detail: readiness.actionable
          ? "Commands, reconciliation, controls, exact next action, and receipts remain OOS-owned."
          : `Durable actions are disabled. ${readiness.nextAction.authority}: ${readiness.nextAction.reason}`,
        facts: [], id: "execution", label: "Execution",
        stateLabel: readiness.actionable ? "Durable" : readiness.operationState,
        tone: readiness.actionable ? "info" : "warn",
      },
    ];
  }
  return [
    {
      detail:
        activeWorkspaceId === "dev-integration"
          ? "Structured profile fixtures project lifecycle and runtime observation independently."
          : "Structured product fixtures preserve each product's declared release ceiling.",
      facts: [],
      id: "source",
      label: "Projection",
      stateLabel: "Available",
      tone: "ok",
    },
    {
      detail:
        "Commands execute only through the prototype-local environment runtime.",
      facts: [],
      id: "execution",
      label: "Execution",
      stateLabel: "Local",
      tone: "info",
    },
  ];
}

export function EnvironmentLifecycleWorkspace({
  activeWorkspaceId,
  entryIntent,
  onClose,
  profileHistory,
  products,
  profiles,
}: {
  activeWorkspaceId: EnvironmentLifecycleWorkspaceId;
  entryIntent?: ConsoleEntryIntent | null;
  onClose: () => void;
  profileHistory: readonly DevIntegrationProfileHistoryEvent[];
  products: readonly ProductReleaseCapability[];
  profiles: readonly DevIntegrationProfile[];
}) {
  const [dirty, setDirty] = useState(false);
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const runtime = useEnvironmentLifecycleRuntime({ products, profiles });
  const liveRuntime = usePlatformOperationsRuntime();
  const effectiveProfiles = runtime.snapshot.effective.profiles;
  const effectiveProducts = runtime.snapshot.effective.products;
  const copy = workspaceCopy[activeWorkspaceId];
  const metrics = buildWorkspaceMetrics(
    activeWorkspaceId,
    effectiveProfiles,
    effectiveProducts,
    liveRuntime.snapshot,
  );

  function requestClose() {
    if (dirty) {
      setCloseGuardOpen(true);
      return;
    }

    onClose();
  }

  function discardDraftAndClose() {
    setDirty(false);
    setCloseGuardOpen(false);
    onClose();
  }

  return (
    <>
      <TerasModalShell
        bodyLayout="fill"
        description={copy.description}
        height="fill"
        kicker={copy.kicker}
        onClose={requestClose}
        surfaceId={`${activeWorkspaceId}-workspace`}
        title={copy.title}
        width="viewport"
      >
        <TerasFullscreenSurfaceFrame
          data-environment-workspace={activeWorkspaceId}
          summary={
            <TerasSurfaceSummaryHeader
              ariaLabel={`${copy.title} summary`}
              metricSlots={3}
              metrics={metrics}
              statuses={buildWorkspaceStatuses(activeWorkspaceId, liveRuntime.snapshot)}
              title={copy.summaryTitle}
              titleKicker="Environment Summary"
            />
          }
        >
          {liveRuntime.snapshot.mode !== "disconnected-preview" ? (
            <>
              <PlatformOperationsLiveSurface
                kind={activeWorkspaceId}
                onControl={liveRuntime.control}
                onRefresh={liveRuntime.load}
                onSubmit={liveRuntime.submit}
                snapshot={liveRuntime.snapshot}
              />
              <PlatformOperationHistory
                onControl={liveRuntime.control}
                operations={liveRuntime.snapshot.operations}
              />
            </>
          ) : activeWorkspaceId === "dev-integration" ? (
            <DevIntegrationSurface
              focusProfileId={entryIntent?.subjectRef ?? null}
              historyEvents={profileHistory}
              onDirtyChange={setDirty}
              profiles={effectiveProfiles}
              runtime={runtime}
            />
          ) : (
            <GovernedReleasesSurface
              focusProductId={entryIntent?.subjectRef ?? null}
              onDirtyChange={setDirty}
              products={effectiveProducts}
              runtime={runtime}
            />
          )}
        </TerasFullscreenSurfaceFrame>
      </TerasModalShell>
      <TerasDraftCloseGuardDialog
        description="The active workflow contains local changes that have not been submitted."
        kicker="Unsaved Environment Draft"
        leaveLabel="Discard Draft"
        onKeepEditing={() => setCloseGuardOpen(false)}
        onLeave={discardDraftAndClose}
        open={closeGuardOpen}
        title={`Leave ${copy.title}?`}
      />
    </>
  );
}
