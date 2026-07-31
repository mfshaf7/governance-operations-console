import type { DeliveryTone } from "../../../../read-model/index.ts";

import { workDesignContextDecisionCopy } from "./work-design-context-decision-model.ts";
import type { WorkDesignContextDecision } from "../model/work-design-model.ts";
import {
  formatWorkDesignDateTime,
  workDesignSnapshotAttachmentStatusLabel,
  workDesignSnapshotAttachmentStatusTone,
} from "./work-design-display-formatters.ts";

type WorkDesignMetricsSummary = {
  features: number;
  risks: number;
  stories: number;
};

export function workDesignHistoryViewProjection({
  applyReceiptId,
  applyReceiptRecorded,
  sourceApplyComplete,
  sourceTerminalDecision,
  sourceWorkDesignClosed,
  sourceWorkDesignRetired,
}: {
  applyReceiptId: string | null;
  applyReceiptRecorded: boolean;
  sourceApplyComplete: boolean;
  sourceTerminalDecision: boolean;
  sourceWorkDesignClosed: boolean;
  sourceWorkDesignRetired: boolean;
}) {
  const localReceiptRecorded = Boolean(applyReceiptRecorded && applyReceiptId);
  const sourceDecisionWithoutReceipt =
    sourceTerminalDecision && !localReceiptRecorded;
  const historyArchiveTone: DeliveryTone = localReceiptRecorded
    ? "ok"
    : sourceWorkDesignRetired
      ? "muted"
      : sourceDecisionWithoutReceipt
        ? "muted"
        : sourceWorkDesignClosed
          ? "ok"
          : "info";
  const historyStatusLabel = localReceiptRecorded
    ? "receipt"
    : sourceApplyComplete
      ? "source done"
      : sourceWorkDesignRetired
        ? "retired"
        : sourceDecisionWithoutReceipt
          ? "linked"
          : "history";

  return {
    archiveDescription: sourceDecisionWithoutReceipt
      ? "Open or export the decision evidence without creating draft or apply artifacts."
      : "Open the carried evidence without changing the completed Work Design state.",
    exportActionLabel: sourceDecisionWithoutReceipt
      ? "Export Decision Record"
      : "Export Receipt",
    historyArchiveTone,
    historyDescription: localReceiptRecorded
      ? "Read-only receipt archive for the accepted Work Design pass."
      : sourceApplyComplete
        ? "Read-only source archive for the completed Work Design pass."
        : sourceDecisionWithoutReceipt
          ? "Read-only decision archive for a source-closed Work Design pass."
          : "Read-only evidence recorded for the current Work Design pass.",
    historyKicker: localReceiptRecorded
      ? "Receipt History"
      : sourceApplyComplete
        ? "Source History"
        : sourceDecisionWithoutReceipt
          ? "Decision History"
          : "Work Design History",
    historyStatusLabel,
    historyTitle: localReceiptRecorded
      ? "Work Design Applied"
      : sourceApplyComplete
        ? "Work Design Done"
        : sourceWorkDesignRetired
          ? "Retirement Decision Recorded"
          : sourceDecisionWithoutReceipt
            ? "Link Decision Recorded"
            : "Work Design Record",
    showApplyArtifacts: !sourceDecisionWithoutReceipt,
    sourceDecisionWithoutReceipt,
    timelineDescription: sourceDecisionWithoutReceipt
      ? "A compact read-only trail for the terminal Work Design decision."
      : sourceApplyComplete
        ? "A compact read-only trail for the completed source Work Design pass."
        : "A compact read-only trail for the Work Design pass.",
    timelineTitle: "Recorded Trail",
  };
}

