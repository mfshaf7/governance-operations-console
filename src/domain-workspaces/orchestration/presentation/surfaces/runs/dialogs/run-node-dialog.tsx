import {
  TerasStatusItem,
  TerasList,
  TerasDialog,
  TerasMetadataList,
} from "@/teras";

import type {
  OrchestrationRunNode,
  OrchestrationRunRecord,
} from "@/domain-workspaces/orchestration/domain/orchestration-run-types";
import {
  formatOrchestrationRunTimestamp,
  orchestrationRunNodeStateLabel,
  orchestrationRunNodeStateTone,
} from "../orchestration-runs-view-model.ts";

export function RunNodeDialog({
  node,
  onClose,
  record,
}: {
  node: OrchestrationRunNode | null;
  onClose: () => void;
  record: OrchestrationRunRecord;
}) {
  if (!node) {
    return null;
  }

  const referenceGroups = [
    {
      detail: referenceSummary(node.inputRefs),
      label: "Inputs",
      refs: node.inputRefs,
    },
    {
      detail: referenceSummary(node.outputRefs),
      label: "Outputs",
      refs: node.outputRefs,
    },
    {
      detail: referenceSummary(node.artifactRefs),
      label: "Artifacts",
      refs: node.artifactRefs,
    },
    {
      detail: referenceSummary(node.logRefs),
      label: "Logs",
      refs: node.logRefs,
    },
    {
      detail: referenceSummary(node.receiptRefs),
      label: "Receipts",
      refs: node.receiptRefs,
    },
  ];

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      closeLabel="Close run node details"
      description={`${record.runId} / ${node.label}`}
      kicker="Execution Progress"
      onClose={onClose}
      open
      width="standard"
      title="Run Node Details"
    >
      <TerasMetadataList
        items={[
          { label: "Node ID", value: node.id },
          { label: "Owner", value: node.owner },
          { label: "Type", value: node.type },
          {
            label: "State",
            tone: orchestrationRunNodeStateTone(node.state),
            value: orchestrationRunNodeStateLabel(node.state),
          },
          { label: "Attempt", value: String(node.attempt) },
          { label: "Duration", value: node.duration ?? "Not recorded" },
          {
            label: "Started",
            value: formatOrchestrationRunTimestamp(node.startedAt),
          },
          {
            label: "Completed",
            value: formatOrchestrationRunTimestamp(node.completedAt),
          },
          {
            label: "Parallel Group",
            value: node.parallelGroup ?? "Not grouped",
          },
          {
            label: "Skip Reason",
            value: node.skipReason ?? "Not skipped",
          },
        ]}
      />

      <TerasList>
        {referenceGroups.map((group) => (
          <TerasStatusItem
            detail={group.detail}
            key={group.label}
            label={group.label}
            status={`${group.refs.length} refs`}
            tone={group.refs.length > 0 ? "info" : "muted"}
          />
        ))}
      </TerasList>
    </TerasDialog>
  );
}

function referenceSummary(refs: string[]) {
  return refs.length > 0 ? refs.join(" / ") : "No references recorded";
}
