"use client";

import { useEffect, useState } from "react";

import {
  TerasFullscreenSurfaceFrame,
  TerasModalShell,
  TerasSurfaceNav,
  TerasSurfaceNavButton,
  TerasSurfaceSummaryHeader,
} from "@/teras";
import type { ConsoleEntryIntent } from "../../../console-architecture";

import type {
  OperationWorkbenchPathLabel,
} from "../../../operation-workbench/operation-workbench-domain-registry";
import type {
  LifecycleTransitionRouteId,
} from "../../model/lifecycle-transition-types";
import type {
  LifecycleTransitionProjection,
} from "../../read-model/lifecycle-transition-projection-types";
import {
  buildLifecycleTransitionRouteOverviews,
} from "../lifecycle-transition-overview-view-model";
import { LifecycleTransitionsWorkspaceSurface } from "./lifecycle-transitions-workspace-surface";
import {
  lifecycleTransitionWorkspaceMetrics,
  lifecycleTransitionRouteNavLabel,
  lifecycleTransitionWorkspaceStatus,
} from "./lifecycle-transitions-workspace-view-model";

export function LifecycleTransitionsWorkspace({
  entryIntent,
  onClose,
  onOpenWorkbenchSurface,
  transitions,
}: {
  entryIntent?: ConsoleEntryIntent | null;
  onClose: () => void;
  onOpenWorkbenchSurface: (surfaceLabel: OperationWorkbenchPathLabel) => void;
  transitions: readonly LifecycleTransitionProjection[];
}) {
  const routes = buildLifecycleTransitionRouteOverviews(transitions);
  const [activeRouteId, setActiveRouteId] =
    useState<LifecycleTransitionRouteId>(routes[0].routeId);
  const activeRoute =
    routes.find((route) => route.routeId === activeRouteId) ?? routes[0];

  useEffect(() => {
    if (!entryIntent) {
      return;
    }

    const focusedRoute = routes.find((route) =>
      route.items.some(
        (item) => item.transitionId === entryIntent.subjectRef,
      ),
    );

    if (focusedRoute) {
      setActiveRouteId(focusedRoute.routeId);
    }
  }, [entryIntent, routes]);

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
            statuses={lifecycleTransitionWorkspaceStatus(activeRoute)}
            title={`${activeRoute.sourceLabel} to ${activeRoute.targetLabel}`}
            titleKicker="Route Summary"
          />
        }
      >
        <LifecycleTransitionsWorkspaceSurface
          focusTransitionId={entryIntent?.subjectRef ?? null}
          key={activeRoute.routeId}
          onOpenWorkbenchSurface={onOpenWorkbenchSurface}
          route={activeRoute}
        />
      </TerasFullscreenSurfaceFrame>
    </TerasModalShell>
  );
}
