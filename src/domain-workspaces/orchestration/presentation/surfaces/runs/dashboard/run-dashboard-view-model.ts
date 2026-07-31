import type { OperationTone } from "../../../../../operation-projections/index.ts";
import type { OrchestrationRunScenarioOverlay } from "../../../../local-runtime/run-control/run-control-simulator.ts";
import type { OrchestrationRunControlReceipt } from "../../../../work-model/run-control/run-control-types.ts";
import type { OrchestrationRunRecord } from "@/domain-workspaces/orchestration/domain/orchestration-run-types";
import {
  formatOrchestrationRunTimestamp,
  orchestrationRunCurrentNode,
  orchestrationRunEffectPostureLabel,
  orchestrationRunEffectPostureTone,
  orchestrationRunStateLabel,
  orchestrationRunStateTone,
} from "../orchestration-runs-view-model.ts";

export type OrchestrationRunEvidenceInspectorId =
  | "artifacts"
  | "logs"
  | "receipts"
  | "runtime-diagnostics"
  | "source-projection";

export type OrchestrationRunConditionProjection = {
  description: string;
  facts: Array<{
    label: string;
    tone?: OperationTone;
    value: string;
  }>;
  statusLabel: string;
  title: string;
  tone: OperationTone;
};

export function orchestrationRunDashboardFacts(record: OrchestrationRunRecord) {
  return [
    { label: "Run ID", value: record.runId },
    { label: "Request ID", value: record.requestId },
    {
      label: "Definition",
      value: `${record.definitionId} / v${record.definitionVersion}`,
    },
    {
      label: "Run State",
      tone: orchestrationRunStateTone(record.state),
      value: orchestrationRunStateLabel(record.state),
    },
    {
      label: "Business State",
      value: `${record.businessState.sourceDomain} / ${record.businessState.label}`,
    },
    {
      label: "Effect Posture",
      tone: orchestrationRunEffectPostureTone(record.effectPosture),
      value: orchestrationRunEffectPostureLabel(record.effectPosture),
    },
    { label: "Source Record", value: record.sourceRecordRef },
    { label: "Correlation", value: record.correlationRef },
  ];
}

export function orchestrationRunConditionProjection(
  record: OrchestrationRunRecord,
): OrchestrationRunConditionProjection {
  const currentNode = orchestrationRunCurrentNode(record);

  switch (record.state) {
    case "queued":
      return condition(
        "Awaiting scheduling",
        "The accepted request has no recorded effects and is waiting for an execution slot.",
        record,
        [
          {
            label: "Scheduling Owner",
            value: "Operator Orchestration Service",
          },
          {
            label: "Created",
            value: formatOrchestrationRunTimestamp(record.createdAt),
          },
        ],
      );
    case "running":
      return condition(
        currentNode?.label ?? "Run in progress",
        "The current node is executing against the immutable source request.",
        record,
        [
          { label: "Node Owner", value: currentNode?.owner ?? "Not projected" },
          { label: "Attempt", value: String(currentNode?.attempt ?? 0) },
          {
            label: "Started",
            value: formatOrchestrationRunTimestamp(
              currentNode?.startedAt ?? null,
            ),
          },
        ],
      );
    case "waiting":
      return condition(
        "Structured wait",
        record.wait?.reason ?? "The run is waiting on a structured condition.",
        record,
        [
          { label: "Wait Kind", value: record.wait?.kind ?? "Not projected" },
          { label: "Owner", value: record.wait?.owner ?? "Not projected" },
          {
            label: "Expected Reference",
            value: record.wait?.expectedRef ?? "Not projected",
          },
          {
            label: "Deadline",
            value: formatOrchestrationRunTimestamp(
              record.wait?.deadline ?? null,
            ),
          },
        ],
      );
    case "blocked":
      return condition(
        "Remediation required",
        record.blocker?.detail ?? "The run is blocked.",
        record,
        [
          { label: "Owner", value: record.blocker?.owner ?? "Not projected" },
          {
            label: "Remediation",
            value: record.blocker?.remediation ?? "Correct at source",
          },
          {
            label: "Supported Dispositions",
            value:
              record.blocker?.supportedDispositions.join(", ") ??
              "No disposition projected",
          },
        ],
      );
    case "failed":
      return condition(
        "Execution failed",
        record.failure?.detail ?? "The run failed.",
        record,
        [
          { label: "Owner", value: record.failure?.owner ?? "Not projected" },
          {
            label: "Retry",
            value: record.retry.available
              ? `${record.retry.attempts}/${record.retry.maxAttempts} attempts`
              : "Unavailable",
          },
          {
            label: "Next Eligible",
            value: formatOrchestrationRunTimestamp(record.retry.nextEligibleAt),
          },
        ],
      );
    case "completed":
      return condition(
        "Verified result",
        "The final result and retained effects are verified by the recorded receipt.",
        record,
        [
          {
            label: "Receipt",
            value: record.receipt?.receiptId ?? "Receipt unavailable",
          },
          {
            label: "Outcome",
            value: record.receipt?.outcome ?? "Not projected",
          },
          {
            label: "Completed",
            value: formatOrchestrationRunTimestamp(record.completedAt),
          },
        ],
      );
    case "cancelled":
      return condition(
        "Run cancelled",
        "Future nodes stopped, while retained effects remain visible and are not rolled back.",
        record,
        [
          {
            label: "Receipt",
            value: record.receipt?.receiptId ?? "Receipt unavailable",
          },
          {
            label: "Outcome",
            value: record.receipt?.outcome ?? "Not projected",
          },
          {
            label: "Recorded",
            value: formatOrchestrationRunTimestamp(record.completedAt),
          },
        ],
      );
  }
}

