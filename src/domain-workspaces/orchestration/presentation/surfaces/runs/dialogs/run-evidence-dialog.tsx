import {
  TerasStatusItem,
  TerasList,
  TerasDialog,
  TerasEmptyState,
  TerasMetadataList,
} from "@/teras";

import type { OrchestrationRunRecord } from "@/domain-workspaces/orchestration/domain/orchestration-run-types";
import type { OrchestrationRunControlReceipt } from "../../../../work-model/run-control/run-control-types.ts";
import {
  formatOrchestrationRunTimestamp,
  orchestrationRunStateLabel,
  orchestrationRunStateTone,
} from "../orchestration-runs-view-model.ts";
import type { OrchestrationRunEvidenceInspectorId } from "../dashboard/run-dashboard-view-model.ts";

type EvidenceRow = {
  detail: string;
  label: string;
  status: string;
  tone: "danger" | "info" | "muted" | "ok" | "stale" | "warn";
};

export function RunEvidenceDialog({
  controlReceipts,
  inspector,
  onClose,
  record,
}: {
  controlReceipts: OrchestrationRunControlReceipt[];
  inspector: OrchestrationRunEvidenceInspectorId | null;
  onClose: () => void;
  record: OrchestrationRunRecord;
}) {
  if (!inspector) {
    return null;
  }

  const projection = evidenceProjection(record, inspector, controlReceipts);

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      closeLabel="Close run evidence"
      description={projection.description}
      kicker="Orchestration Run"
      onClose={onClose}
      open
      width="wide"
      title="Run Evidence"
    >
      <TerasMetadataList items={projection.facts} />
      {projection.rows.length > 0 ? (
        <TerasList>
          {projection.rows.map((row, index) => (
            <TerasStatusItem
              detail={row.detail}
              index={String(index + 1).padStart(2, "0")}
              key={`${row.label}-${row.detail}`}
              label={row.label}
              status={row.status}
              tone={row.tone}
            />
          ))}
        </TerasList>
      ) : inspector === "artifacts" ||
        inspector === "logs" ||
        inspector === "receipts" ? (
        <TerasEmptyState>
          No evidence references are recorded for this inspector.
        </TerasEmptyState>
      ) : null}
    </TerasDialog>
  );
}

function evidenceProjection(
  record: OrchestrationRunRecord,
  inspector: OrchestrationRunEvidenceInspectorId,
  controlReceipts: OrchestrationRunControlReceipt[],
) {
  switch (inspector) {
    case "artifacts": {
      const runRefs = unique(record.artifactRefs);
      const nodeRefs = unique(
        record.nodes.flatMap((node) => node.artifactRefs),
      );

      return {
        description:
          "Retained run and node artifact references from the aggregate run projection.",
        facts: [
          { label: "Run", value: record.runId },
          { label: "Run Artifacts", value: String(runRefs.length) },
          { label: "Node Artifacts", value: String(nodeRefs.length) },
          { label: "Source Version", value: record.sourceProjectionVersion },
        ],
        rows: [
          ...referenceRows(runRefs, "Run Artifact", "artifact"),
          ...referenceRows(nodeRefs, "Node Artifact", "artifact"),
        ],
      };
    }
    case "logs": {
      const runRefs = unique(record.logRefs);
      const nodeRefs = unique(record.nodes.flatMap((node) => node.logRefs));

      return {
        description:
          "Operator-safe log references only. Raw runtime output is not embedded in the run projection.",
        facts: [
          { label: "Run", value: record.runId },
          { label: "Run Logs", value: String(runRefs.length) },
          { label: "Node Logs", value: String(nodeRefs.length) },
          { label: "Authority", value: record.source.authority },
        ],
        rows: [
          ...referenceRows(runRefs, "Run Log", "operator-safe"),
          ...referenceRows(nodeRefs, "Node Log", "operator-safe"),
        ],
      };
    }
    case "receipts": {
      const finalRows: EvidenceRow[] = record.receipt
        ? [
            {
              detail: record.receipt.ref,
              label: record.receipt.receiptId,
              status: record.receipt.verified ? "verified" : "unverified",
              tone: record.receipt.verified ? "ok" : "warn",
            },
          ]
        : [];
      const nodeRows = referenceRows(
        unique(record.nodes.flatMap((node) => node.receiptRefs)),
        "Node Receipt",
        "recorded",
      );
      const controlRows: EvidenceRow[] = controlReceipts.map((receipt) => ({
        detail: receipt.summary,
        label: receipt.receiptId,
        status: orchestrationRunStateLabel(receipt.resultingRunState),
        tone: orchestrationRunStateTone(receipt.resultingRunState),
      }));

      return {
        description:
          "Final, node, and prototype-local control receipts remain distinct from events and logs.",
        facts: [
          { label: "Run", value: record.runId },
          {
            label: "Final Receipt",
            value: record.receipt?.receiptId ?? "Not recorded",
          },
          {
            label: "Local Control Receipts",
            value: String(controlRows.length),
          },
          {
            label: "Recorded",
            value: formatOrchestrationRunTimestamp(
              record.receipt?.recordedAt ?? null,
            ),
          },
        ],
        rows: [...finalRows, ...nodeRows, ...controlRows],
      };
    }
    case "source-projection":
      return {
        description:
          "Versioned source-domain projection facts used by the Console read model.",
        facts: [
          { label: "Authority", value: record.source.authority },
          { label: "Source Ref", value: record.source.ref },
          { label: "Source Record", value: record.sourceRecordRef },
          { label: "Projection Ref", value: record.sourceProjectionRef },
          {
            label: "Projection Version",
            value: record.sourceProjectionVersion,
          },
          { label: "Source Version", value: record.source.sourceVersion },
          { label: "Schema Version", value: record.source.schemaVersion },
          {
            label: "Observed",
            value: formatOrchestrationRunTimestamp(record.source.observedAt),
          },
          { label: "Freshness", value: record.source.freshness },
          { label: "Mode", value: record.source.mode },
        ],
        rows: [],
      };
    case "runtime-diagnostics":
      return {
        description:
          "Bounded adapter and worker diagnostics without a live durable-runtime claim.",
        facts: [
          { label: "Adapter", value: record.runtimeDiagnostics.adapter },
          { label: "Worker", value: record.runtimeDiagnostics.worker },
          { label: "State", value: record.runtimeDiagnostics.state },
          {
            label: "Live Runtime",
            value: record.runtimeDiagnostics.liveRuntimeClaimed
              ? "claimed"
              : "not claimed",
          },
          { label: "Detail", value: record.runtimeDiagnostics.detail },
        ],
        rows: [],
      };
  }
}

function referenceRows(
  refs: string[],
  label: string,
  status: string,
): EvidenceRow[] {
  return refs.map((ref, index) => ({
    detail: ref,
    label: `${label} ${index + 1}`,
    status,
    tone: "info",
  }));
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
