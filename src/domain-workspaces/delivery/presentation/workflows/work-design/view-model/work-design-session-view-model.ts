import type { TerasMetadataItem } from "@/teras";
import type {
  DeliveryPackageSummary,
  DeliveryTone,
} from "../../../../read-model/index.ts";

import {
  workDesignApplyBackendChecklistRows,
  workDesignApplyExecutionLogLines,
} from "./work-design-apply-model.ts";
import { workDesignSnapshotAttachmentStatusTone } from "./work-design-display-formatters.ts";
import {
  workDesignHistoryReceiptRows,
  workDesignHistoryTimelineRows,
} from "./work-design-history-model.ts";
import type {
  WorkDesignFinalizedBrief,
  WorkDesignSnapshotAttachment,
} from "../artifacts/context-brief/index.ts";
import type { WorkDesignContextDecision } from "../model/work-design-model.ts";

type WorkDesignMetricsSummary = {
  features: number;
  risks: number;
  stories: number;
};

export function workDesignWorkflowReadiness({
  contextBriefAccepted,
  contextDecision,
  hasUnsavedSessionChanges,
  metrics,
  reviewHandoffNote,
  draftReviewAccepted,
}: {
  contextBriefAccepted: boolean;
  contextDecision: WorkDesignContextDecision;
  hasUnsavedSessionChanges: boolean;
  metrics: WorkDesignMetricsSummary;
  reviewHandoffNote: string;
  draftReviewAccepted: boolean;
}) {
  const draftTreePresent =
    contextBriefAccepted &&
    contextDecision === "proceed" &&
    metrics.features > 0 &&
    metrics.stories > 0;
  const reviewHandoffNoteRecorded = reviewHandoffNote.trim().length > 0;
  const reviewRouteReady = draftTreePresent;
  const reviewReady = draftTreePresent;
  const validateReady = draftReviewAccepted && reviewReady;
  const applyReady = validateReady && !hasUnsavedSessionChanges;

  return {
    applyReady,
    draftTreePresent,
    reviewHandoffNoteRecorded,
    reviewReady,
    reviewRouteReady,
    validateReady,
  };
}

export function workDesignReviewDraftViewModel({
  contextFinalizedBrief,
  contextSnapshotAttachment,
  contextSnapshotAttachmentStatusLabel,
  reviewHandoffNoteRecorded,
}: {
  contextFinalizedBrief: WorkDesignFinalizedBrief;
  contextSnapshotAttachment: WorkDesignSnapshotAttachment;
  contextSnapshotAttachmentStatusLabel: string;
  reviewHandoffNoteRecorded: boolean;
}) {
  const reviewSystemCheckPassCount = contextFinalizedBrief.systemChecks.filter(
    (item) => item.tone !== "danger",
  ).length;
  const reviewSnapshotHandoffLabel =
    contextSnapshotAttachment.attachmentStatus === "pending_apply"
      ? "Attach On Apply"
      : contextSnapshotAttachmentStatusLabel;
  const reviewSnapshotTone: DeliveryTone =
    contextSnapshotAttachment.attachmentStatus === "pending_apply"
      ? "info"
      : workDesignSnapshotAttachmentStatusTone(
          contextSnapshotAttachment.attachmentStatus,
        );

  return {
    reviewHandoffNoteReady: reviewHandoffNoteRecorded,
    reviewSnapshotHandoffLabel,
    reviewSnapshotTone,
    reviewSystemCheckPassCount,
  };
}

export function workDesignReviewSnapshotFacts(
  contextSnapshotAttachment: WorkDesignSnapshotAttachment,
): TerasMetadataItem[] {
  return [
    {
      label: "Filename",
      value: contextSnapshotAttachment.fileName,
    },
  ];
}

export function workDesignReviewApprovalFacts({
  reviewHandoffNoteReady,
  reviewSnapshotHandoffLabel,
}: {
  reviewHandoffNoteReady: boolean;
  reviewSnapshotHandoffLabel: string;
}): TerasMetadataItem[] {
  return [
    {
      label: "Snapshot",
      value: reviewSnapshotHandoffLabel,
    },
    {
      label: "Handoff Note",
      value: reviewHandoffNoteReady ? "recorded" : "optional",
    },
  ];
}