export function orchestrationRunLocalOverlayFacts(
  record: OrchestrationRunRecord,
  overlay: OrchestrationRunScenarioOverlay,
) {
  return [
    {
      label: "Source State",
      tone: orchestrationRunStateTone(record.state),
      value: orchestrationRunStateLabel(record.state),
    },
    {
      label: "Local Projection",
      tone: orchestrationRunStateTone(overlay.state),
      value: orchestrationRunStateLabel(overlay.state),
    },
    { label: "Receipt", value: overlay.lastReceiptId },
    {
      label: "Recorded",
      value: formatOrchestrationRunTimestamp(overlay.updatedAt),
    },
  ];
}

export function orchestrationRunEvidenceInspectorRows(
  record: OrchestrationRunRecord,
  controlReceipts: readonly OrchestrationRunControlReceipt[],
) {
  const artifacts = unique([
    ...record.artifactRefs,
    ...record.nodes.flatMap((node) => node.artifactRefs),
  ]);
  const logs = unique([
    ...record.logRefs,
    ...record.nodes.flatMap((node) => node.logRefs),
  ]);
  const receipts = unique([
    ...(record.receipt ? [record.receipt.ref] : []),
    ...record.nodes.flatMap((node) => node.receiptRefs),
    ...controlReceipts.map((receipt) => receipt.receiptId),
  ]);

  return [
    inspector(
      "artifacts",
      "Artifacts",
      "Recorded output and retained artifact references.",
      `${artifacts.length} refs`,
      artifacts.length > 0 ? "info" : "muted",
    ),
    inspector(
      "logs",
      "Operator-safe Logs",
      "Bounded execution-output references safe for operator inspection.",
      `${logs.length} refs`,
      logs.length > 0 ? "info" : "muted",
    ),
    inspector(
      "receipts",
      "Receipts",
      "Accepted, terminal, node, and local control receipt references.",
      `${receipts.length} refs`,
      receipts.length > 0 ? "info" : "muted",
    ),
    inspector(
      "source-projection",
      "Source Projection",
      "Versioned source-domain projection and authority facts.",
      record.source.freshness,
      record.source.freshness === "current" ? "ok" : "stale",
    ),
    inspector(
      "runtime-diagnostics",
      "Runtime Diagnostics",
      "Adapter and worker posture without claiming a live durable runtime.",
      record.runtimeDiagnostics.state,
      record.runtimeDiagnostics.state === "synthetic" ? "info" : "warn",
    ),
  ] satisfies Array<{
    detail: string;
    id: OrchestrationRunEvidenceInspectorId;
    label: string;
    status: string;
    tone: OperationTone;
  }>;
}

function condition(
  title: string,
  description: string,
  record: OrchestrationRunRecord,
  facts: OrchestrationRunConditionProjection["facts"],
): OrchestrationRunConditionProjection {
  return {
    description,
    facts: [
      ...facts,
      {
        label: "Effect Posture",
        tone: orchestrationRunEffectPostureTone(record.effectPosture),
        value: orchestrationRunEffectPostureLabel(record.effectPosture),
      },
    ],
    statusLabel: orchestrationRunStateLabel(record.state),
    title,
    tone: orchestrationRunStateTone(record.state),
  };
}

function inspector(
  id: OrchestrationRunEvidenceInspectorId,
  label: string,
  detail: string,
  status: string,
  tone: OperationTone,
) {
  return { detail, id, label, status, tone };
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
