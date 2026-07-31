import {
  TerasEmptyState,
  TerasPanel,
  TerasPanelHeader,
  TerasList,
  TerasSignalItem,
} from "@/teras";

import {
  deliveryHomeRecentActivityPanelProjection,
  type DeliveryHomeRecentActivity,
} from "./home-view-model.ts";

export function DeliveryHomeRecentActivityPanel({
  recentActivity,
}: {
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
        kicker="Recent Activity"
        statusLabel={panelProjection.statusLabel}
        statusTone={panelProjection.tone}
        title="System activity"
        description="Delivery audit events from projected packages, receipts, and system state."
      />
      {recentActivity.length > 0 ? (
        <TerasList
          data-delivery-home-activity-list="true"
          fit="fill"
          frame="contained"
        >
          {recentActivity.map((activity) => (
            <TerasSignalItem
              detail={activity.detail}
              key={activity.eventId}
              label={activity.categoryLabel}
              meta={activity.metadataLabel}
              title={activity.title}
              tone={activity.tone}
            />
          ))}
        </TerasList>
      ) : (
        <TerasEmptyState fill>
          No recent Delivery audit events are projected.
        </TerasEmptyState>
      )}
    </TerasPanel>
  );
}
