import { ArrowUpRight } from "lucide-react";

import {
  TerasEmptyState,
  TerasPanel,
  TerasPanelHeader,
  TerasList,
  TerasSignalItem,
} from "@/teras";

import {
  orchestrationHomeInFlightProjection,
  type OrchestrationHomeTargetSurface,
  type OrchestrationHomeViewModel,
} from "./orchestration-home-view-model.ts";

export function OrchestrationHomeInFlightPanel({
  onOpenSurface,
  viewModel,
}: {
  onOpenSurface: (surfaceId: OrchestrationHomeTargetSurface) => void;
  viewModel: OrchestrationHomeViewModel;
}) {
  const projection = orchestrationHomeInFlightProjection(
    viewModel.inFlightRuns.length,
  );

  return (
    <TerasPanel
      fit="fill"
      frame="padded"
      treatment="neutral"
      layout="header-body"
      overflow="hidden"
    >
      <TerasPanelHeader
        description="Queued, running, and healthy structured waits outside the attention queue."
        kicker="In-flight Runs"
        statusLabel={projection.statusLabel}
        statusTone={projection.tone}
        title="Active run posture"
      />
      {viewModel.inFlightRuns.length > 0 ? (
        <TerasList fit="fill" frame="contained">
          {viewModel.inFlightRuns.map((row) => (
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
        <TerasEmptyState fill>No run is currently in flight.</TerasEmptyState>
      )}
    </TerasPanel>
  );
}
