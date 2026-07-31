"use client";

import type {
  DeliveryPackageSummary,
  DeliveryTone,
} from "../../../../../read-model/index.ts";

import { formatWorkDesignDateTime } from "../../view-model/work-design-display-formatters.ts";
import { workDesignHistoryViewProjection } from "../../view-model/work-design-history-model.ts";
import { deliveryPackageSourceMetadata } from "../../../../shared/delivery-package-metadata.ts";
import {
  TerasSubjectHero,
  TerasUtilityButton,
  TerasUtilityButtonGroup,
  TerasPanelHeader,
  TerasPanel,
  TerasStatGroup,
  TerasStatItem,
  TerasTimeline,
  TerasTimelineItem,
  TerasZoneLayout,
  TerasZone,
} from "@/teras";

type WorkDesignHistoryTimelineRow = {
  detail: string;
  label: string;
  status: string;
  timestamp: string;
  tone: DeliveryTone;
};

type WorkDesignHistoryReceiptRow = {
  detail: string;
  label: string;
  tone: DeliveryTone;
  value: string;
};

type WorkDesignHistoryViewProps = {
  applyReceiptId: string | null;
  applyReceiptRecorded: boolean;
  deliveryPackage: DeliveryPackageSummary;
  historyReceiptRows: WorkDesignHistoryReceiptRow[];
  historyTimelineRows: WorkDesignHistoryTimelineRow[];
  onExportReceipt: () => void;
  onOpenApplyLog: () => void;
  onOpenFinalizedBrief: () => void;
  onOpenReviewTree: () => void;
  sourceWorkDesignClosed: boolean;
  sourceWorkDesignRetired: boolean;
  sourceTerminalDecision: boolean;
  sourceApplyComplete: boolean;
};

export function WorkDesignHistoryView({
  applyReceiptId,
  applyReceiptRecorded,
  deliveryPackage,
  historyReceiptRows,
  historyTimelineRows,
  onExportReceipt,
  onOpenApplyLog,
  onOpenFinalizedBrief,
  onOpenReviewTree,
  sourceWorkDesignClosed,
  sourceWorkDesignRetired,
  sourceTerminalDecision,
  sourceApplyComplete,
}: WorkDesignHistoryViewProps) {
  const historyProjection = workDesignHistoryViewProjection({
    applyReceiptId,
    applyReceiptRecorded,
    sourceApplyComplete,
    sourceTerminalDecision,
    sourceWorkDesignClosed,
    sourceWorkDesignRetired,
  });

  return (
    <TerasZoneLayout variant="main-aside">
      <TerasZone fit="fill">
        <TerasSubjectHero
          actionDetail="Snapshot and finalization checks"
          actionLabel="View Finalized Brief"
          onAction={onOpenFinalizedBrief}
          subject={{
            eyebrow: "Selected Package",
            meta: deliveryPackageSourceMetadata(deliveryPackage),
            title: deliveryPackage.display_name,
          }}
        />
        <TerasPanel frame="padded" treatment="neutral" layout="header-body">
          <TerasPanelHeader
            kicker="Event Timeline"
            statusLabel={`${historyTimelineRows.length} events`}
            statusTone="info"
            title={historyProjection.timelineTitle}
            description={historyProjection.timelineDescription}
          />
          <TerasTimeline>
            {historyTimelineRows.map((line) => (
              <TerasTimelineItem
                detail={line.detail}
                displayTimestamp={formatWorkDesignDateTime(line.timestamp)}
                key={line.label}
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
          tone={historyProjection.historyArchiveTone}
        >
          <TerasPanelHeader
            kicker="Artifacts"
            title="Inspection And Export"
            description={historyProjection.archiveDescription}
          />
          <TerasUtilityButtonGroup>
            {historyProjection.showApplyArtifacts ? (
              <>
                <TerasUtilityButton onClick={onOpenReviewTree}>
                  View Full Tree
                </TerasUtilityButton>
                <TerasUtilityButton onClick={onOpenApplyLog}>
                  View Apply Log
                </TerasUtilityButton>
              </>
            ) : null}
            <TerasUtilityButton onClick={onExportReceipt}>
              {historyProjection.exportActionLabel}
            </TerasUtilityButton>
          </TerasUtilityButtonGroup>
        </TerasPanel>
        <TerasPanel
          frame="padded"
          treatment="rail"
          layout="header-body"
          overflow="hidden"
          tone={historyProjection.historyArchiveTone}
        >
          <TerasPanelHeader
            kicker={historyProjection.historyKicker}
            statusLabel={historyProjection.historyStatusLabel}
            statusTone={historyProjection.historyArchiveTone}
            title={historyProjection.historyTitle}
            description={historyProjection.historyDescription}
          />
          <TerasStatGroup scroll>
            {historyReceiptRows.map((row) => (
              <TerasStatItem
                detail={row.detail}
                element="article"
                key={row.label}
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
