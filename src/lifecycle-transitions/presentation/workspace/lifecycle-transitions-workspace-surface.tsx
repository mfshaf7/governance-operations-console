"use client";

import { useEffect, useMemo, useState } from "react";
import type { LifecycleTransitionRuntimePosture } from "../../live-runtime/lifecycle-transition-live-types.ts";

import {
  TerasEmptyState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
} from "@/teras";

import type {
  ConsoleSurfaceEntryIntent,
} from "../../../console-architecture";
import type {
  OperationWorkbenchPathLabel,
} from "../../../operation-workbench/operation-workbench-domain-registry";
import type {
  LifecycleTransitionState,
} from "../../model/lifecycle-transition-types";
import type {
  LifecycleTransitionOverviewItem,
  LifecycleTransitionRouteOverview,
} from "../lifecycle-transition-overview-view-model";
import { LifecycleTransitionRegister } from "./lifecycle-transition-register";
import { LifecycleTransitionSelected } from "./lifecycle-transition-selected";
import {
  lifecycleTransitionStateOptions,
} from "./lifecycle-transitions-workspace-view-model";

type LifecycleTransitionStateFilter = LifecycleTransitionState | "all";

export function LifecycleTransitionsWorkspaceSurface({
  focusTransitionId = null,
  onOpenWorkbenchSurface,
  route,
  runtimePosture,
}: {
  focusTransitionId?: string | null;
  onOpenWorkbenchSurface: (
    surfaceLabel: OperationWorkbenchPathLabel,
    focusIntent?: ConsoleSurfaceEntryIntent | null,
  ) => void;
  route: LifecycleTransitionRouteOverview;
  runtimePosture: LifecycleTransitionRuntimePosture | null;
}) {
  const [query, setQuery] = useState("");
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(
    route.items[0]?.transitionId ?? null,
  );
  const [state, setState] = useState<LifecycleTransitionStateFilter>("all");
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return route.items.filter((item) => {
      const matchesState = state === "all" || item.state === state;
      const matchesQuery =
        !normalizedQuery ||
        [
          item.sourceRecordId,
          item.sourceTitle ?? "",
          item.transitionId,
          item.nextAction?.ownerLabel ?? "",
          item.targetRecordRef ?? item.targetHomeRef,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesState && matchesQuery;
    });
  }, [query, route.items, state]);
  const selectedTransition =
    filteredItems.find(
      (item) => item.transitionId === selectedTransitionId,
    ) ??
    filteredItems[0] ??
    null;

  useEffect(() => {
    if (
      focusTransitionId &&
      route.items.some(
        (item) => item.transitionId === focusTransitionId,
      )
    ) {
      setQuery("");
      setState("all");
      setSelectedTransitionId(focusTransitionId);
    }
  }, [focusTransitionId, route.items]);

  function selectTransition(item: LifecycleTransitionOverviewItem) {
    setSelectedTransitionId(item.transitionId);
  }

  return (
    <TerasRecordControlLayout
      composition="fullscreen-register"
      data-lifecycle-transitions-workspace-surface="true"
      mode="register-selected"
      register={
        <TerasRegisterPanel
          description={`${route.description}${runtimePosture?.mode === "live" && (runtimePosture.status !== "current" || runtimePosture.truncated) ? " Some source reads are unavailable or incomplete." : ""}`}
          filterBar={
            <TerasFilterBar
              filters={[
                {
                  label: "Filter transition state",
                  onValueChange: setState,
                  options: lifecycleTransitionStateOptions(route.items),
                  value: state,
                },
              ]}
              search={{
                ariaLabel: "Search lifecycle transitions",
                onValueChange: setQuery,
                placeholder: "Search source, transition, responsible component, or target...",
                value: query,
              }}
            />
          }
          kicker="Transition Register"
          statusLabel={`${filteredItems.length}/${route.totalCount} shown`}
          statusTone={route.tone}
          title={`${route.sourceLabel} to ${route.targetLabel}`}
        >
          {filteredItems.length > 0 ? (
            <LifecycleTransitionRegister
              items={filteredItems}
              onSelect={selectTransition}
              selectedTransitionId={selectedTransition?.transitionId ?? null}
            />
          ) : (
            <TerasEmptyState fill>
              {runtimePosture?.mode === "live" && runtimePosture.status !== "current"
                ? "Handoff records are unavailable. Waiting for a current source read."
                : runtimePosture?.truncated && route.totalCount === 0
                  ? "No handoff is available from the sources currently read. Coverage is incomplete."
                  : "No transition matches the current search and filter."}
            </TerasEmptyState>
          )}
        </TerasRegisterPanel>
      }
      selected={
        <LifecycleTransitionSelected
          item={selectedTransition}
          runtimePosture={runtimePosture}
          onOpenWorkbenchSurface={onOpenWorkbenchSurface}
        />
      }
    />
  );
}
