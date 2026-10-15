"use client";

import { useEffect, useMemo, useState } from "react";

import {
  TerasFullscreenSurfaceFrame,
  TerasEmptyState,
  TerasModalShell,
  TerasSurfaceNav,
  TerasSurfaceNavButton,
  TerasSurfaceSummaryHeader,
} from "@/teras";
import type {
  ConsoleEntryIntent,
  ConsoleSurfaceEntryIntent,
} from "../../../console-architecture";

import type {
  OperationWorkbenchPathLabel,
} from "../../../operation-workbench/operation-workbench-domain-registry";
import type {
  LifecycleTransitionRouteId,
} from "../../model/lifecycle-transition-types";
import type {
  LifecycleTransitionProjection,
} from "../../read-model/lifecycle-transition-projection-types";
import type {
  LifecycleTransitionRuntimePosture,
} from "../../live-runtime/lifecycle-transition-live-types";
import {
  buildLifecycleTransitionRouteOverviews,
} from "../lifecycle-transition-overview-view-model";
import { LifecycleTransitionsWorkspaceSurface } from "./lifecycle-transitions-workspace-surface";
import {
  lifecycleTransitionWorkspaceMetrics,
  lifecycleTransitionRouteNavLabel,
  lifecycleTransitionWorkspaceStatus,
} from "./lifecycle-transitions-workspace-view-model";
import { resolveLifecycleTransitionResume } from "../../routing/lifecycle-transition-resume";

export function LifecycleTransitionsWorkspace({
  entryIntent,
  onClose,
  onOpenWorkbenchSurface,
  runtimePosture,
  transitions,
}: {
  entryIntent?: ConsoleEntryIntent | null;
  onClose: () => void;
  onOpenWorkbenchSurface: (
    surfaceLabel: OperationWorkbenchPathLabel,
    focusIntent?: ConsoleSurfaceEntryIntent | null,
  ) => void;
  runtimePosture: LifecycleTransitionRuntimePosture | null;
  transitions: readonly LifecycleTransitionProjection[];
}) {
  const routes = useMemo(
    () => buildLifecycleTransitionRouteOverviews(transitions),
    [transitions],
  );
  const resume = useMemo(
    () =>
      resolveLifecycleTransitionResume({
        entryIntent,
        runtimePosture,
        transitions,
      }),
    [entryIntent, runtimePosture, transitions],
  );
  const [activeRouteId, setActiveRouteId] =
    useState<LifecycleTransitionRouteId>(routes[0].routeId);
  const activeRoute =
    routes.find((route) => route.routeId === activeRouteId) ?? routes[0];

  useEffect(() => {
    if (resume.state !== "ready") {
      return;
    }
    setActiveRouteId(resume.routeId);
  }, [resume]);

  return (
    <TerasModalShell
      bodyLayout="fill"
      description="Read-only coordination for cross-domain validation, admission, application, receipts, and owner routing."
      height="fill"
      kicker="Lifecycle Transitions"
      onClose={onClose}
      surfaceId="lifecycle-transitions-workspace"
      title="Lifecycle Transitions"
      width="viewport"
    >
      {resume.state === "blocked" ? (
        <TerasEmptyState fill>
          {resume.message}
        </TerasEmptyState>
      ) : (
        <TerasFullscreenSurfaceFrame
          data-lifecycle-transition-route={activeRoute.routeId}
          nav={
            <TerasSurfaceNav
              ariaLabel="Lifecycle transition routes"
              description="Select a supported cross-domain route."
              kicker="Route Nav"
              title="Transition Routes"
            >
              {routes.map((route, index) => (
                <TerasSurfaceNavButton
                  current={route.routeId === activeRoute.routeId}
                  kicker={String(index + 1).padStart(2, "0")}
                  key={route.routeId}
                  meta={String(route.totalCount)}
                  onClick={() => setActiveRouteId(route.routeId)}
                  title={lifecycleTransitionRouteNavLabel(route.routeId)}
                  tone={route.tone}
                />
              ))}
            </TerasSurfaceNav>
          }
          summary={
            <TerasSurfaceSummaryHeader
              ariaLabel="Lifecycle transition route summary"
              metrics={lifecycleTransitionWorkspaceMetrics(activeRoute)}
              statuses={lifecycleTransitionWorkspaceStatus(
                activeRoute,
                runtimePosture,
              )}
              title={`${activeRoute.sourceLabel} to ${activeRoute.targetLabel}`}
              titleKicker="Route Summary"
            />
          }
        >
          <LifecycleTransitionsWorkspaceSurface
            focusTransitionId={
              resume.state === "ready" ? resume.transitionId : null
            }
            key={activeRoute.routeId}
            onOpenWorkbenchSurface={onOpenWorkbenchSurface}
            route={activeRoute}
          />
        </TerasFullscreenSurfaceFrame>
      )}
    </TerasModalShell>
  );
}
