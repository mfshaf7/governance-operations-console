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
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [promotionTarget, setPromotionTarget] =
    useState<WorkspaceRegistryTarget | null>(null);
  const [lifecycleRecord, setLifecycleRecord] =
    useState<WorkspaceRegistryRecord | null>(null);
  const retainedSnapshot = useRef<WorkspaceRegistrySnapshot | null>(null);
  const refreshInFlight = useRef<Promise<boolean> | null>(null);
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
  const owners = useMemo(
    () => new Set(snapshot?.records.flatMap((record) => record.owner_refs) ?? []).size,
    [snapshot],
  );

  const refresh = useCallback((): Promise<boolean> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    setRefreshing(true);
    const request = (async () => {
      try {
        const [owner, inventory] = await Promise.allSettled([continuity.load(), runtime.load()]);
        if (owner.status !== "fulfilled" || inventory.status !== "fulfilled") return false;
        try { reconcileWorkspaceRegistryContinuity(owner.value, inventory.value); return true; }
        catch { return false; }
      } finally { refreshInFlight.current = null; setRefreshing(false); }
    })();
    refreshInFlight.current = request;
    return request;
  }, [continuity.load, runtime.load]);

  useEffect(() => {
    if (intakeOpen || promotionTarget || lifecycleRecord) return;
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !intakeOpen && !promotionTarget && !lifecycleRecord) void refresh();
    }, 15_000);
    const visible = () => { if (document.visibilityState === "visible" && !intakeOpen && !promotionTarget && !lifecycleRecord) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
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
        description="Inspect canonical workspace inventory and promote approved entrants through the owning workflow service."
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
                meta={snapshot ? String(snapshot.records.length) : "—"}
                onClick={() => setView("registry")}
                title="Registry"
                tone="ok"
              />
              <TerasSurfaceNavButton
                current={view === "eligible"}
                kicker="02"
                meta={snapshot ? String(snapshot.eligible_promotions.length) : "—"}
                onClick={() => setView("eligible")}
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
                { id: "owners", label: "Owners", value: snapshot ? String(owners) : "—" },
              ]}
              statuses={[
                {
                  detail: "Reconciled Workspace Governance reads through WGCF and OOS",
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
                  label: "Owner",
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
            actionsCurrent={liveActionExecutable && !retained && !refreshing}
            retained={retained}
            fixtureMode={fixtureMode}
            onLifecycle={setLifecycleRecord}
            onPromote={candidate => setPromotionTarget(candidate.target)}
            onPromotionHistory={record => setPromotionTarget({ kind: record.kind, name: record.name, record_id: record.id })}
            onRetry={() => void refresh()}
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
          candidate={snapshot?.eligible_promotions.find(candidate => candidate.target.record_id === promotionTarget.record_id) ?? null}
          target={promotionTarget}
          fixtureMode={fixtureMode}
          onClose={() => {
            runtime.reset();
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
