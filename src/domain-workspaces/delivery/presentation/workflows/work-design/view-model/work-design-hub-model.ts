import type { TerasMetadataItem } from "@/teras";

import type {
  DeliveryPackagePosture,
  DeliveryTone,
} from "../../../../read-model/index.ts";

import type {
  WorkDesignRegisterPackage,
  WorkDesignBlockerDispositionReceipt,
  WorkDesignBlockerIssue,
  WorkDesignContextDecision,
  WorkDesignStep,
} from "../model/work-design-model.ts";
import {
  workDesignContextDecisionCopy,
  type WorkDesignContextDecisionCopy,
} from "./work-design-context-decision-model.ts";
import type { WorkDesignCurrentMove } from "./work-design-current-move.ts";
import type { WorkDesignBlockerDispositionCopy } from "./work-design-blocker-disposition-model.ts";
import {
  workDesignPackageCompletedFromSource,
  workDesignPackageLinkedFromSource,
  workDesignPackageRetiredFromSource,
  workDesignPackageStatusFromBlockerReceipt,
} from "./work-design-source-posture-model.ts";

type WorkDesignNextSessionActionProjection = {
  label: string;
  step: WorkDesignStep;
  tone: DeliveryTone;
};

type WorkDesignHubFactRow = {
  label: string;
  value: string;
};

export function workDesignHubSelectedMetadata(
  deliveryPackage: WorkDesignRegisterPackage,
): TerasMetadataItem[] {
  return [
    { label: "Epic", value: `#${deliveryPackage.legacy_epic_id}` },
    { label: "Source", value: deliveryPackage.source_ref },
  ];
}

export function workDesignNextSessionAction(state: {
  applyReceiptRecorded: boolean;
  contextBriefAccepted: boolean;
  contextDecision: WorkDesignContextDecision;
  draftTreePresent: boolean;
  draftReviewAccepted: boolean;
  reviewReady: boolean;
  draftValidationAccepted: boolean;
}): WorkDesignNextSessionActionProjection {
  if (state.applyReceiptRecorded) {
    return {
      label: "View History",
      step: "history",
      tone: "ok",
    };
  }

  if (!state.contextBriefAccepted) {
    return {
      label: "Open Context Session",
      step: "context",
      tone: "warn",
    };
  }

  if (state.contextDecision !== "proceed") {
    return {
      label: "View Context Record",
      step: "history",
      tone: workDesignContextDecisionCopy(state.contextDecision).tone,
    };
  }

  if (!state.draftTreePresent) {
    return {
      label: "Build Tree",
      step: "build",
      tone: "warn",
    };
  }

  if (!state.draftReviewAccepted) {
    return {
      label: "Review Draft",
      step: "review",
      tone: "warn",
    };
  }

  return {
    label: "Apply Draft",
    step: "apply",
    tone: "ok",
  };
}

