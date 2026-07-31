"use client";

import {
  TerasDialog,
  TerasEmptyState,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasStatusPill,
  TerasTimeline,
  TerasTimelineItem,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";

import type { RepositoryRuntimeReceipt } from "../../../local-runtime/repository-runtime.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import {
  repositoryHistoryControlFacts,
  repositoryHistoryReceiptFacts,
  repositoryHistoryRecordFacts,
  repositoryHistoryTimelineRows,
} from "./repository-history-view-model.ts";
import {
  repositoryRecordStatusLabel,
  repositoryRecordTone,
} from "../../shared/repository-display-model.ts";

export function RepositoryHistoryDialog({
  onClose,
  receipts,
  repository,
}: {
  onClose: () => void;
  receipts: RepositoryRuntimeReceipt[];
  repository: RepositoryWorkspaceRecord | null;
}) {
  if (!repository) {
    return null;
  }

  const timelineRows = repositoryHistoryTimelineRows(receipts);
  const recordTone = repositoryRecordTone(repository);
  const receiptTone = receipts.length > 0 ? "ok" : "muted";

  return (
    <TerasDialog
      closeLabel="Close Repository history"
      description="Read-only record of Repository actions and their retained local receipts."
      kicker="Repository Archive"
      onClose={onClose}
      open
      contentOverflow="hidden"
      height="fill"
      width="large"
      title="Repository History"
    >
      <TerasZoneLayout variant="main-aside">
        <TerasZone fit="fill">
          <TerasPanel
            frame="padded"
            treatment="neutral"
            fit="content"
            spacing="normal"
          >
            <TerasPanelHeader
              description="Control boundaries retained with the current record."
              kicker="Control Context"
              title="Repository boundary"
            />
            <TerasMetadataList
              items={repositoryHistoryControlFacts(repository)}
              topOffset="compact"
            />
          </TerasPanel>

          <TerasPanel
            frame="padded"
            treatment="neutral"
            fit="fill"
            layout="header-body"
            spacing="normal"
          >
            <TerasPanelHeader
              actions={
                <TerasStatusPill tone="info">
                  {timelineRows.length} receipts
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description="Actual Repository command receipts in recorded order."
              kicker="Receipt Timeline"
              title="Receipt trail"
            />
            {timelineRows.length > 0 ? (
              <TerasTimeline ariaLabel="Repository receipt timeline">
                {timelineRows.map((row, index) => (
                  <TerasTimelineItem
                    detail={row.detail}
                    displayTimestamp={row.timestamp}
                    key={`${row.label}-${row.timestamp}-${index}`}
                    label={row.label}
                    status={row.status}
                    timestamp={row.timestamp}
                    tone={row.tone}
                  />
                ))}
              </TerasTimeline>
            ) : (
              <TerasEmptyState fill>
                No local Repository receipts are recorded.
              </TerasEmptyState>
            )}
          </TerasPanel>
        </TerasZone>

        <TerasZone fit="content">
          <TerasPanel
            frame="padded"
            treatment="state"
            fit="content"
            spacing="normal"
            tone={recordTone}
          >
            <TerasPanelHeader
              actions={
                <TerasStatusPill tone={recordTone}>
                  {repositoryRecordStatusLabel(repository)}
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description="Current Repository state retained with this record."
              kicker="Record State"
              title={repository.name}
            />
            <TerasMetadataList
              items={repositoryHistoryRecordFacts(repository)}
              topOffset="compact"
            />
          </TerasPanel>

          <TerasPanel
            frame="padded"
            treatment="state"
            fit="content"
            spacing="normal"
            tone={receiptTone}
          >
            <TerasPanelHeader
              actions={
                <TerasStatusPill tone={receiptTone}>
                  {receipts.length > 0 ? "recorded" : "source only"}
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description="Latest receipt reference for each Repository command type."
              kicker="Receipt Index"
              title="Receipt coverage"
            />
            <TerasMetadataList
              items={repositoryHistoryReceiptFacts(receipts)}
              topOffset="compact"
            />
          </TerasPanel>
        </TerasZone>
      </TerasZoneLayout>
    </TerasDialog>
  );
}
