"use client";

import { useEffect, useMemo, useState } from "react";

import {
  TerasEmptyState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
} from "@/teras";

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
}: {
  focusTransitionId?: string | null;
  onOpenWorkbenchSurface: (surfaceLabel: OperationWorkbenchPathLabel) => void;
  route: LifecycleTransitionRouteOverview;
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
          description={route.description}
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
                placeholder: "Search source, transition, owner, or target...",
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
              No transition matches the current search and filter.
            </TerasEmptyState>
          )}
        </TerasRegisterPanel>
      }
      selected={
        <LifecycleTransitionSelected
          item={selectedTransition}
          onOpenWorkbenchSurface={onOpenWorkbenchSurface}
        />
      }
    />
  );
}
