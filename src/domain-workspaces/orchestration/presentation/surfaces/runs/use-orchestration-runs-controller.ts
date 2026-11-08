"use client";
import { useWorkspaceViewState } from "../../../../../console-integration/registers/workspace-view-state.ts";

import {useOrchestrationRunPage} from "../../../live-runtime/use-orchestration-run-page.ts";
import { useEffect, useMemo, useState } from "react";

import {
  defaultOrchestrationRunFilters,
  filterOrchestrationRuns,
  selectOrchestrationRun,
} from "../../../read-model/runs/orchestration-run-selectors.ts";
import type {
  OrchestrationRunFilters,
  OrchestrationRunRecord,
} from "@/domain-workspaces/orchestration/domain/orchestration-run-types";
import {
  orchestrationRunDefinitionOptions,
  orchestrationRunSourceDomainOptions,
  orchestrationRunStateOptions,
} from "./orchestration-runs-view-model.ts";

export function useOrchestrationRunsController(
  sourceRecords: OrchestrationRunRecord[],
  focusRecordId: string | null = null,
  live = false,
) {
  const [filters, setFilters] = useWorkspaceViewState<OrchestrationRunFilters>('orchestration-runs:filters',
    defaultOrchestrationRunFilters,
  );
  const page=useOrchestrationRunPage(filters,live,focusRecordId);
  const records=useMemo(()=>live?page.original&&!page.records.some(row=>row.id===page.original!.id)?[...page.records,page.original]:page.records:sourceRecords,[live,page.records,page.original,sourceRecords]);
  const [selectedId, setSelectedId] = useWorkspaceViewState('orchestration-runs:selectedId', records[0]?.id ?? null);
  const [dashboardRecordId, setDashboardRecordId] = useState<string | null>(
    null,
  );
  const filteredRecords = useMemo(
    () => filterOrchestrationRuns(live?page.records:records, filters),
    [filters, records,live,page.records],
  );
  const selectedRecord = focusRecordId&&selectedId===focusRecordId ? records.find(row=>row.id===focusRecordId)??null : selectOrchestrationRun(filteredRecords, selectedId);
  const dashboardRecord =
    records.find((record) => record.id === dashboardRecordId) ?? null;

  useEffect(() => {
    if (
      !focusRecordId ||
      !records.some((record) => record.id === focusRecordId)
    ) {
      return;
    }

    setFilters(defaultOrchestrationRunFilters);
    setSelectedId(focusRecordId);
  }, [focusRecordId, records]);

  function updateFilter<Key extends keyof OrchestrationRunFilters>(
    key: Key,
    value: OrchestrationRunFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return {
    page,live,
    dashboard: {
      close: () => setDashboardRecordId(null),
      open: (record: OrchestrationRunRecord) => setDashboardRecordId(record.id),
      record: dashboardRecord,
    },
    filters: {
      definitionId: filters.definitionId,
      definitionOptions: orchestrationRunDefinitionOptions(live?[...records,{definitionId:"validation-readiness-run"} as OrchestrationRunRecord]:records),
      onDefinitionChange: (value: string) =>
        updateFilter("definitionId", value),
      onQueryChange: (value: string) => updateFilter("query", value),
      onSourceDomainChange: (value: string) =>
        updateFilter("sourceDomain", value),
      onStateChange: (value: OrchestrationRunFilters["state"]) =>
        updateFilter("state", value),
      query: filters.query,
      sourceDomain: filters.sourceDomain,
      sourceDomainOptions: orchestrationRunSourceDomainOptions(live?[...records,{sourceDomain:"workspace-governance-control-fabric"} as OrchestrationRunRecord]:records),
      state: filters.state,
      stateOptions: orchestrationRunStateOptions,
    },
    records: {
      all: records,
      filtered: filteredRecords,
    },
    selectedRecord,
    selectRecord: (record: OrchestrationRunRecord) => setSelectedId(record.id),
  };
}
