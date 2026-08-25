import type { TerasMetadataItem } from "@/teras";
import type {
  DeliveryTone,
  DeliveryWorkDesignSnapshotAttachmentDisplayStatus,
} from "../../../../read-model/index.ts";
import { formatWorkDesignDateTime } from "./work-design-display-formatters.ts";
import type { WorkDesignLiveMode } from "../../../../live-runtime/work-design-live-types.ts";

export function workDesignApplyReadinessRows({
  applyTargetRecordRef,
  hasUnsavedSessionChanges,
  draftReviewAccepted,
  snapshotAction,
  snapshotStatus,
  sourceApplyComplete,
}: {
  applyTargetRecordRef: string;
  hasUnsavedSessionChanges: boolean;
  draftReviewAccepted: boolean;
  snapshotAction: string;
  snapshotStatus: DeliveryWorkDesignSnapshotAttachmentDisplayStatus;
  sourceApplyComplete: boolean;
}): Array<{
  detail: string;
  label: string;
  status: string;
  tone: DeliveryTone;
}> {
  const snapshotReady =
    snapshotStatus === "attached" ||
    snapshotStatus === "pending_apply" ||
    snapshotStatus === "local_preview";

  if (sourceApplyComplete) {
    return [
      {
        detail:
          "Source read model already records operator review acceptance for this Work Design pass.",
        label: "Review Acceptance",
        status: "complete",
        tone: "ok",
      },
      {
        detail: `Source completion resolves to ${applyTargetRecordRef}.`,
        label: "Target Record",
        status: "ready",
        tone: "ok",
      },
      {
        detail: `${snapshotAction} is retained with the source completion evidence.`,
        label: "Snapshot Action",
        status: "complete",
        tone: "ok",
      },
      {
        detail:
          "Completed source records are read-only in this Work Design session.",
        label: "Dirty State",
        status: "clear",
        tone: "ok",
      },
    ];
  }

  return [
    {
      detail: draftReviewAccepted
        ? "Operator review acceptance is recorded for the current draft."
        : "Review Draft must be accepted before Apply Draft can submit.",
      label: "Review Acceptance",
      status: draftReviewAccepted ? "passed" : "blocked",
      tone: draftReviewAccepted ? "ok" : "warn",
    },
    {
      detail: `Submit target resolves to ${applyTargetRecordRef}.`,
      label: "Target Record",
      status: applyTargetRecordRef ? "ready" : "blocked",
      tone: applyTargetRecordRef ? "ok" : "warn",
    },
    {
      detail: `${snapshotAction} during the apply run.`,
      label: "Snapshot Action",
      status: snapshotReady ? "ready" : "blocked",
      tone: snapshotReady ? "ok" : "warn",
    },
    {
      detail: hasUnsavedSessionChanges
        ? "Unsaved local edits exist; return to the draft before apply."
        : "No unsaved Work Design edits are waiting outside this apply intent.",
      label: "Dirty State",
      status: hasUnsavedSessionChanges ? "blocked" : "clear",
      tone: hasUnsavedSessionChanges ? "warn" : "ok",
    },
  ];
}

