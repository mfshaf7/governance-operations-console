"use client";

import { useEffect, useMemo, useState } from "react";

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

type RegistryView = "eligible" | "registry";

export function WorkspaceRegistryWorkspace({
  consoleDevMode,
  onClose,
}: {
  consoleDevMode: boolean;
  onClose: () => void;
}) {
  const runtime = useWorkspaceRegistryLiveRuntime();
  const [view, setView] = useState<RegistryView>("registry");
  const [promotionCandidate, setPromotionCandidate] =
    useState<WorkspaceRegistryCandidate | null>(null);
  const [lifecycleRecord, setLifecycleRecord] =
    useState<WorkspaceRegistryRecord | null>(null);
  const snapshot = consoleDevMode ? workspaceRegistryFixture : runtime.snapshot;
  const owners = useMemo(
    () => new Set(snapshot?.records.flatMap((record) => record.owner_refs) ?? []).size,
    [snapshot],
  );

  useEffect(() => {
    if (!consoleDevMode) void runtime.load().catch(() => undefined);
  }, [consoleDevMode, runtime.load]);

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
                  stateLabel: consoleDevMode ? "Fixture" : snapshot ? "OOS" : "Unavailable",
                  tone: consoleDevMode ? "info" : snapshot ? "ok" : "danger",
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
            fixtureMode={consoleDevMode}
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
          fixtureMode={consoleDevMode}
          onClose={() => {
            runtime.reset();
            setPromotionCandidate(null);
          }}
          runtime={runtime}
        />
      ) : null}
      {lifecycleRecord ? (
        <WorkspaceRegistryLifecycleWorkflow
          fixtureMode={consoleDevMode}
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
