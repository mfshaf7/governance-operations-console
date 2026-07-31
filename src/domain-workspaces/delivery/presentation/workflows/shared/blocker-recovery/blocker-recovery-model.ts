import type { TerasMetadataItem } from "@/teras";

import type {
  DeliveryPackageSummary,
  DeliveryTone,
} from "../../../../read-model/index.ts";
import type {
  WorkDesignBlockerDisposition,
  WorkDesignBlockerDispositionReceipt,
  WorkDesignBlockerIssue,
  WorkDesignBlockerIssueKind,
  WorkDesignBlockerRecoveryActionId,
} from "../../../../work-model/work-design/work-design-types.ts";

export type DeliveryBlockerDisposition = WorkDesignBlockerDisposition;

export type DeliveryBlockerIssueKind = WorkDesignBlockerIssueKind;

export type DeliveryBlockerRecoveryActionId = WorkDesignBlockerRecoveryActionId;

export type DeliveryBlockerIssue = WorkDesignBlockerIssue;

export type DeliveryBlockerDispositionReceipt =
  WorkDesignBlockerDispositionReceipt;

export type DeliveryBlockerRecoveryAction = {
  clearsBlocker: boolean;
  description: string;
  disabled: boolean;
  disposition: DeliveryBlockerDisposition;
  evidenceLines: string[];
  id: DeliveryBlockerRecoveryActionId;
  label: string;
  outcome: "cleared" | "risk-accepted" | "still-blocked";
  primaryLabel: string;
  receiptTitle: string;
  recoveryAction: string;
  statusLabel: string;
  tone: DeliveryTone;
};

export type DeliveryBlockerAdvisorResponseInput = {
  deliveryPackage: DeliveryPackageSummary;
  prompt: string;
  recoveryAction: DeliveryBlockerRecoveryAction;
};

export function deliveryBlockerRecoveryRequiresNote(
  action: DeliveryBlockerRecoveryAction,
) {
  return action.disposition !== "remove";
}

export function deliveryDefaultBlockerRecoveryActionId(
  actions: DeliveryBlockerRecoveryAction[],
  fallbackAction: DeliveryBlockerRecoveryAction,
) {
  return (
    actions.find(
      (action) => action.disposition === "remove" && !action.disabled,
    ) ??
    actions.find((action) => !action.disabled) ??
    actions[0] ??
    fallbackAction
  ).id;
}

export function deliveryBlockerRecoveryDefaultJustification(
  action: DeliveryBlockerRecoveryAction,
) {
  return `${action.label} completed through the blocker recovery workflow.`;
}

export function deliveryBlockerProblemPanelProjection({
  activeBlockerIssue,
  deliveryPackage,
}: {
  activeBlockerIssue: DeliveryBlockerIssue | null;
  deliveryPackage: DeliveryPackageSummary;
}) {
  return {
    description: activeBlockerIssue?.summary ?? deliveryPackage.summary,
    title: activeBlockerIssue?.title ?? deliveryPackage.display_name,
  };
}

export function deliveryBlockerRecoveryDialogShellCopy(copy?: {
  backLabel?: string;
  closeLabel?: string;
  description?: string;
  kicker?: string;
  title?: string;
}) {
  return {
    backLabel: copy?.backLabel ?? "Back to Hub",
    closeLabel: copy?.closeLabel ?? "Close blocker recovery",
    description:
      copy?.description ??
      "Normal Work Design stays locked. Diagnose the failed apply state here, run a valid recovery action, and record the proof that either clears the blocker or keeps it blocked.",
    kicker: copy?.kicker ?? "Work Design Blocker",
    title: copy?.title ?? "Blocker Recovery",
  };
}

export function deliveryBlockerProblemMetadata({
  blockerProblemClearanceValue,
  blockerProblemLockValue,
  blockerProblemRecoveryValue,
  deliveryPackage,
}: {
  blockerProblemClearanceValue: string;
  blockerProblemLockValue: string;
  blockerProblemRecoveryValue: string;
  deliveryPackage: DeliveryPackageSummary;
}): TerasMetadataItem[] {
  return [
    { label: "Source", value: deliveryPackage.source_ref },
    { label: "Locked Steps", value: blockerProblemLockValue },
    { label: "Recovery Path", value: blockerProblemRecoveryValue },
    { label: "Clears When", value: blockerProblemClearanceValue },
  ];
}

export function deliveryBlockerSelectedActionMetadata({
  selectedBlockerRecoveryBlockerLabel,
  selectedBlockerRecoveryDispositionLabel,
  selectedBlockerRecoveryRequiresNote,
}: {
  selectedBlockerRecoveryBlockerLabel: string;
  selectedBlockerRecoveryDispositionLabel: string;
  selectedBlockerRecoveryRequiresNote: boolean;
}): TerasMetadataItem[] {
  return [
    {
      label: "Disposition",
      value: selectedBlockerRecoveryDispositionLabel,
    },
    {
      label: "Blocker",
      value: selectedBlockerRecoveryBlockerLabel,
    },
    {
      label: "Rationale",
      value: selectedBlockerRecoveryRequiresNote ? "Required" : "Optional",
    },
  ];
}

export function deliveryBlockerRecordedResultMetadata({
  blockerDispositionReceiptRecordedAt,
  blockerDispositionRecordedCopy,
  copy,
  matchingBlockerDispositionReceipt,
}: {
  blockerDispositionReceiptRecordedAt: string | null;
  blockerDispositionRecordedCopy: {
    recoveryAction: string;
  };
  copy?: {
    resultBlockedWorkflowValue?: string;
    resultClearedWorkflowValue?: string;
  };
  matchingBlockerDispositionReceipt: DeliveryBlockerDispositionReceipt;
}): TerasMetadataItem[] {
  return [
    {
      label: "Source",
      value: matchingBlockerDispositionReceipt.sourceRef,
    },
    {
      label: "Recorded",
      value: blockerDispositionReceiptRecordedAt ?? "local receipt",
    },
    {
      label: "Outcome",
      value: blockerDispositionRecordedCopy.recoveryAction,
    },
    {
      label: "Workflow",
      value: matchingBlockerDispositionReceipt.clearsBlocker
        ? (copy?.resultClearedWorkflowValue ??
          "Blocker cleared or risk accepted")
        : (copy?.resultBlockedWorkflowValue ??
          "Normal Work Design stays locked"),
    },
  ];
}

export function deliveryBlockerWaitingResultMetadata({
  selectedBlockerRecoveryAction,
  selectedBlockerRecoveryBlockerLabel,
  selectedBlockerRecoveryStatusLabel,
}: {
  selectedBlockerRecoveryAction: DeliveryBlockerRecoveryAction;
  selectedBlockerRecoveryBlockerLabel: string;
  selectedBlockerRecoveryStatusLabel: string;
}): TerasMetadataItem[] {
  return [
    {
      label: "Selected",
      value: selectedBlockerRecoveryAction.label,
    },
    {
      label: "Current State",
      value: selectedBlockerRecoveryStatusLabel,
    },
    {
      label: "Blocker",
      value: selectedBlockerRecoveryBlockerLabel,
    },
    {
      label: "Result Source",
      value: "Selected action proof",
    },
  ];
}