export function workDesignApplyBackendChecklistRows({
  applyReceiptRecorded,
  applyReady,
  applyTargetRecordRef,
  snapshotAction,
  sourceApplyComplete,
  runtimeError,
  runtimeMode,
}: {
  applyReceiptRecorded: boolean;
  applyReady: boolean;
  applyTargetRecordRef: string;
  snapshotAction: string;
  sourceApplyComplete: boolean;
  runtimeError: string | null;
  runtimeMode: WorkDesignLiveMode;
}): Array<{
  detail: string;
  label: string;
  status: string;
  tone: DeliveryTone;
}> {
  const applyComplete = applyReceiptRecorded || sourceApplyComplete;
  const backendReadyTone: DeliveryTone = applyComplete
    ? "ok"
    : applyReady
      ? "warn"
      : "muted";
  const backendReadyStatus = applyComplete
    ? "complete"
    : applyReady
      ? "queued"
      : "locked";

  if (sourceApplyComplete) {
    return [
      {
        detail: `Source completion resolves the draft input to ${applyTargetRecordRef}.`,
        label: "Validate Apply Input",
        status: "complete",
        tone: "ok",
      },
      {
        detail:
          "Source read model already carries the accepted Work Design update.",
        label: "Submit Apply Request",
        status: "complete",
        tone: "ok",
      },
      {
        detail:
          "Governance checks are represented by the completed source projection.",
        label: "Run Governance Checks",
        status: "complete",
        tone: "ok",
      },
      {
        detail:
          "Backend status is already projected as Done for this Work Design pass.",
        label: "Update Backend Record",
        status: "complete",
        tone: "ok",
      },
      {
        detail: `${snapshotAction} is retained with the completed source evidence.`,
        label: "Attach Snapshot Evidence",
        status: "complete",
        tone: "ok",
      },
      {
        detail: `Source projection is available for ${applyTargetRecordRef}; History provides the read-only proof trail.`,
        label: "Return Receipt And Projection",
        status: "complete",
        tone: "ok",
      },
    ];
  }

  if (runtimeError) {
    return [
      {
        detail: `Draft input remains bound to ${applyTargetRecordRef}.`,
        label: "Validate Apply Input",
        status: "complete",
        tone: "ok",
      },
      {
        detail: runtimeError,
        label: "Submit Apply Request",
        status: "blocked",
        tone: "warn",
      },
      ...[
        "Run Governance Checks",
        "Update Backend Record",
        "Attach Snapshot Evidence",
        "Return Receipt And Projection",
      ].map((label) => ({
        detail: "This step did not run because the governed apply request stopped.",
        label,
        status: "locked",
        tone: "muted" as DeliveryTone,
      })),
    ];
  }

  return [
    {
      detail: applyReceiptRecorded
        ? `Draft input resolved to ${applyTargetRecordRef}.`
        : applyReady
          ? "The apply run validates the draft reference, target record, snapshot action, and dirty-state boundary as step 1."
          : "Apply inputs must be ready before the backend sequence can start.",
      label: "Validate Apply Input",
      status: applyReceiptRecorded
        ? "complete"
        : applyReady
          ? "ready"
          : "locked",
      tone: applyReceiptRecorded ? "ok" : "warn",
    },
    {
      detail: applyReceiptRecorded
        ? runtimeMode === "live"
          ? "OOS accepted the operator-approved Work Design update."
          : "Preview runtime accepted the Work Design update intent."
        : applyReady
          ? "Operator approval will submit the work-design update request."
          : "Apply request waits for ready apply inputs.",
      label: "Submit Apply Request",
      status: applyReceiptRecorded
        ? "complete"
        : applyReady
          ? "queued"
          : "locked",
      tone: applyReceiptRecorded ? "ok" : applyReady ? "warn" : "muted",
    },
    {
      detail: applyReceiptRecorded
        ? "Readiness and route checks returned clean."
        : applyReady
          ? "Governance and route checks run after the apply request is accepted."
          : "Governance checks are not started.",
      label: "Run Governance Checks",
      status: backendReadyStatus,
      tone: backendReadyTone,
    },
    {
      detail: applyReceiptRecorded
        ? runtimeMode === "live"
          ? "OOS reconciled the accepted Work Design update with canonical Delivery."
          : "Preview runtime recorded the accepted Work Design update."
        : applyReady
          ? "The accepted update will route to the current backend adapter."
          : "Backend update is locked.",
      label: "Update Backend Record",
      status: backendReadyStatus,
      tone: backendReadyTone,
    },
    {
      detail: applyReceiptRecorded
        ? `${snapshotAction} completed for the target package record.`
        : applyReady
          ? `${snapshotAction} will run after the backend accepts the update.`
          : "Snapshot evidence waits for a valid apply intent.",
      label: "Attach Snapshot Evidence",
      status: backendReadyStatus,
      tone: backendReadyTone,
    },
    {
      detail: applyReceiptRecorded
        ? `${runtimeMode === "live" ? "Durable OOS" : "Preview"} receipt accepted for ${applyTargetRecordRef}; projection proof is available in Session History.`
        : applyReady
          ? "Final proof appears after the backend returns an apply receipt."
          : "Receipt proof is not available yet.",
      label: "Return Receipt And Projection",
      status: applyReceiptRecorded
        ? "complete"
        : applyReady
          ? "queued"
          : "locked",
      tone: applyReceiptRecorded ? "ok" : applyReady ? "warn" : "muted",
    },
  ];
}

