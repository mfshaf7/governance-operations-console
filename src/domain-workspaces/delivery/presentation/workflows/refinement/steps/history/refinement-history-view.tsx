"use client";

import {
  TerasPanel,
  TerasPanelHeader,
  TerasStatGroup,
  TerasStatItem,
  TerasSubjectHero,
  TerasTimeline,
  TerasTimelineItem,
  TerasZoneLayout,
  TerasZone,
} from "@/teras";
import type {
  DeliveryPackageSummary,
  DeliveryRefinementApplyReceipt,
  DeliveryRefinementPacket,
} from "../../../../../read-model/index.ts";

import {
  formatRefinementHistoryDateTime,
  refinementHistoryReceiptRows,
  refinementHistoryTimelineRows,
  refinementHistoryViewProjection,
} from "../../view-model/refinement-history-model.ts";
import { deliveryPackagePacketMetadata } from "../../../../shared/delivery-package-metadata.ts";

export function RefinementHistoryView({
  activeReceipt,
  deliveryPackage,
  onOpenHandoff,
  packet,
}: {
  activeReceipt: DeliveryRefinementApplyReceipt | null;
  deliveryPackage: DeliveryPackageSummary;
  onOpenHandoff: () => void;
  packet: DeliveryRefinementPacket;
}) {
  const recordedReceipt = activeReceipt ?? packet.receipt;
  const historyProjection = refinementHistoryViewProjection(recordedReceipt);
  const timelineRows = refinementHistoryTimelineRows({
    packet,
    recordedReceipt,
  });
  const receiptRows = refinementHistoryReceiptRows({
    packet,
    recordedReceipt,
  });
  const uniqueRoutes = Array.from(new Set(packet.apply_plan.expected_routes));

  return (
    <TerasZoneLayout variant="main-aside">
      <TerasZone fit="fill">
        <TerasSubjectHero
          actionDetail="Finalized brief and Work Design apply receipt"
          actionLabel="View Work Design Handoff"
          onAction={onOpenHandoff}
          subject={{
            eyebrow: "Selected Package",
            meta: deliveryPackagePacketMetadata({
              deliveryPackage,
              packetId: packet.packet_id,
            }),
            title: deliveryPackage.display_name,
          }}
        />
        <TerasPanel frame="padded" treatment="neutral" layout="header-body">
          <TerasPanelHeader
            kicker="Event Timeline"
            statusLabel={`${timelineRows.length} events`}
            statusTone="info"
            title={historyProjection.eventTitle}
            description={historyProjection.eventDescription}
          />
          <TerasTimeline>
            {timelineRows.map((line) => (
              <TerasTimelineItem
                detail={line.detail}
                displayTimestamp={formatRefinementHistoryDateTime(
                  line.timestamp,
                )}
                key={`${line.label}-${line.detail}`}
                label={line.label}
                status={line.status}
                timestamp={line.timestamp}
                tone={line.tone}
              />
            ))}
          </TerasTimeline>
        </TerasPanel>
      </TerasZone>

      <TerasZone fit="fill">
        <TerasPanel
          frame="padded"
          treatment="rail"
          tone={historyProjection.historyTone}
        >
          <TerasPanelHeader
            kicker="Artifacts"
            title="Inspection Sources"
            description="Source evidence available to this Refinement archive."
          />
          <TerasStatGroup>
            <TerasStatItem
              detail="Work Design source receipt carried into Refinement."
              label="Source Receipt"
              value={packet.handoff.source_work_design_receipt_id}
            />
            <TerasStatItem
              detail="Bounded OOS routes staged by the apply plan."
              label="Apply Routes"
              value={uniqueRoutes.length}
            />
            <TerasStatItem
              detail="Reviewed operations in the apply plan."
              label="Operations"
              value={packet.apply_plan.operations.length}
            />
            <TerasStatItem
              detail="Last packet save before current archive view."
              label="Packet Saved"
              value={formatRefinementHistoryDateTime(packet.last_saved_at)}
            />
          </TerasStatGroup>
        </TerasPanel>

        <TerasPanel
          frame="padded"
          treatment="rail"
          layout="header-body"
          overflow="hidden"
          tone={historyProjection.historyTone}
        >
          <TerasPanelHeader
            kicker="Receipt History"
            statusLabel={historyProjection.receiptStatusLabel}
            statusTone={historyProjection.receiptStatusTone}
            title={historyProjection.receiptTitle}
            description={historyProjection.receiptDescription}
          />
          <TerasStatGroup scroll>
            {receiptRows.map((row) => (
              <TerasStatItem
                detail={row.detail}
                element="article"
                key={`${row.label}-${row.value}`}
                label={row.label}
                value={row.value}
              />
            ))}
          </TerasStatGroup>
        </TerasPanel>
      </TerasZone>
    </TerasZoneLayout>
  );
}