export function workDesignHistoryReceiptRows({
  applyReceiptId,
  applyReceiptRecorded,
  applyTargetRecordRef,
  contextDecision,
  draftRef,
  recordedAt,
  snapshotAction,
  snapshotStatus,
  sourceApplyComplete,
}: {
  applyReceiptId: string | null;
  applyReceiptRecorded: boolean;
  applyTargetRecordRef: string;
  contextDecision: WorkDesignContextDecision;
  draftRef: string;
  recordedAt: string;
  snapshotAction: string;
  snapshotStatus: Parameters<typeof workDesignSnapshotAttachmentStatusLabel>[0];
  sourceApplyComplete: boolean;
}): Array<{
  detail: string;
  label: string;
  tone: DeliveryTone;
  value: string;
}> {
  const snapshotLabel = workDesignSnapshotAttachmentStatusLabel(snapshotStatus);
  const snapshotTone = workDesignSnapshotAttachmentStatusTone(snapshotStatus);
  const decisionCopy = workDesignContextDecisionCopy(contextDecision);
  const localReceiptRecorded = Boolean(applyReceiptRecorded && applyReceiptId);

  if (contextDecision !== "proceed" && !localReceiptRecorded) {
    return [
      {
        detail: decisionCopy.historyDescription,
        label: "Decision State",
        tone: "muted",
        value: decisionCopy.historyTitle,
      },
      {
        detail:
          "Build Tree, Review Draft, and Apply Draft are not required for this terminal context decision.",
        label: "Draft Path",
        tone: "muted",
        value: "Not Required",
      },
      {
        detail:
          "Record that carries the terminal Work Design decision for this pass.",
        label: "Decision Record",
        tone: "info",
        value: applyTargetRecordRef,
      },
      {
        detail:
          "Finalized context board snapshot is retained as the decision evidence for this pass.",
        label: "Context Snapshot",
        tone: "info",
        value: "Decision Evidence",
      },
      {
        detail:
          "No draft tree or apply projection is produced for a link/retire decision.",
        label: "Projection",
        tone: "muted",
        value: "No Draft Projection",
      },
      {
        detail: "Timestamp for the current terminal decision record.",
        label: "Recorded",
        tone: "muted",
        value: formatWorkDesignDateTime(recordedAt),
      },
    ];
  }

  if (sourceApplyComplete) {
    return [
      {
        detail: "Source read model marks this Work Design pass complete.",
        label: "Receipt State",
        tone: "ok",
        value: "Source Done",
      },
      {
        detail:
          "Final draft reference carried by the completed source projection.",
        label: "Draft Ref",
        tone: "info",
        value: draftRef,
      },
      {
        detail: "Target package record for the completed Work Design update.",
        label: "Target Record",
        tone: "info",
        value: applyTargetRecordRef,
      },
      {
        detail: snapshotAction,
        label: "Snapshot Evidence",
        tone: "ok",
        value: "Retained",
      },
      {
        detail: "Projection proof comes from the completed source read model.",
        label: "Projection",
        tone: "ok",
        value: "Done",
      },
      {
        detail: "Timestamp for the current source completion record.",
        label: "Recorded",
        tone: "muted",
        value: formatWorkDesignDateTime(recordedAt),
      },
    ];
  }

  return [
    {
      detail: localReceiptRecorded
        ? "Preview receipt is available for this Work Design pass."
        : "No apply receipt has been recorded for this Work Design pass.",
      label: "Receipt ID",
      tone: localReceiptRecorded ? "ok" : "muted",
      value: localReceiptRecorded
        ? (applyReceiptId ?? "Receipt unavailable")
        : "No receipt recorded",
    },
    {
      detail: "Final draft reference carried to the backend apply path.",
      label: "Draft Ref",
      tone: "info",
      value: draftRef,
    },
    {
      detail: "Target package record for the accepted Work Design update.",
      label: "Target Record",
      tone: "info",
      value: applyTargetRecordRef,
    },
    {
      detail: snapshotAction,
      label: "Snapshot Evidence",
      tone: localReceiptRecorded ? "ok" : snapshotTone,
      value: localReceiptRecorded ? "Attached In Preview" : snapshotLabel,
    },
    {
      detail:
        "Projection proof remains prototype-local until live backend wiring returns a receipt.",
      label: "Projection",
      tone: localReceiptRecorded ? "ok" : "muted",
      value: localReceiptRecorded
        ? "Refresh Recorded"
        : "Prototype-local draft",
    },
    {
      detail: "Timestamp for the current preview receipt record.",
      label: "Recorded",
      tone: "muted",
      value: formatWorkDesignDateTime(recordedAt),
    },
  ];
}

export function workDesignHistoryTimelineRows({
  applyRecordedAt,
  applyReceiptId,
  applyReceiptRecorded,
  contextBriefAccepted,
  contextDecision,
  contextRecordedAt,
  metrics,
}: {
  applyRecordedAt: string | null;
  applyReceiptId: string | null;
  applyReceiptRecorded: boolean;
  contextBriefAccepted: boolean;
  contextDecision: WorkDesignContextDecision;
  contextRecordedAt: string | null;
  metrics: WorkDesignMetricsSummary;
}): Array<{
  detail: string;
  label: string;
  status: string;
  timestamp: string;
  tone: DeliveryTone;
}> {
  const decisionCopy = workDesignContextDecisionCopy(contextDecision);
  const localReceiptRecorded = Boolean(
    applyReceiptRecorded && applyReceiptId && applyRecordedAt,
  );
  const rows: Array<{
    detail: string;
    label: string;
    status: string;
    timestamp: string;
    tone: DeliveryTone;
  }> = [];

  if (contextBriefAccepted && contextRecordedAt) {
    rows.push({
      detail: `Context decision recorded as ${decisionCopy.label}.`,
      label: "Context Brief Finalized",
      status: decisionCopy.label,
      timestamp: contextRecordedAt,
      tone: contextDecision === "proceed" ? "ok" : "muted",
    });
  }

  if (localReceiptRecorded && applyRecordedAt) {
    rows.push({
      detail: `Receipt ${applyReceiptId} recorded for a draft with ${metrics.features} Feature branches, ${metrics.stories} User stories, and ${metrics.risks} Risk branches.`,
      label: "Apply Receipt Recorded",
      status: "recorded",
      timestamp: applyRecordedAt,
      tone: "ok",
    });
  }

  return rows;
}