export function workDesignApplyExecutionLogLines({
  applyReceiptRecorded,
  applyReady,
  applyTargetRecordRef,
  draftRef,
  recordedAt,
  snapshotAction,
  sourceApplyComplete,
  runtimeError,
  runtimeMode,
}: {
  applyReceiptRecorded: boolean;
  applyReady: boolean;
  applyTargetRecordRef: string;
  draftRef: string;
  recordedAt: string;
  snapshotAction: string;
  sourceApplyComplete: boolean;
  runtimeError: string | null;
  runtimeMode: WorkDesignLiveMode;
}): Array<{
  marker: string;
  text: string;
  timestamp: string;
  tone: DeliveryTone;
}> {
  if (sourceApplyComplete) {
    return [
      {
        marker: "[ok]",
        text: `Source read model marks ${draftRef} complete for ${applyTargetRecordRef}.`,
        timestamp: recordedAt,
        tone: "ok",
      },
      {
        marker: "[ok]",
        text: "Completed source projection is read-only inside this Work Design session.",
        timestamp: recordedAt,
        tone: "ok",
      },
      {
        marker: "[ok]",
        text: `${snapshotAction} is retained as completed Work Design evidence.`,
        timestamp: recordedAt,
        tone: "ok",
      },
    ];
  }

  if (runtimeError) {
    return [
      {
        marker: "[ok]",
        text: `Validated ${draftRef} against ${applyTargetRecordRef}.`,
        timestamp: recordedAt,
        tone: "ok",
      },
      {
        marker: "[!!]",
        text: runtimeError,
        timestamp: recordedAt,
        tone: "warn",
      },
      {
        marker: "[..]",
        text: "No completion state is projected without a durable apply receipt.",
        timestamp: recordedAt,
        tone: "muted",
      },
    ];
  }

  if (!applyReady && !applyReceiptRecorded) {
    return [
      {
        marker: "[..]",
        text: "Apply run idle. Review acceptance and clean apply inputs are required before submit.",
        timestamp: recordedAt,
        tone: "muted",
      },
      {
        marker: "[..]",
        text: "No apply request, backend write, snapshot attach, or projection refresh has started.",
        timestamp: recordedAt,
        tone: "muted",
      },
    ];
  }

  if (!applyReceiptRecorded) {
    return [
      {
        marker: "[..]",
        text: `Ready to submit ${draftRef} for ${applyTargetRecordRef}.`,
        timestamp: recordedAt,
        tone: "warn",
      },
      {
        marker: "[..]",
        text: "One approval will run validation, apply submit, governance checks, backend update, snapshot attach, and receipt return.",
        timestamp: recordedAt,
        tone: "warn",
      },
      {
        marker: "[..]",
        text: "No backend write has been performed yet.",
        timestamp: recordedAt,
        tone: "muted",
      },
    ];
  }

  return [
    {
      marker: "[ok]",
      text: `${runtimeMode === "live" ? "OOS" : "Preview runtime"} accepted apply intent for ${draftRef}.`,
      timestamp: recordedAt,
      tone: "ok",
    },
    {
      marker: "[ok]",
      text: `Apply submit completed for ${applyTargetRecordRef}.`,
      timestamp: recordedAt,
      tone: "ok",
    },
    {
      marker: "[ok]",
      text: "Readiness and route checks completed cleanly.",
      timestamp: recordedAt,
      tone: "ok",
    },
    {
      marker: "[ok]",
      text:
        runtimeMode === "live"
          ? "OOS reconciled the Work Design update with canonical Delivery."
          : "Preview runtime recorded the Work Design update locally.",
      timestamp: recordedAt,
      tone: "ok",
    },
    {
      marker: "[ok]",
      text: `${snapshotAction} completed for the target package record.`,
      timestamp: recordedAt,
      tone: "ok",
    },
    {
      marker: "[ok]",
      text: "Receipt and projection refresh proof are available in Session History.",
      timestamp: recordedAt,
      tone: "ok",
    },
  ];
}