export function workDesignReviewGateProjection({
  draftReviewAccepted,
  reviewReady,
}: {
  draftReviewAccepted: boolean;
  reviewReady: boolean;
}) {
  return {
    actionLabel: draftReviewAccepted ? "Reviewed" : "Mark Reviewed",
    actionTone: reviewReady ? ("ok" as DeliveryTone) : ("warn" as DeliveryTone),
    gateTitle: draftReviewAccepted ? "Draft Reviewed" : "Review Required",
    gateTone: draftReviewAccepted
      ? ("ok" as DeliveryTone)
      : ("warn" as DeliveryTone),
  };
}

export function workDesignApplyDraftViewModel({
  applyReceiptId,
  applyReceiptRecorded,
  applyReady,
  applyRunStartedAt,
  applyViewOpenedAt,
  contextBriefAccepted,
  contextDecision,
  contextSnapshotAttachment,
  contextSnapshotAttachmentStatusLabel,
  deliveryPackage,
  metrics,
  sourceApplyComplete,
}: {
  applyReceiptId: string | null;
  applyReceiptRecorded: boolean;
  applyReady: boolean;
  applyRunStartedAt: string | null;
  applyViewOpenedAt: string;
  contextBriefAccepted: boolean;
  contextDecision: WorkDesignContextDecision;
  contextSnapshotAttachment: WorkDesignSnapshotAttachment;
  contextSnapshotAttachmentStatusLabel: string;
  deliveryPackage: DeliveryPackageSummary;
  metrics: WorkDesignMetricsSummary;
  sourceApplyComplete: boolean;
}) {
  const applyTargetRecordRef =
    contextSnapshotAttachment.targetRecordRef ?? deliveryPackage.source_ref;
  const applySnapshotActionLabel =
    contextSnapshotAttachment.attachmentStatus === "pending_apply"
      ? "Attach On Apply"
      : contextSnapshotAttachmentStatusLabel;
  const applyDraftRef = `${deliveryPackage.delivery_package_id}/work-design-draft-v1`;
  const applyLogRecordedAt = applyRunStartedAt ?? applyViewOpenedAt;
  const contextRecordedAt =
    deliveryPackage.work_design_context_session?.finalized_at ??
    deliveryPackage.work_design_context_session?.saved_at ??
    null;
  const historyRecordedAt =
    applyRunStartedAt ?? contextRecordedAt ?? "Unknown time";
  const applyBackendChecklistRows = workDesignApplyBackendChecklistRows({
    applyReceiptRecorded,
    applyReady,
    applyTargetRecordRef,
    snapshotAction: applySnapshotActionLabel,
    sourceApplyComplete,
  });
  const applyExecutionLogLines = workDesignApplyExecutionLogLines({
    applyReceiptRecorded,
    applyReady,
    applyTargetRecordRef,
    draftRef: applyDraftRef,
    recordedAt: historyRecordedAt,
    snapshotAction: applySnapshotActionLabel,
    sourceApplyComplete,
  });
  const historyReceiptRows = workDesignHistoryReceiptRows({
    applyReceiptId,
    applyReceiptRecorded,
    applyTargetRecordRef,
    contextDecision,
    draftRef: applyDraftRef,
    recordedAt: applyLogRecordedAt,
    snapshotAction: applySnapshotActionLabel,
    snapshotStatus: contextSnapshotAttachment.attachmentStatus,
    sourceApplyComplete,
  });
  const historyTimelineRows = workDesignHistoryTimelineRows({
    applyRecordedAt: applyRunStartedAt,
    applyReceiptId,
    applyReceiptRecorded,
    contextBriefAccepted,
    contextDecision,
    contextRecordedAt,
    metrics,
  });

  return {
    applyBackendChecklistRows,
    applyDraftRef,
    applyExecutionLogLines,
    applyLogRecordedAt,
    applyReceiptId,
    applySnapshotActionLabel,
    applyTargetRecordRef,
    historyReceiptRows,
    historyTimelineRows,
  };
}
