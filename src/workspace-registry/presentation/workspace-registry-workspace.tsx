"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const snapshot = fixtureMode
    ? workspaceRegistryFixture
    : liveActionExecutable
      ? reconciliation.snapshot
      : null;
  const availabilityError = reconciliation.error ?? continuity.error?.message ?? runtime.error?.message ?? null;
  const owners = useMemo(
    () => new Set(snapshot?.records.flatMap((record) => record.owner_refs) ?? []).size,
    [snapshot],
  );

  useEffect(() => {
    void Promise.allSettled([continuity.load(), runtime.load()]);
  }, [continuity.load, runtime.load]);

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
              <TerasActionButton disabled={!liveActionExecutable || fixtureMode || !snapshot}
                onClick={() => setIntakeOpen(true)}>Workspace Intake</TerasActionButton>
              <TerasSurfaceNavButton
                current={view === "registry"}
                kicker="01"
                meta={String(snapshot?.records.length ?? 0)}
                onClick={() => setView("registry")}
                title="Registry"
                tone="ok"
              />
              <TerasSurfaceNavButton
                current={view === "eligible"}
                kicker="02"
                meta={String(snapshot?.eligible_promotions.length ?? 0)}
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
                { id: "records", label: "Records", value: String(snapshot?.records.length ?? 0) },
                { id: "eligible", label: "Eligible", tone: "warn", value: String(snapshot?.eligible_promotions.length ?? 0) },
                { id: "owners", label: "Owners", value: String(owners) },
              ]}
              statuses={[
                {
                  detail: "Projection source",
                  facts: [],
                  id: "source",
                  label: "Source",
                  stateLabel: fixtureMode
                    ? "Fixture"
                    : snapshot
                      ? "WGCF + OOS"
                      : combinedMode === null
                        ? "Loading"
                        : "Unavailable",
                  tone: fixtureMode ? "info" : snapshot ? "ok" : "danger",
                },
                {
                  detail: "Canonical authority",
                  facts: [],
                  id: "authority",
                  label: "Authority",
                  stateLabel: snapshot ? "Workspace Governance" : "Pending",
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
            fixtureMode={fixtureMode}
            onLifecycle={setLifecycleRecord}
            onPromote={candidate => setPromotionTarget(candidate.target)}
            onPromotionHistory={record => setPromotionTarget({ kind: record.kind, name: record.name, record_id: record.id })}
            onRetry={() => {
              void Promise.allSettled([continuity.load(), runtime.load()]);
            }}
            snapshot={snapshot}
            view={view}
          />
        </TerasFullscreenSurfaceFrame>
      </TerasModalShell>
      {intakeOpen && snapshot && liveActionExecutable && !fixtureMode ? <WorkspaceRegistryIntakeDialog snapshot={snapshot}
        onClose={() => { setIntakeOpen(false); void Promise.allSettled([continuity.load(), runtime.load()]); }} /> : null}
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
          runtime={runtime}
        />
      ) : null}
    </>
  );
}
