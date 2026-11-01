import {
  TerasEmptyState,
  TerasPanel,
  TerasPanelHeader,
  TerasTimeline,
  TerasTimelineItem,
  TerasTechnicalDetails,
} from "@/teras";

import {
  deliveryHomeRecentActivityPanelProjection,
  type DeliveryHomeRecentActivity,
} from "./home-view-model.ts";

export function DeliveryHomeRecentActivityPanel({
  recentActivity,
  sourceDetail,
}: {
  sourceDetail?: string;
  recentActivity: DeliveryHomeRecentActivity[];
}) {
  const panelProjection = deliveryHomeRecentActivityPanelProjection(
    recentActivity.length,
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
        kicker="Delivery Activity"
        statusLabel={panelProjection.statusLabel}
        statusTone={panelProjection.tone}
        title="Recent activity"
        description={sourceDetail ?? "Latest recorded events in this Delivery scope."}
      />
      {recentActivity.length > 0 ? (
        <TerasTimeline
          frame="contained"
          ariaLabel="Recent Delivery activity"
          data-delivery-home-activity-list="true"
        >
          {recentActivity.map((activity) => (
            <TerasTimelineItem
              detail={activity.packageLabel}
              displayTimestamp={activity.timestampLabel}
              timestamp={activity.timestamp}
              key={activity.eventId}
              label={activity.title}
              status={activity.categoryLabel}
              evidence={<TerasTechnicalDetails items={[
                { label: "Recorded detail", value: activity.detail },
                { label: "Recorded at (UTC)", value: activity.timestamp },
                { label: "Actor", value: activity.actor || "Not recorded" },
                { label: "Package reference", value: activity.packageRef },
                { label: "Receipt", value: activity.receiptLabel },
                { label: "Event reference", value: activity.eventRef },
              ]} />}
              tone={activity.tone}
            />
          ))}
        </TerasTimeline>
      ) : (
        <TerasEmptyState fill>
          {sourceDetail ?? "No recent Delivery audit events are projected."}
        </TerasEmptyState>
      )}
    </TerasPanel>
  );
}
