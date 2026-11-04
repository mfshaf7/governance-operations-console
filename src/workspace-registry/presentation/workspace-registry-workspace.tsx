"use client";

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
  const [view, setView] = useState<RegistryView>("registry");
  const [query, setQuery] = useState("");
  const [pageHistory, setPageHistory] = useState<readonly (string | null)[]>([null]);
  const after = pageHistory.at(-1) ?? null;
  const [intakeOpen, setIntakeOpen] = useState(false);
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
  const instancePage = snapshot?.workflow_id === "workspace-registry-view" ? snapshot.instance_page : null;
  const selectionCurrent = !instancePage || instancePage.selection.scope === scope && instancePage.selection.query === query.trim().toLowerCase() && instancePage.after === after;
  const owners = useMemo(
    () => new Set(snapshot?.records.flatMap((record) => record.owner_refs) ?? []).size,
    [snapshot],
  );

  const refresh = useCallback((): Promise<boolean> => {
    const key = JSON.stringify([scope, query.trim().toLowerCase(), after]);
    if (refreshInFlight.current) return refreshInFlight.current.key === key ? refreshInFlight.current.promise : refreshInFlight.current.promise.then(() => refresh());
    setRefreshing(true);
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
  }, [continuity.load, runtime.load, scope, query, after]);

  useEffect(() => {
    if (intakeOpen || promotionTarget || lifecycleRecord) return;
    const initial = window.setTimeout(() => void refresh(), 250);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !intakeOpen && !promotionTarget && !lifecycleRecord) void refresh();
    }, 15_000);
    const visible = () => { if (document.visibilityState === "visible" && !intakeOpen && !promotionTarget && !lifecycleRecord) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [refresh, intakeOpen, promotionTarget, lifecycleRecord]);

  useEffect(() => {
    if (!entryIntent || !snapshot) return;
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
        description="Inspect canonical workspace inventory and promote approved entrants through the responsible workflow service."
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
              description="Inspect active inventory or review entrants eligible for promotion."
              kicker="Registry Nav"
              title="Inventory Views"
            >
              <TerasActionButton busy={refreshing} emphasis="secondary" disabled={refreshing || runtime.pending}
                onClick={() => void refresh()}>{refreshing ? "Refreshing…" : "Refresh Registry"}</TerasActionButton>
              <TerasActionButton disabled={!snapshot || refreshing || (!fixtureMode && (!liveActionExecutable || retained))}
                onClick={() => setIntakeOpen(true)}>Workspace Intake</TerasActionButton>
              <TerasSurfaceNavButton
                current={view === "registry"}
                kicker="01"
                meta={snapshot ? `${snapshot.records.length}${instancePage ? " shown" : ""}` : "—"}
                onClick={() => { setView("registry"); setPageHistory([null]); }}
                title="Registry"
                tone="ok"
              />
              <TerasSurfaceNavButton
                current={view === "eligible"}
                kicker="02"
                meta={snapshot ? `${snapshot.eligible_promotions.length}${instancePage ? " shown" : ""}` : "—"}
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
                { id: "records", label: instancePage ? "Records shown" : "Records", value: snapshot ? String(snapshot.records.length) : "—" },
                { id: "eligible", label: instancePage ? "Eligible shown" : "Eligible", tone: "warn", value: snapshot ? String(snapshot.eligible_promotions.length) : "—" },
                { id: "owners", label: instancePage ? "Repositories shown" : "Responsible repositories", value: snapshot ? String(owners) : "—" },
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
                  detail: "Canonical authority",
                  facts: [],
                  id: "authority",
                  label: "Responsible repository",
                  stateLabel: snapshot ? "Governance" : "Not read",
                  tone: snapshot ? "ok" : "warn",
                },
              ]}
              title={view === "registry" ? "Canonical Inventory" : "Promotion Candidates"}
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
      {intakeOpen && snapshot && (fixtureMode || (liveActionExecutable && !retained)) ? <WorkspaceRegistryIntakeDialog snapshot={snapshot} fixtureMode={fixtureMode}
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
