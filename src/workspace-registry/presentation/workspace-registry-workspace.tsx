"use client";
import { useWorkspaceViewState } from "../../console-integration/registers/workspace-view-state.ts";
import {useRegisterPageSize} from "../../console-integration/registers/use-register-page-size.ts";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConsoleEntryIntent } from "../../console-architecture";

import {
  TerasFullscreenSurfaceFrame,
  TerasActionButton,
  TerasModalShell,
  TerasSurfaceNav,
  TerasSurfaceNavButton,
  TerasSurfaceSummaryHeader,
} from "@/teras";

import { workspaceRegistryFixture } from "../fixtures/workspace-registry.fixture";
import { useWorkspaceRegistryLiveRuntime } from "../live-runtime/use-workspace-registry-live-runtime";
import { useWorkspaceContinuityRuntime } from "../../workspace-continuity/live-runtime/use-workspace-continuity-runtime";
import { reconcileWorkspaceRegistryContinuity } from "../../workspace-continuity/workspace-registry-continuity";
import type {
  WorkspaceRegistryTarget,
  WorkspaceRegistryRecord,
  WorkspaceRegistrySnapshot,
  WorkspaceRegistryCandidate,
} from "../model/workspace-registry-types";
import { WorkspaceRegistryLifecycleWorkflow } from "./workspace-registry-lifecycle-workflow";
import { WorkspaceRegistryPromotionWorkflow } from "./workspace-registry-promotion-workflow";
import { WorkspaceRegistrySurface } from "./workspace-registry-surface";
import { WorkspaceRegistryIntakeDialog } from "./workspace-registry-intake-dialog";
import {
  consoleActionExecutable,
  resolveConsoleFixtureIsolation,
} from "../../console-integration/fixture-isolation/console-fixture-isolation";

type RegistryView = "eligible" | "registry";

