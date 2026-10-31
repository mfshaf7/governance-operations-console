"use client";

import {
  TerasDialog,
  TerasContentRegion,
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
import type { RepositoryLifecycleAudit, RepositoryLifecycleLiveSnapshot } from "../../../live-runtime/repository-lifecycle-live-types.ts";
import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
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
  lifecycleAudit,
  onClose,
  receipts,
  repository,
  custodyResults = [],
  custodySourceStatus = "current",
  custodySourceError,
  lifecycleSnapshot,
  lifecycleError,
  liveMode = false,
}: {
  lifecycleAudit: RepositoryLifecycleAudit | null;
  onClose: () => void;
  receipts: RepositoryRuntimeReceipt[];
  repository: RepositoryWorkspaceRecord | null;
  custodyResults?: RepositoryCustodyWorkflowResult[];
  custodySourceStatus?: "loading" | "current" | "offline";
  custodySourceError?: string | null;
  lifecycleSnapshot?: RepositoryLifecycleLiveSnapshot;
  lifecycleError?: string;
  liveMode?: boolean;
}) {
  if (!repository) {
    return null;
  }

  const timelineRows = repositoryHistoryTimelineRows(receipts, lifecycleAudit, custodyResults);
  const loading = liveMode && !lifecycleSnapshot && !lifecycleError;
  const partial = liveMode && (Boolean(lifecycleError) || lifecycleSnapshot?.status === "offline" || custodySourceStatus !== "current");
  const coverage = partial ? "Partial history" : loading ? "Loading history" : "Loaded history";
  const coverageDescription = lifecycleError
    ? `Lifecycle history is unavailable: ${lifecycleError} Other retained receipts remain visible.`
    : custodySourceStatus === "offline"
      ? `Custody history could not be refreshed: ${custodySourceError ?? "Owner read unavailable"}. Previously loaded evidence remains visible.`
      : loading ? "Loading owner lifecycle history. Retained receipts remain visible."
        : "Recorded provisioning, existing-source linkage, lifecycle and local setup receipts. Their original sources remain distinct.";
  const recordTone = repositoryRecordTone(repository);
  const receiptTone = timelineRows.length > 0 ? "ok" : "muted";

  return (
    <TerasDialog
      closeLabel="Close Repository history"
      description="Read-only Repository history from retained owner receipts and local setup evidence."
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
                <TerasStatusPill tone={partial ? "warn" : "info"}>
                  {timelineRows.length} {timelineRows.length === 1 ? "receipt" : "receipts"} · {coverage}
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description={coverageDescription}
              kicker="Receipt Timeline"
              title="Receipt trail"
            />
            {timelineRows.length > 0 ? (
              <TerasContentRegion scroll>
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
              </TerasContentRegion>
            ) : (
              <TerasEmptyState fill>
                {loading ? "Loading owner history…" : partial
                  ? "Some history is unavailable. No receipts are loaded from the remaining sources."
                  : "No receipts were returned by the loaded history sources."}
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
                  {timelineRows.length > 0 ? "recorded" : "source only"}
                </TerasStatusPill>
              }
              actionsLayout="inline"
              description="Latest receipt reference for each Repository command type."
              kicker="Receipt Index"
              title="Receipt coverage"
            />
            <TerasMetadataList
              items={repositoryHistoryReceiptFacts(receipts, lifecycleAudit, custodyResults)}
              topOffset="compact"
            />
          </TerasPanel>
        </TerasZone>
      </TerasZoneLayout>
    </TerasDialog>
  );
}
