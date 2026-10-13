"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ConsoleEntryIntent } from "../../console-architecture";

import {
  TerasFullscreenSurfaceFrame,
  TerasModalShell,
  TerasSurfaceNav,
  TerasSurfaceNavButton,
  TerasSurfaceSummaryHeader,
} from "@/teras";

import { workspaceRegistryFixture } from "../fixtures/workspace-registry.fixture";
import { useWorkspaceRegistryLiveRuntime } from "../live-runtime/use-workspace-registry-live-runtime";
import type {
  WorkspaceRegistryCandidate,
  WorkspaceRegistryRecord,
} from "../model/workspace-registry-types";
import { WorkspaceRegistryLifecycleWorkflow } from "./workspace-registry-lifecycle-workflow";
import { WorkspaceRegistryPromotionWorkflow } from "./workspace-registry-promotion-workflow";
import { WorkspaceRegistrySurface } from "./workspace-registry-surface";
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
  const [view, setView] = useState<RegistryView>("registry");
  const [promotionCandidate, setPromotionCandidate] =
    useState<WorkspaceRegistryCandidate | null>(null);
  const [lifecycleRecord, setLifecycleRecord] =
    useState<WorkspaceRegistryRecord | null>(null);
  const appliedEntryIntentRef = useRef<string | null>(null);
  const fixtureIsolation = resolveConsoleFixtureIsolation({
    mode:
      runtime.mode === "loading"
        ? null
        : runtime.mode === "unavailable"
          ? "unavailable"
          : runtime.mode,
    status:
      runtime.mode === "loading"
        ? "loading"
        : runtime.mode === "unavailable"
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
      ? runtime.snapshot
      : null;
  const owners = useMemo(
    () => new Set(snapshot?.records.flatMap((record) => record.owner_refs) ?? []).size,
    [snapshot],
  );

  useEffect(() => {
    void runtime.load().catch(() => undefined);
  }, [runtime.load]);

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
                      ? "OOS"
                      : runtime.mode === "loading"
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
            fixtureMode={fixtureMode}
            onLifecycle={setLifecycleRecord}
            onPromote={setPromotionCandidate}
            runtime={runtime}
            snapshot={snapshot}
            view={view}
          />
        </TerasFullscreenSurfaceFrame>
      </TerasModalShell>
      {promotionCandidate ? (
        <WorkspaceRegistryPromotionWorkflow
          candidate={promotionCandidate}
          fixtureMode={fixtureMode}
          onClose={() => {
            runtime.reset();
            setPromotionCandidate(null);
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
