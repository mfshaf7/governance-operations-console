"use client";

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
  records: OrchestrationRunRecord[],
  focusRecordId: string | null = null,
) {
  const [filters, setFilters] = useState<OrchestrationRunFilters>(
    defaultOrchestrationRunFilters,
  );
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? null);
  const [dashboardRecordId, setDashboardRecordId] = useState<string | null>(
    null,
  );
  const filteredRecords = useMemo(
    () => filterOrchestrationRuns(records, filters),
    [filters, records],
  );
  const selectedRecord = selectOrchestrationRun(filteredRecords, selectedId);
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
    dashboard: {
      close: () => setDashboardRecordId(null),
      open: (record: OrchestrationRunRecord) => setDashboardRecordId(record.id),
      record: dashboardRecord,
    },
    filters: {
      definitionId: filters.definitionId,
      definitionOptions: orchestrationRunDefinitionOptions(records),
      onDefinitionChange: (value: string) =>
        updateFilter("definitionId", value),
      onQueryChange: (value: string) => updateFilter("query", value),
      onSourceDomainChange: (value: string) =>
        updateFilter("sourceDomain", value),
      onStateChange: (value: OrchestrationRunFilters["state"]) =>
        updateFilter("state", value),
      query: filters.query,
      sourceDomain: filters.sourceDomain,
      sourceDomainOptions: orchestrationRunSourceDomainOptions(records),
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
