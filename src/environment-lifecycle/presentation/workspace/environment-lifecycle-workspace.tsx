"use client";

import { NativeReleaseActions } from "../governed-releases/native-release-actions.tsx";

import {useGovernedProducts} from "../../live-runtime/use-governed-products.ts";
import {toGovernedProduct} from "../../live-runtime/governed-product-mapper.ts";

import { useState } from "react";

import {
  TerasContentRegion,
  TerasLoadingState,
  TerasActionButton,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasDraftCloseGuardDialog,
  TerasFullscreenSurfaceFrame,
  TerasModalShell,
  TerasSurfaceSummaryHeader,
  type TerasSurfaceStatusItem,
  type TerasSurfaceSummaryMetric,
} from "@/teras";
import type { ConsoleEntryIntent } from "../../../console-architecture";
import { useDevIntegrationProfiles } from "../../live-runtime/use-dev-integration-profiles.ts";
import { toDevIntegrationProfile } from "../../live-runtime/dev-integration-profile-contract.ts";
import { DevIntegrationRequestHistory } from "../live/dev-integration-request-history.tsx";

import type { DevIntegrationProfileHistoryEvent } from "../../model/dev-integration-profile-history";
import type { DevIntegrationProfile } from "../../model/dev-integration-profile";
import type { ProductReleaseCapability } from "../../model/product-release-capability";
import { buildEnvironmentLifecycleSummary } from "../../read-model/environment-lifecycle-summary";
import { useEnvironmentLifecycleRuntime } from "../../state/use-environment-lifecycle-runtime";
import { usePlatformOperationsRuntime } from "../../live-runtime/use-platform-operations-runtime";
import type { PlatformOperationsLiveSnapshot } from "../../live-runtime/platform-operation-types";
import { platformActionContext, workspaceOperations } from "../../read-model/platform-operation-display.ts";
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
    const operations = workspaceOperations(liveSnapshot.operations, activeWorkspaceId);
    return [
      { id: "subjects", label: activeWorkspaceId === "dev-integration" ? "Profiles" : "Products", value: liveSnapshot.catalog ? String(selected.length) : "—" },
      { id: "available", label: "Executable", tone: readiness.actionable ? "ok" : "warn", value: !liveSnapshot.catalog ? "—" : readiness.actionable ? String(selected.flatMap((subject) => subject.capabilities).filter((capability) => capability.available && !platformActionContext(capability.action)).length) : "0" },
      { id: "operations", label: "Loaded ops", tone: "info", value: liveSnapshot.status === "current" || operations.length ? String(operations.length) : "—" },
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
        facts: [], id: "source", label: "Connection",
        stateLabel: snapshot.status === "current" && readiness.catalogState === "current" ? "Connected" : readiness.label,
        tone: readiness.tone,
      },
      {
        detail: readiness.actionable
          ? "Commands, reconciliation, controls, exact next action, and receipts remain OOS-owned."
          : `Durable actions are disabled. ${readiness.nextAction.authority}: ${readiness.nextAction.reason}`,
        facts: [], id: "execution", label: "Actions",
        stateLabel: readiness.actionable && (snapshot.catalog?.subjects.some(subject => (activeWorkspaceId === "dev-integration" ? ["dev-integration-profile", "profile-request"] : ["product-release", "product-runtime-lifecycle"]).includes(subject.kind) && subject.capabilities.some(capability => capability.available && !platformActionContext(capability.action)))) ? "Available" : "Unavailable",
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
      label: "Source",
      stateLabel: "Preview",
      tone: "info",
    },
    {
      detail:
        "Commands execute only through the prototype-local environment runtime.",
      facts: [],
      id: "execution",
      label: "Execution",
      stateLabel: "Simulated",
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
  const liveRuntime = usePlatformOperationsRuntime(activeWorkspaceId);
  const profileRuntime = useDevIntegrationProfiles(activeWorkspaceId === "dev-integration" && liveRuntime.snapshot.mode === "live");
  const productRuntime=useGovernedProducts(activeWorkspaceId==="governed-releases" && liveRuntime.snapshot.mode==="live");
  const ownerProducts=productRuntime.projection?.products.map(product=>toGovernedProduct(product,productRuntime.projection!))??[];
  const ownerProfiles = profileRuntime.projection?.profiles.map(profile => toDevIntegrationProfile(profile, profileRuntime.projection!)) ?? [];
  const effectiveProfiles = runtime.snapshot.effective.profiles;
  const effectiveProducts = runtime.snapshot.effective.products;
  const copy = workspaceCopy[activeWorkspaceId];
  const metrics = buildWorkspaceMetrics(
    activeWorkspaceId,
    effectiveProfiles,
    effectiveProducts,
    liveRuntime.snapshot,
  );
  if (activeWorkspaceId === "dev-integration" && profileRuntime.projection)
    metrics[0] = {id:"profiles",label:"Profiles",value:String(profileRuntime.projection.page.total)};

  if(activeWorkspaceId==="governed-releases" && productRuntime.projection)metrics[0]={id:"products",label:"Products",value:String(productRuntime.projection.page.total)};

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
        agentHost
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
            <TerasContentRegion fill gap="normal" scroll>
              {activeWorkspaceId === "governed-releases" && !productRuntime.projection && !productRuntime.error ? <TerasLoadingState fill label="Loading governed releases…" /> : activeWorkspaceId === "dev-integration" && !profileRuntime.projection && !profileRuntime.error ? <TerasLoadingState fill label="Loading integration profiles…" /> : activeWorkspaceId === "governed-releases" && productRuntime.projection ? <>
                <TerasPanel fit="content" frame="padded" treatment="neutral"><TerasPanelHeader kicker="Product source" title="Registered products" statusLabel={productRuntime.projection?.source_posture==="accepted-snapshot" ? "Accepted snapshot" : productRuntime.current ? "Current" : "Retained"} statusTone={productRuntime.current ? "info" : "warn"} description={productRuntime.error??productRuntime.projection?.source_notice??"Owner contracts and recorded release evidence. Protected workflows retain their own execution and approval."} actions={<TerasActionButton busy={productRuntime.loading} emphasis="secondary" onClick={()=>void productRuntime.load()}>Refresh products</TerasActionButton>}/></TerasPanel>
                <GovernedReleasesSurface products={ownerProducts} runtime={runtime} onDirtyChange={setDirty}
                  live={{runtime:productRuntime,actions:(product,onInspect)=><NativeReleaseActions product={product} current={productRuntime.current&&liveRuntime.snapshot.status==="current"} runtime={liveRuntime} onInspect={onInspect}/>,history:productId=><PlatformOperationHistory onRead={liveRuntime.read} onControl={liveRuntime.control} operations={liveRuntime.snapshot.operations.filter(operation=>operation.command.subject.ref===`product:${productId}`)} controlsAvailable={liveRuntime.snapshot.status==="current"}/>}}/>
              </> : activeWorkspaceId === "dev-integration" && profileRuntime.projection ? <>
                <TerasPanel fit="content" frame="padded" treatment="neutral"><TerasPanelHeader
                  kicker="Owner source" title="Dev Integration profiles" description={profileRuntime.error ?? "Canonical registry and committed profile contracts. Runtime observations retain independent freshness."}
                  statusLabel={profileRuntime.current ? "Current" : "Retained"} statusTone={profileRuntime.current ? "info" : "warn"}
                  actions={<TerasActionButton busy={profileRuntime.loading} emphasis="secondary" onClick={() => {void profileRuntime.load();void liveRuntime.load();}}>Refresh</TerasActionButton>}/></TerasPanel>
                <DevIntegrationSurface profiles={ownerProfiles} historyEvents={[]} onDirtyChange={setDirty}
                  focusProfileId={entryIntent?.subjectRef?.replace(/^profile:/, "") ?? null}
                  live={{runtime:profileRuntime,
                    controls:(profileId,tab) => <TerasPanelStack fill="last" scroll><PlatformOperationsLiveSurface controlsOnly kind="dev-integration"
                      selectedSubjectRef={`profile:${profileId}`} onControl={liveRuntime.control} onRefresh={liveRuntime.load}
                      onSubmit={liveRuntime.submit} snapshot={profileRuntime.current ? liveRuntime.snapshot : {...liveRuntime.snapshot,status:"degraded"}}
                      actionFilter={tab === "handoff" ? ["dev-integration.promote-check"] : ["dev-integration.start","dev-integration.status","dev-integration.access","dev-integration.smoke","dev-integration.stop","dev-integration.reset"]}/></TerasPanelStack>,
                    history:profileId => <PlatformOperationHistory onControl={liveRuntime.control} onRead={liveRuntime.read}
                      operations={liveRuntime.snapshot.operations.filter(operation => operation.command.subject.ref === `profile:${profileId}`)}
                      controlsAvailable={liveRuntime.snapshot.mode === "live" && liveRuntime.snapshot.status === "current"}/>}}/>
                <DevIntegrationRequestHistory runtime={profileRuntime}/>
              </> : <PlatformOperationsLiveSurface
                kind={activeWorkspaceId}
                focusRecordRef={entryIntent?.subjectRef}
                onControl={liveRuntime.control}
                onRefresh={liveRuntime.load}
                onSubmit={liveRuntime.submit}
                snapshot={liveRuntime.snapshot}
              />}
              {activeWorkspaceId==="governed-releases" && !productRuntime.projection && productRuntime.error ? <TerasPanel fit="content" frame="padded" treatment="neutral"><TerasPanelHeader kicker="Product readback" title="Product register unavailable" description={productRuntime.error??"Reading owner product contracts. The action catalog alone does not supply registered products."} actions={<TerasActionButton emphasis="secondary" onClick={()=>void productRuntime.load()}>Retry product read</TerasActionButton>}/></TerasPanel> : null}
              <PlatformOperationHistory
                loading={liveRuntime.snapshot.status === "loading"}
                onLoadMore={liveRuntime.loadMore}
                nextPageAvailable={Boolean(liveRuntime.snapshot.historyPage?.next_cursor)}
                onControl={liveRuntime.control}
                operations={workspaceOperations(liveRuntime.snapshot.operations, activeWorkspaceId)}
                onRead={liveRuntime.read}
                controlsAvailable={liveRuntime.snapshot.mode === "live" && liveRuntime.snapshot.status === "current"}
                focusRecordRef={entryIntent?.subjectRef}
              />
            </TerasContentRegion>
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