export function workDesignApplyLogRows(
  applyExecutionLogLines: Array<{
    marker: string;
    text: string;
    timestamp: string;
    tone: DeliveryTone;
  }>,
) {
  return applyExecutionLogLines.map((line) => ({
    detail: line.text,
    formattedTimestamp: formatWorkDesignDateTime(line.timestamp),
    marker: line.marker,
    timestamp: line.timestamp,
    tone: line.tone,
  }));
}

export function workDesignApplyHeaderProjection({
  applyReady,
  applyReceiptRecorded,
  sourceApplyComplete,
}: {
  applyReady: boolean;
  applyReceiptRecorded: boolean;
  sourceApplyComplete: boolean;
}) {
  const applyComplete = applyReceiptRecorded || sourceApplyComplete;

  return {
    applyComplete,
    description: applyReceiptRecorded
      ? "The accepted receipt is captured in the final checklist step and retained in Session History."
      : sourceApplyComplete
        ? "Source read model already marks this Work Design pass Done. This view is read-only evidence."
        : applyReady
          ? "One operator approval starts validation, backend update, snapshot attach, and receipt return."
          : "Resolve the apply inputs before the update can start.",
    statusLabel: applyReceiptRecorded
      ? "receipt"
      : sourceApplyComplete
        ? "source done"
        : applyReady
          ? "armed"
          : "locked",
    title: applyComplete ? "Apply Complete" : "Apply Sequence",
  };
}

export function workDesignApplyInputsProjection({
  applyComplete,
  applyReady,
}: {
  applyComplete: boolean;
  applyReady: boolean;
}) {
  return {
    statusLabel: applyComplete ? "checked" : applyReady ? "ready" : "blocked",
    statusTone: applyComplete ? ("ok" as const) : ("warn" as const),
    title: applyComplete
      ? "Inputs Checked"
      : applyReady
        ? "Inputs Ready"
        : "Inputs Blocked",
    tone: applyComplete ? ("ok" as const) : ("warn" as const),
  };
}

export function workDesignApplyLogPanelProjection({
  applyComplete,
  applyReady,
  applyReceiptRecorded,
  sourceApplyComplete,
}: {
  applyComplete: boolean;
  applyReady: boolean;
  applyReceiptRecorded: boolean;
  sourceApplyComplete: boolean;
}) {
  return {
    description: applyReceiptRecorded
      ? "Live apply events stream here."
      : sourceApplyComplete
        ? "Source completion events are shown as a read-only proof trail."
        : applyReady
          ? "Press Apply Work Design to start the apply run."
          : "Runtime log is idle until apply inputs are ready.",
    statusLabel: applyComplete ? "complete" : applyReady ? "armed" : "idle",
    statusTone: applyComplete ? ("ok" as const) : ("warn" as const),
    tone: applyComplete ? ("ok" as const) : ("warn" as const),
  };
}

export function workDesignApplyLogFacts({
  applyDraftRef,
  applyLogRecordedAt,
  applyTargetRecordRef,
  packageName,
}: {
  applyDraftRef: string;
  applyLogRecordedAt: string;
  applyTargetRecordRef: string;
  packageName: string;
}): TerasMetadataItem[] {
  return [
    { label: "Package", value: packageName },
    { label: "Target", value: applyTargetRecordRef },
    { label: "Draft Ref", value: applyDraftRef },
    {
      label: "Recorded",
      value: formatWorkDesignDateTime(applyLogRecordedAt),
    },
  ];
}
