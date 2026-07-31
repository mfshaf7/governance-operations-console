"use client";

import {
  TerasStatusItem,
  TerasDialog,
  TerasEmptyState,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasList,
  TerasStatusPill,
  TerasTimeline,
  TerasTimelineItem,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeProjectedReceipt } from "../../../read-model/prototype-workspace-read-model.ts";
import { prototypeLifecycleStatus } from "../../shared/prototype-record-display-model.ts";
import {
  prototypeHistoryArchiveFacts,
  prototypeHistoryEvidenceRows,
  prototypeHistoryEvidenceRowsTone,
  prototypeHistoryReceiptFacts,
  prototypeHistoryRecordEvidenceTone,
  prototypeHistoryTimelineRows,
} from "./prototype-history-view-model.ts";

export function PrototypeHistoryModal({
  onClose,
  receipts,
  record,
}: {
  onClose: () => void;
  receipts: PrototypeProjectedReceipt[];
  record: PrototypeRecord | null;
}) {
  if (!record) {
    return null;
  }

  const timelineRows = prototypeHistoryTimelineRows(record, receipts);
  const evidenceRows = prototypeHistoryEvidenceRows(record);
  const lifecycleStatus = prototypeLifecycleStatus(record);
  const terminal =
    record.lifecycle === "retired" || record.lifecycle === "graduated";
  const receiptTone = receipts.length > 0 ? "info" : "muted";
  const evidencePanelTone = prototypeHistoryRecordEvidenceTone(record);
  const evidenceRowsTone = prototypeHistoryEvidenceRowsTone(evidenceRows);

  return (
    <TerasDialog
      contentOverflow="hidden"
      height="fill"
      width="large"
      closeLabel="Close Prototype history"
      description="Read-only archive for retained receipts, evidence, lifecycle posture, and movement context."
      kicker="Prototype Archive"
      onClose={onClose}
      open
      title="Prototype History"
    >
      <TerasZoneLayout data-prototype-history-modal="true" variant="main-aside">
        <TerasZone fit="fill">
          <TerasPanel
            frame="padded"
            treatment="state"
            fit="content"
            spacing="normal"
            tone={evidencePanelTone}
          >
            <TerasPanelHeader
              actions={
                <TerasStatusPill tone={evidenceRowsTone}>
                  {evidenceRows.length} refs
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description="Retained proof references, baseline evidence refs, preview proof, and linked records."
              kicker="Evidence Archive"
              title="Retained evidence"
            />
            <TerasList frame="contained">
              {evidenceRows.map((row) => (
                <TerasStatusItem
                  tone={row.tone}
                  detail={row.detail}
                  key={`${row.label}-${row.status}`}
                  label={row.label}
                  status={row.status}
                />
              ))}
            </TerasList>
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
                  {timelineRows.length} events
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description="Recorded source and prototype-local receipt events in their retained order."
              kicker="Receipt Timeline"
              title="Receipt trail"
            />
            {timelineRows.length > 0 ? (
              <TerasTimeline ariaLabel="Prototype receipt timeline">
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
              <TerasEmptyState>
                No recorded receipt event is available.
              </TerasEmptyState>
            )}
          </TerasPanel>
        </TerasZone>

        <TerasZone fit="content">
          <TerasPanel
            frame="padded"
            treatment="neutral"
            fit="content"
            spacing="normal"
          >
            <TerasPanelHeader
              actions={
                <TerasStatusPill tone={lifecycleStatus.tone}>
                  {lifecycleStatus.label}
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description="Read-only lifecycle and workflow posture for this prototype record."
              kicker="Archive Posture"
              title={record.id}
            />
            <TerasMetadataList
              items={prototypeHistoryArchiveFacts({
                lifecycleStatusLabel: lifecycleStatus.label,
                record,
                terminal,
              })}
              topOffset="compact"
            />
          </TerasPanel>

          <TerasPanel
            frame="padded"
            treatment="neutral"
            fit="content"
            spacing="normal"
          >
            <TerasPanelHeader
              actions={
                <TerasStatusPill tone={receiptTone}>
                  {receipts.length} receipts
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description="Prototype-local and imported source receipts retained for review."
              kicker="Receipt Archive"
              title="Receipt sources"
            />
            {receipts.length ? (
              <TerasMetadataList
                items={prototypeHistoryReceiptFacts(receipts)}
                topOffset="compact"
              />
            ) : (
              <TerasEmptyState>
                No prototype-local or registry receipt is recorded yet.
              </TerasEmptyState>
            )}
          </TerasPanel>
        </TerasZone>
      </TerasZoneLayout>
    </TerasDialog>
  );
}
