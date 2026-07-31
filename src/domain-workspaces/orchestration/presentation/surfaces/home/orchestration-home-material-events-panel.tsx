import {
  TerasEmptyState,
  TerasPanel,
  TerasPanelHeader,
  TerasList,
  TerasSignalItem,
} from "@/teras";

import {
  orchestrationHomeMaterialEventsProjection,
  type OrchestrationHomeViewModel,
} from "./orchestration-home-view-model.ts";

export function OrchestrationHomeMaterialEventsPanel({
  viewModel,
}: {
  viewModel: OrchestrationHomeViewModel;
}) {
  const projection = orchestrationHomeMaterialEventsProjection(
    viewModel.materialEvents.length,
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
        description="Material run-state events from the structured orchestration projection."
        kicker="Material Events"
        statusLabel={projection.statusLabel}
        statusTone={projection.tone}
        title="System event feed"
      />
      {viewModel.materialEvents.length > 0 ? (
        <TerasList
          data-orchestration-home-events="true"
          fit="fill"
          frame="contained"
        >
          {viewModel.materialEvents.map((row) => (
            <TerasSignalItem
              detail={row.detail}
              key={row.id}
              label={row.label}
              meta={row.meta}
              title={row.title}
              tone={row.tone}
            />
          ))}
        </TerasList>
      ) : (
        <TerasEmptyState fill>
          No material orchestration event is projected.
        </TerasEmptyState>
      )}
    </TerasPanel>
  );
}