export function WorkspaceRegistryWorkspace({
  consoleDevMode,
  entryIntent = null,
  onClose,
}: {
  consoleDevMode: boolean;
  entryIntent?: ConsoleEntryIntent | null;
  onClose: () => void;
}) {
  const runtime = useWorkspaceRegistryLiveRuntime();
  const continuity = useWorkspaceContinuityRuntime();
  const {pageSize}=useRegisterPageSize("Workspace Registry");
  const [view, setView] = useWorkspaceViewState<RegistryView>('registry:view', "registry");
  const [query, setQuery] = useWorkspaceViewState('registry:query', "");
  const [pageHistory, setPageHistory] = useState<readonly (string | null)[]>([null]);
  const after = pageHistory.at(-1) ?? null;
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeProviderId, setIntakeProviderId] = useState<string | null>(null);
  const [promotionTarget, setPromotionTarget] =
    useState<WorkspaceRegistryTarget | null>(null);
  const reviewedPromotionCandidate = useRef<WorkspaceRegistryCandidate | null>(null);
  const [lifecycleRecord, setLifecycleRecord] =
    useState<WorkspaceRegistryRecord | null>(null);
  const retainedSnapshot = useRef<WorkspaceRegistrySnapshot | null>(null);
  const refreshInFlight = useRef<{ key: string; promise: Promise<boolean> } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const appliedEntryIntentRef = useRef<string | null>(null);
  const reconciliation = useMemo(() => {
    if (!continuity.projection || !runtime.snapshot) {
      return { error: null, snapshot: null };
    }
    try {
      return {
        error: null,
        snapshot: reconcileWorkspaceRegistryContinuity(
          continuity.projection,
          runtime.snapshot,
        ),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Registry continuity is contradictory.",
        snapshot: null,
      };
    }
  }, [continuity.projection, runtime.snapshot]);
  const combinedMode =
    continuity.mode === "loading" || runtime.mode === "loading"
      ? null
      : continuity.mode === "live" && runtime.mode === "live" && reconciliation.snapshot
        ? "live"
        : continuity.mode === "disconnected-preview" &&
            runtime.mode === "disconnected-preview"
          ? "disconnected-preview"
          : "unavailable";
  const fixtureIsolation = resolveConsoleFixtureIsolation({
    mode: combinedMode,
    status:
      combinedMode === null
        ? "loading"
        : combinedMode === "unavailable"
          ? "unavailable"
          : "current",
  });
  const fixtureMode = consoleDevMode && fixtureIsolation.fixtureAllowed;
  const liveActionExecutable = consoleActionExecutable(
    fixtureIsolation,
    "durable-command",
  );
  const currentSnapshot = fixtureMode
    ? workspaceRegistryFixture
    : liveActionExecutable
      ? reconciliation.snapshot
      : null;
  useEffect(() => {
    if (currentSnapshot && !fixtureMode) retainedSnapshot.current = currentSnapshot;
  }, [currentSnapshot, fixtureMode]);
  const snapshot = currentSnapshot ?? retainedSnapshot.current;
  const retained = Boolean(snapshot && !currentSnapshot);
  const availabilityError = reconciliation.error ?? continuity.error?.message ?? runtime.error?.message ?? null;
  const scope = view === "registry" ? "inventory" : "eligible";
  useEffect(()=>setPageHistory([null]),[pageSize]);
  const instancePage = snapshot?.workflow_id === "workspace-registry-view" ? snapshot.instance_page : null;
  const selectionCurrent = !instancePage || instancePage.selection.scope === scope && instancePage.selection.query === query.trim().toLowerCase() && instancePage.after === after;
  const owners = useMemo(
    () => snapshot?.records.filter((record) => record.kind === "repo").length ?? 0,
    [snapshot],
  );

  const refresh = useCallback((background = false): Promise<boolean> => {
    const key = JSON.stringify([scope, query.trim().toLowerCase(), after,pageSize]);
    if (!background) setRefreshing(true);
    if (refreshInFlight.current) return refreshInFlight.current.key === key ? refreshInFlight.current.promise : refreshInFlight.current.promise.then(() => refresh(background));
    const request = (async () => {
      try {
        const [owner, inventory] = await Promise.allSettled([continuity.load(), runtime.load({ scope, query: query.trim().toLowerCase(), after })]);
        if (owner.status !== "fulfilled" || inventory.status !== "fulfilled") return false;
        try { reconcileWorkspaceRegistryContinuity(owner.value, inventory.value); return true; }
        catch { return false; }
      } finally { refreshInFlight.current = null; setRefreshing(false); }
    })();
    refreshInFlight.current = { key, promise: request };
    return request;
  }, [continuity.load, runtime.load, scope, query, after,pageSize]);

  useEffect(() => {
    if (intakeOpen || promotionTarget || lifecycleRecord) return;
    const initial = window.setTimeout(() => void refresh(), 250);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !intakeOpen && !promotionTarget && !lifecycleRecord) void refresh(true);
    }, 15_000);
    const visible = () => { if (document.visibilityState === "visible" && !intakeOpen && !promotionTarget && !lifecycleRecord) void refresh(true); };
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [refresh, intakeOpen, promotionTarget, lifecycleRecord]);

  useEffect(() => {
    if (!entryIntent || !snapshot) return;
    if (entryIntent.requiredMoveRef === "workspace-registry.repository-onboarding" && /^[1-9][0-9]*$/.test(entryIntent.subjectRef)) {
      const key = `${entryIntent.subjectRef}:${entryIntent.requiredMoveRef}`;
      if (appliedEntryIntentRef.current !== key) { appliedEntryIntentRef.current = key; setIntakeProviderId(entryIntent.subjectRef); setIntakeOpen(true); }
      return;
    }
    const entryKey = `${entryIntent.subjectRef}:${entryIntent.requiredMoveRef}`;
    if (appliedEntryIntentRef.current === entryKey) return;
    const record = snapshot.records.find(
      (candidate) => candidate.kind === "product" && candidate.id === entryIntent.subjectRef,
    );
    if (!record) return;
    appliedEntryIntentRef.current = entryKey;
    setView("registry");
    setLifecycleRecord(record);
  }, [entryIntent, snapshot]);

  return (
    <>
      <TerasModalShell
        agentHost
        bodyLayout="fill"
        description="Manage registered repositories, products and components. Review approved items before activation."
        height="fill"
        kicker="Workspace Governance"
        onClose={onClose}
        surfaceId="workspace-registry-workspace"
        title="Workspace Registry"
        width="viewport"
      >
        <TerasFullscreenSurfaceFrame
          nav={
            <TerasSurfaceNav
              ariaLabel="Workspace Registry views"
              description="View inventory or activate approved items."
              kicker="Registry Nav"
              title="Inventory Views"
            >
              <TerasActionButton busy={refreshing} emphasis="secondary" disabled={refreshing}
                onClick={() => void refresh()}>{refreshing ? "Refreshing…" : "Refresh Registry"}</TerasActionButton>
              <TerasActionButton disabled={!snapshot || refreshing || (!fixtureMode && (!liveActionExecutable || retained))}
                onClick={() => { setIntakeProviderId(null); setIntakeOpen(true); }}>Onboard workspace item</TerasActionButton>
              <TerasSurfaceNavButton
                current={view === "registry"}
                kicker="01"
                meta={snapshot ? `${snapshot.records.length}${instancePage ? " loaded" : ""}` : "—"}
                onClick={() => { setView("registry"); setPageHistory([null]); }}
                title="Registry"
                tone="ok"
              />
              <TerasSurfaceNavButton
                current={view === "eligible"}
                kicker="02"
                meta={snapshot ? `${snapshot.eligible_promotions.length}${instancePage ? " loaded" : ""}` : "—"}
                onClick={() => { setView("eligible"); setPageHistory([null]); }}
                title="Eligible"
                tone="warn"
              />
            </TerasSurfaceNav>
          }
          summary={
            <TerasSurfaceSummaryHeader
              ariaLabel="Workspace Registry summary"
              metrics={[
                { id: "records", label: "Records", value: snapshot ? String(snapshot.records.length) : "—" },
                { id: "eligible", label: "Eligible", tone: "warn", value: snapshot ? String(snapshot.eligible_promotions.length) : "—" },
                { id: "owners", label: "Repos loaded", value: snapshot ? String(owners) : "—" },
              ]}
              statuses={[
                {
                  detail: instancePage ? "Retained Governance records and installation-private project records" : "Reconciled Workspace Governance reads through WGCF and OOS",
                  facts: [],
                  id: "source",
                  label: "Source",
                  stateLabel: fixtureMode
                    ? "Preview"
                    : retained ? "Retained" : snapshot
                      ? "Current"
                      : combinedMode === null
                        ? "Loading"
                        : "Unavailable",
                  tone: fixtureMode ? "info" : retained ? "warn" : snapshot ? "ok" : combinedMode === null ? "info" : "danger",
                },
                {
                  detail: "Workspace Governance policy",
                  facts: [],
                  id: "authority",
                  label: "Policy",
                  stateLabel: snapshot ? "Governance" : "Not read",
                  tone: snapshot ? "ok" : "warn",
                },
              ]}
              title={view === "registry" ? "Managed inventory" : "Items awaiting activation"}
              titleKicker="Registry Summary"
            />
          }
        >
          <WorkspaceRegistrySurface
            availabilityError={availabilityError}
            actionsCurrent={liveActionExecutable && !retained && !refreshing && selectionCurrent}
            retained={retained}
            fixtureMode={fixtureMode}
            onLifecycle={setLifecycleRecord}
            onPromote={candidate => { reviewedPromotionCandidate.current = candidate; setPromotionTarget(candidate.target); }}
            onPromotionHistory={record => { reviewedPromotionCandidate.current = null; setPromotionTarget({ kind: record.kind, name: record.name, record_id: record.id }); }}
            onRetry={() => void refresh()}
            query={query}
            onQueryChange={value => { setQuery(value); setPageHistory([null]); }}
            pageCurrent={selectionCurrent}
            pagePending={refreshing}
            canPreviousPage={pageHistory.length > 1}
            onPreviousPage={() => setPageHistory(current => current.slice(0, -1))}
            onNextPage={() => { if (instancePage?.next_after) setPageHistory(current => [...current, instancePage.next_after]); }}
            snapshot={snapshot}
            view={view}
          />
        </TerasFullscreenSurfaceFrame>
      </TerasModalShell>
      {intakeOpen && snapshot && (fixtureMode || (liveActionExecutable && !retained)) ? <WorkspaceRegistryIntakeDialog key={intakeProviderId ?? "new-onboarding"} snapshot={snapshot} fixtureMode={fixtureMode} initialProviderId={intakeProviderId}
        onActivateRepository={(name, route) => { setIntakeOpen(false); setView(route === "lifecycle" ? "registry" : "eligible"); setQuery(name); setPageHistory([null]); }}
        onClose={() => { setIntakeOpen(false); void refresh(); }} /> : null}
      {promotionTarget ? (
        <WorkspaceRegistryPromotionWorkflow
          key={promotionTarget.record_id}
          candidate={snapshot?.eligible_promotions.find(candidate => candidate.target.record_id === promotionTarget.record_id) ?? (runtime.result ? reviewedPromotionCandidate.current : null)}
          target={promotionTarget}
          fixtureMode={fixtureMode}
          onClose={() => {
            runtime.reset();
            reviewedPromotionCandidate.current = null;
            setPromotionTarget(null);
          }}
          runtime={runtime}
        />
      ) : null}
      {lifecycleRecord ? (
        <WorkspaceRegistryLifecycleWorkflow
          fixtureMode={fixtureMode}
          onClose={() => {
            runtime.reset();
            setLifecycleRecord(null);
          }}
          record={lifecycleRecord}
          onRefreshSource={refresh}
          runtime={runtime}
        />
      ) : null}
    </>
  );
}
