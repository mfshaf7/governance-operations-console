import {
  TerasEmptyState,
  TerasPanel,
  TerasPanelHeader,
  TerasTimeline,
  TerasTimelineItem,
  TerasTechnicalDetails,
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
    <TerasPanel spacing="normal"
      fit="fill"
      frame="padded"
      treatment="neutral"
      layout="header-body"
      overflow="hidden"
    >
      <TerasPanelHeader
        description="Recorded changes across workflow runs."
        kicker="Material Events"
        statusLabel={projection.statusLabel}
        statusTone={projection.tone}
        title="Recent activity"
      />
      {viewModel.materialEvents.length > 0 ? (
        <TerasTimeline
          data-orchestration-home-events="true"
          frame="contained"
          ariaLabel="Orchestration activity"
        >
          {viewModel.materialEvents.map((row) => (
            <TerasTimelineItem
              detail={row.title}
              key={row.id}
              label={row.detail}
              timestamp={row.occurredAt}
              displayTimestamp={new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(row.occurredAt))}
              status={row.label}
              evidence={<TerasTechnicalDetails items={[{ label: "Run", value: row.runRef }, { label: "Event", value: row.id }, { label: "Context", value: row.meta }]} />}
              tone={row.tone}
            />
          ))}
        </TerasTimeline>
      ) : (
        <TerasEmptyState fill>
          No material orchestration event is projected.
        </TerasEmptyState>
      )}
    </TerasPanel>
  );
}
