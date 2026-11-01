"use client";

import {
  TerasDialog,
  TerasEmptyState,
  TerasTimeline,
  TerasTimelineItem,
} from "@/teras";

import type { OrchestrationDefinitionRecord } from "@/domain-workspaces/orchestration/domain/orchestration-definition-types";
import {
  formatOrchestrationDefinitionTimestamp,
  orchestrationDefinitionLifecycleLabel,
} from "../orchestration-definitions-view-model.ts";
import { orchestrationDefinitionVersionHistoryTone } from "../dashboard/definition-dashboard-view-model.ts";

export function DefinitionVersionHistoryDialog({
  onClose,
  open,
  record,
}: {
  onClose: () => void;
  open: boolean;
  record: OrchestrationDefinitionRecord;
}) {
  return (
    <TerasDialog
      contentOverflow="hidden"
      description={record.source.mode === "live-authority" ? "Versions supplied by the owner catalog. This catalog provides its current version, not a complete historical archive." : "Immutable definition versions retained by the current family projection."}
      height="fill"
      kicker="Definition Archive"
      onClose={onClose}
      open={open}
      title="Definition Version History"
      width="large"
    >
      {record.versionHistory.length > 0 ? (
        <TerasTimeline>
          {record.versionHistory.map((entry) => (
            <TerasTimelineItem
              detail={entry.summary}
              displayTimestamp={formatOrchestrationDefinitionTimestamp(
                entry.recordedAt,
              )}
              key={`${record.definitionId}-${entry.version}-${entry.recordedAt}`}
              label={`Version ${entry.version}`}
              status={orchestrationDefinitionLifecycleLabel(entry.lifecycle)}
              timestamp={entry.recordedAt ?? undefined}
              tone={orchestrationDefinitionVersionHistoryTone(entry.lifecycle)}
            />
          ))}
        </TerasTimeline>
      ) : (
        <TerasEmptyState>
          No earlier definition versions are present in this projection.
        </TerasEmptyState>
      )}
    </TerasDialog>
  );
}
