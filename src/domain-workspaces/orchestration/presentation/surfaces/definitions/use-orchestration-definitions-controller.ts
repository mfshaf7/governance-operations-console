"use client";

import { useEffect, useMemo, useState } from "react";

import {
  defaultOrchestrationDefinitionFilters,
  filterOrchestrationDefinitions,
  selectOrchestrationDefinition,
} from "../../../read-model/definitions/orchestration-definition-selectors.ts";
import type {
  OrchestrationDefinitionFilters,
  OrchestrationDefinitionRecord,
} from "@/domain-workspaces/orchestration/domain/orchestration-definition-types";
import {
  orchestrationDefinitionClassificationOptions,
  orchestrationDefinitionRecordStateOptions,
  orchestrationDefinitionSourceDomainOptions,
} from "./orchestration-definitions-view-model.ts";

export function useOrchestrationDefinitionsController(
  records: OrchestrationDefinitionRecord[],
  focusRecordId: string | null = null,
) {
  const [filters, setFilters] = useState<OrchestrationDefinitionFilters>(
    defaultOrchestrationDefinitionFilters,
  );
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? null);
  const [dashboardRecord, setDashboardRecord] =
    useState<OrchestrationDefinitionRecord | null>(null);
  const [designSession, setDesignSession] = useState<{
    key: number;
    record: OrchestrationDefinitionRecord | null;
  } | null>(null);

  const filteredRecords = useMemo(
    () => filterOrchestrationDefinitions(records, filters),
    [filters, records],
  );
  const selectedRecord = selectOrchestrationDefinition(
    filteredRecords,
    selectedId,
  );

  useEffect(() => {
    if (
      !focusRecordId ||
      !records.some((record) => record.id === focusRecordId)
    ) {
      return;
    }

    setFilters(defaultOrchestrationDefinitionFilters);
    setSelectedId(focusRecordId);
  }, [focusRecordId, records]);

  function updateFilter<Key extends keyof OrchestrationDefinitionFilters>(
    key: Key,
    value: OrchestrationDefinitionFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return {
    dashboard: {
      close: () => setDashboardRecord(null),
      open: (record: OrchestrationDefinitionRecord) =>
        setDashboardRecord(record),
      record: dashboardRecord,
    },
    design: {
      close: () => setDesignSession(null),
      open: (record: OrchestrationDefinitionRecord | null = null) => {
        setDashboardRecord(null);
        setDesignSession((current) => ({
          key: (current?.key ?? 0) + 1,
          record,
        }));
      },
      session: designSession,
    },
    filters: {
      classification: filters.classification,
      classificationOptions: orchestrationDefinitionClassificationOptions,
      onClassificationChange: (
        value: OrchestrationDefinitionFilters["classification"],
      ) => updateFilter("classification", value),
      onQueryChange: (value: string) => updateFilter("query", value),
      onRecordStateChange: (
        value: OrchestrationDefinitionFilters["recordState"],
      ) => updateFilter("recordState", value),
      onSourceDomainChange: (value: string) =>
        updateFilter("sourceDomain", value),
      query: filters.query,
      recordState: filters.recordState,
      recordStateOptions: orchestrationDefinitionRecordStateOptions,
      sourceDomain: filters.sourceDomain,
      sourceDomainOptions: orchestrationDefinitionSourceDomainOptions(records),
    },
    records: {
      all: records,
      filtered: filteredRecords,
    },
    selectedRecord,
    selectRecord: (record: OrchestrationDefinitionRecord) =>
      setSelectedId(record.id),
  };
}