export function workDesignDesignHubProjection({
  activeBlockerIssue,
  applyReceiptRecorded,
  blockerDispositionCopy,
  blockerDispositionReceiptRecordedAt,
  contextBriefAccepted,
  contextBriefRecordSavedAtLabel,
  contextDecision,
  contextDecisionCopy,
  currentMove,
  deliveryPackage,
  draftTreePresent,
  metrics,
  matchingBlockerDispositionReceipt,
  draftReviewAccepted,
  reviewReady,
  treeDraftStale,
  draftValidationAccepted,
  workDesignBlocked,
}: {
  activeBlockerIssue: WorkDesignBlockerIssue | null;
  applyReceiptRecorded: boolean;
  blockerDispositionCopy: WorkDesignBlockerDispositionCopy | null;
  blockerDispositionReceiptRecordedAt: string | null;
  contextBriefAccepted: boolean;
  contextBriefRecordSavedAtLabel: string;
  contextDecision: WorkDesignContextDecision;
  contextDecisionCopy: WorkDesignContextDecisionCopy;
  currentMove: WorkDesignCurrentMove;
  deliveryPackage: WorkDesignRegisterPackage;
  draftTreePresent: boolean;
  metrics: { features: number; stories: number };
  matchingBlockerDispositionReceipt: WorkDesignBlockerDispositionReceipt | null;
  draftReviewAccepted: boolean;
  reviewReady: boolean;
  treeDraftStale: boolean;
  draftValidationAccepted: boolean;
  workDesignBlocked: boolean;
}) {
  const localWorkflowProjection = deliveryPackage.local_workflow_projection;
  const localWorkDesignComplete =
    deliveryPackage.workflow_phase === "work_design" &&
    localWorkflowProjection?.status_label === "Done";
  const sourceWorkDesignComplete =
    workDesignPackageCompletedFromSource(deliveryPackage);
  const sourceWorkDesignLinked =
    workDesignPackageLinkedFromSource(deliveryPackage);
  const sourceWorkDesignRetired =
    workDesignPackageRetiredFromSource(deliveryPackage);
  const sourceWorkDesignClosed =
    sourceWorkDesignComplete || sourceWorkDesignRetired;
  const sourceTerminalComplete =
    sourceWorkDesignClosed && contextDecision !== "proceed";
  const applyPathComplete =
    applyReceiptRecorded ||
    localWorkDesignComplete ||
    (sourceWorkDesignComplete && contextDecision === "proceed");
  const workDesignClosed = applyPathComplete || sourceWorkDesignClosed;
  const sourceCompleteTitle = sourceTerminalComplete
    ? contextDecisionCopy.historyTitle
    : "Work Design Complete";
  const sourceCompleteDescription = sourceTerminalComplete
    ? `${contextDecisionCopy.historyDescription} Build Tree, Review Draft, and Apply Draft are not required for this pass.`
    : localWorkDesignComplete && !sourceWorkDesignComplete
      ? (localWorkflowProjection?.summary ??
        "A local Work Design apply receipt is recorded. Source package status remains unchanged until backend projection refreshes.")
      : "The source read model marks this Work Design pass Done.";
  const sourceCompleteTone: DeliveryTone = sourceWorkDesignLinked
    ? "muted"
    : sourceTerminalComplete
      ? contextDecisionCopy.tone
      : "ok";
  const nextSessionActionBase = workDesignNextSessionAction({
    applyReceiptRecorded,
    contextBriefAccepted,
    contextDecision,
    draftTreePresent,
    draftReviewAccepted,
    reviewReady,
    draftValidationAccepted,
  });
  const completedCurrentMove = {
    description: workDesignClosed
      ? sourceCompleteDescription
      : currentMove.description,
    title: sourceCompleteTitle,
    tone: sourceCompleteTone,
  };
  const completedNextSessionAction: WorkDesignNextSessionActionProjection = {
    label: "View History",
    step: "history",
    tone: sourceCompleteTone,
  };
  const projectedCurrentMove =
    !workDesignBlocked && workDesignClosed ? completedCurrentMove : currentMove;
  const projectedNextSessionAction =
    !workDesignBlocked && workDesignClosed
      ? completedNextSessionAction
      : nextSessionActionBase;
  const blockerRecoveryHubActionAvailable = Boolean(
    activeBlockerIssue && matchingBlockerDispositionReceipt,
  );
  const hubPackageStatus: {
    label: DeliveryPackagePosture | "Linked" | "Risk Accepted";
    tone: DeliveryTone;
  } = matchingBlockerDispositionReceipt
    ? workDesignPackageStatusFromBlockerReceipt(
        matchingBlockerDispositionReceipt,
      )
    : sourceWorkDesignLinked
      ? {
          label: "Linked",
          tone: "muted",
        }
      : sourceWorkDesignRetired
        ? {
            label: "Retired",
            tone: "muted",
          }
        : applyPathComplete || sourceWorkDesignComplete
          ? {
              label: "Done",
              tone: "ok",
            }
          : {
              label: deliveryPackage.package_posture,
              tone: deliveryPackage.tone,
            };
  const blockerRecoveryPostureActive = Boolean(
    matchingBlockerDispositionReceipt &&
    (!matchingBlockerDispositionReceipt.clearsBlocker ||
      matchingBlockerDispositionReceipt.disposition === "accept-risk"),
  );
  const hubPackageSummary =
    matchingBlockerDispositionReceipt?.clearsBlocker &&
    matchingBlockerDispositionReceipt.disposition !== "accept-risk"
      ? "Work Design package is ready to continue through the normal Design Hub flow."
      : localWorkflowProjection?.summary
        ? localWorkflowProjection.summary
        : deliveryPackage.summary;
  const nextSessionAction: WorkDesignNextSessionActionProjection =
    workDesignBlocked
      ? {
          label: "Open Blocker Recovery",
          step: "hub",
          tone: "danger",
        }
      : projectedNextSessionAction;
  const contextAcceptedWithoutDraftTree =
    contextBriefAccepted && contextDecision === "proceed" && !draftTreePresent;
  const contextDecisionRecordOnly =
    contextBriefAccepted && contextDecision !== "proceed";
  const treeCountLabel = `${metrics.features} feature${metrics.features === 1 ? "" : "s"} / ${metrics.stories} stor${metrics.stories === 1 ? "y" : "ies"}`;
  const hubDraftStatusTone: DeliveryTone = workDesignBlocked
    ? "danger"
    : workDesignClosed
      ? sourceCompleteTone
      : blockerRecoveryPostureActive && blockerDispositionCopy
        ? blockerDispositionCopy.tone
        : treeDraftStale
          ? "stale"
          : contextDecisionRecordOnly
            ? contextDecisionCopy.tone
            : contextAcceptedWithoutDraftTree
              ? "warn"
              : reviewReady
                ? draftReviewAccepted
                  ? "ok"
                  : "warn"
                : contextBriefAccepted
                  ? "ok"
                  : "muted";
  const hubStatusKicker = "Current Status";
  const hubDraftStatusLabel = workDesignBlocked
    ? (blockerDispositionCopy?.resultLabel ?? "blocked")
    : workDesignClosed
      ? sourceWorkDesignLinked
        ? "linked"
        : sourceTerminalComplete
          ? "terminal"
          : "done"
      : blockerRecoveryPostureActive && blockerDispositionCopy
        ? blockerDispositionCopy.resultLabel
        : treeDraftStale
          ? "stale"
          : contextDecisionRecordOnly
            ? "recorded"
            : contextAcceptedWithoutDraftTree
              ? "build tree needed"
              : reviewReady
                ? draftReviewAccepted
                  ? "operator reviewed"
                  : "ready for review"
                : draftTreePresent
                  ? "inspect draft tree"
                  : contextBriefAccepted
                    ? "draft needed"
                    : "context required";
  const hubDraftStatusLabelPending =
    !workDesignClosed &&
    !contextDecisionRecordOnly &&
    reviewReady &&
    !draftReviewAccepted;
  const hubDraftStatusTitle = workDesignBlocked
    ? (blockerDispositionCopy?.title ??
      activeBlockerIssue?.title ??
      "Blocker Recovery Required")
    : workDesignClosed
      ? sourceCompleteTitle
      : blockerRecoveryPostureActive && blockerDispositionCopy
        ? blockerDispositionCopy.title
        : treeDraftStale
          ? "Tree Preserved During Brief Reopen"
          : contextDecisionRecordOnly
            ? contextDecisionCopy.historyTitle
            : contextAcceptedWithoutDraftTree
              ? "Build Tree Needed"
              : reviewReady || draftTreePresent
                ? "Draft Tree Attached"
                : "No Draft Tree Attached";
  const hubDraftStatusSummary = workDesignBlocked
    ? matchingBlockerDispositionReceipt
      ? matchingBlockerDispositionReceipt.justification
      : (activeBlockerIssue?.summary ?? deliveryPackage.summary)
    : workDesignClosed
      ? sourceCompleteDescription
      : blockerRecoveryPostureActive && matchingBlockerDispositionReceipt
        ? matchingBlockerDispositionReceipt.justification
        : treeDraftStale
          ? "The current tree snapshot is preserved but paused until the brief is finalized again and reconciled."
          : contextDecisionRecordOnly
            ? contextDecisionCopy.historyDescription
            : contextAcceptedWithoutDraftTree
              ? "Context brief is accepted, but no draft Feature or User story tree is attached yet. Use Build Tree from the Epic shell; context evidence remains available in History."
              : reviewReady
                ? "Work Design has a draft tree. Review records operator acceptance before Apply Draft; the handoff note is optional evidence."
                : draftTreePresent
                  ? "Context Session has an attached draft tree. Open Review Draft to add the package handoff note and record operator acceptance."
                  : contextBriefAccepted
                    ? "Build Tree must attach Feature and User story draft branches before review."
                    : "Accept the context brief before Work Design creates or changes the draft tree.";
  const hubDraftStatusRows: WorkDesignHubFactRow[] = workDesignBlocked
    ? matchingBlockerDispositionReceipt && blockerDispositionCopy
      ? [
          { label: "Decision", value: blockerDispositionCopy.label },
          {
            label: "Recovery",
            value: matchingBlockerDispositionReceipt.recoveryAction,
          },
          {
            label: "Recorded",
            value: blockerDispositionReceiptRecordedAt ?? "local receipt",
          },
          { label: "Owner", value: "Design Hub" },
        ]
      : [
          { label: "Source", value: deliveryPackage.source_ref },
          {
            label: "Reason",
            value: activeBlockerIssue?.summary ?? deliveryPackage.summary,
          },
          {
            label: "Recovery",
            value:
              activeBlockerIssue?.recoveryAction ?? "Open Blocker Recovery",
          },
          { label: "Owner", value: "Design Hub" },
        ]
    : workDesignClosed
      ? [
          {
            label: "Status",
            value: sourceWorkDesignLinked
              ? "Linked"
              : sourceWorkDesignRetired
                ? "Retired"
                : "Done",
          },
          { label: "Decision", value: contextDecisionCopy.label },
          { label: "Saved", value: contextBriefRecordSavedAtLabel },
          {
            label: "Draft Path",
            value: sourceTerminalComplete ? "Not required" : "Complete",
          },
        ]
      : blockerRecoveryPostureActive &&
          matchingBlockerDispositionReceipt &&
          blockerDispositionCopy
        ? [
            { label: "Decision", value: blockerDispositionCopy.label },
            {
              label: "Recovery",
              value: matchingBlockerDispositionReceipt.recoveryAction,
            },
            {
              label: "Recorded",
              value: blockerDispositionReceiptRecordedAt ?? "local receipt",
            },
            {
              label: "Source",
              value: matchingBlockerDispositionReceipt.sourceRef,
            },
          ]
        : treeDraftStale
          ? [
              { label: "Tree", value: treeCountLabel },
              { label: "Brief", value: "re-finalize required" },
              { label: "Review", value: "reset" },
              { label: "Apply", value: "reset" },
            ]
          : contextAcceptedWithoutDraftTree
            ? [
                { label: "Context", value: "accepted" },
                { label: "Draft tree", value: "not attached" },
                { label: "Next", value: "Build Tree" },
                { label: "Source", value: "Epic shell" },
              ]
            : [
                {
                  label: "Context",
                  value: contextBriefAccepted
                    ? contextDecisionCopy.label
                    : "not accepted",
                },
                {
                  label: "Draft tree",
                  value: reviewReady ? treeCountLabel : "not attached",
                },
                {
                  label: "Draft review",
                  value: draftReviewAccepted
                    ? "operator reviewed"
                    : reviewReady
                      ? "review required"
                      : "waiting for draft",
                },
                {
                  label: "Validation",
                  value: draftValidationAccepted
                    ? "passed"
                    : draftReviewAccepted
                      ? "pending"
                      : "locked",
                },
              ];
  return {
    blockerRecoveryHubActionAvailable,
    hubDraftStatusLabel,
    hubDraftStatusLabelPending,
    hubDraftStatusRows,
    hubDraftStatusSummary,
    hubDraftStatusTitle,
    hubDraftStatusTone,
    designHubActionButtonLabel: workDesignClosed
      ? "View History"
      : nextSessionAction.label,
    designHubActionDescription: projectedCurrentMove.description,
    designHubActionKicker: workDesignClosed
      ? "Workflow State"
      : "Current Required Move",
    designHubActionTitle: workDesignClosed
      ? sourceCompleteTitle
      : nextSessionAction.label,
    nextSessionAction,
    hubPackageStatus,
    hubPackageSummary,
    hubProgressKicker: sourceWorkDesignLinked
      ? "Linked Source"
      : sourceTerminalComplete
        ? "Terminal Decision"
        : applyPathComplete
          ? "Workflow Complete"
          : "Draft Progress",
    hubProgressTitle: sourceWorkDesignLinked
      ? "Existing Work Linked"
      : sourceTerminalComplete
        ? "Draft Path Skipped"
        : applyPathComplete
          ? "Completed Pass"
          : "Step Progress",
    hubStatusKicker,
    applyPathComplete,
    sourceWorkDesignClosed,
    sourceWorkDesignComplete,
    sourceWorkDesignRetired,
    workDesignClosed,
  };
}
