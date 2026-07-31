"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

import {
  TerasEmptyState,
  TerasFilterBar,
  TerasPanel,
  TerasPanelHeader,
  TerasList,
  TerasSignalItem,
} from "@/teras";

import {
  defaultOrchestrationHomeAttentionFilters,
  filterOrchestrationHomeAttention,
  orchestrationHomeAttentionProjection,
  orchestrationHomeScopeOptions,
  type OrchestrationHomeAttentionFilters,
  type OrchestrationHomeTargetSurface,
  type OrchestrationHomeViewModel,
} from "./orchestration-home-view-model.ts";

export function OrchestrationHomeAttentionPanel({
  onOpenSurface,
  viewModel,
}: {
  onOpenSurface: (surfaceId: OrchestrationHomeTargetSurface) => void;
  viewModel: OrchestrationHomeViewModel;
}) {
  const [filters, setFilters] = useState<OrchestrationHomeAttentionFilters>(
    defaultOrchestrationHomeAttentionFilters,
  );
  const filteredRows = filterOrchestrationHomeAttention(
    viewModel.attention,
    filters,
  );
  const panelProjection = orchestrationHomeAttentionProjection({
    filteredCount: filteredRows.length,
    rows: viewModel.attention,
  });

  return (
    <TerasPanel
      fit="fill"
      frame="padded"
      treatment="neutral"
      layout="header-toolbar-body"
      overflow="hidden"
    >
      <TerasPanelHeader
        description="Definition qualification, review, admission, and run exceptions that require operator attention."
        kicker="Attention Queue"
        statusLabel={panelProjection.statusLabel}
        statusTone={panelProjection.tone}
        title="Required orchestration moves"
      />
      <TerasFilterBar
        data-orchestration-home-filter="attention"
        filters={[
          {
            label: "Filter attention by scope",
            onValueChange: (
              scope: OrchestrationHomeAttentionFilters["scope"],
            ) => setFilters((current) => ({ ...current, scope })),
            options: orchestrationHomeScopeOptions,
            value: filters.scope,
          },
          {
            label: "Filter attention by condition",
            onValueChange: (
              condition: OrchestrationHomeAttentionFilters["condition"],
            ) => setFilters((current) => ({ ...current, condition })),
            options: viewModel.conditionOptions,
            value: filters.condition,
          },
          {
            label: "Filter attention by owner",
            onValueChange: (owner) =>
              setFilters((current) => ({ ...current, owner })),
            options: viewModel.ownerOptions,
            value: filters.owner,
          },
        ]}
        search={{
          ariaLabel: "Search orchestration attention queue",
          onValueChange: (query) =>
            setFilters((current) => ({ ...current, query })),
          placeholder: "Search queue",
          value: filters.query,
        }}
      />
      {filteredRows.length > 0 ? (
        <TerasList fit="fill" frame="contained">
          {filteredRows.map((row) => (
            <TerasSignalItem
              actionLabel={
                <>
                  {row.actionLabel}
                  <ArrowUpRight aria-hidden="true" size={12} />
                </>
              }
              ariaLabel={`${row.actionLabel}: ${row.title}`}
              detail={row.detail}
              key={row.id}
              label={row.label}
              meta={row.meta}
              onSelect={() => onOpenSurface(row.targetSurfaceId)}
              title={row.title}
              tone={row.tone}
            />
          ))}
        </TerasList>
      ) : (
        <TerasEmptyState fill>
          No attention item matches the current filters.
        </TerasEmptyState>
      )}
    </TerasPanel>
  );
}
