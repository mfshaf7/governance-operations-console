import type {
  DeliveryPackageSummary,
  DeliveryTone,
} from "../../../../read-model/index.ts";

import { formatWorkDesignDateTime } from "./work-design-display-formatters.ts";
import {
  workDesignBlockerRecoveryActions,
  workDesignBlockerRecoveryRequiresNote,
  workDesignFallbackBlockerRecoveryAction,
  workDesignPackageBlockerIssue,
} from "../support/blocker-recovery/work-design-blocker-model.ts";
import { workDesignBlockerDispositionCopy } from "./work-design-blocker-disposition-model.ts";
import type {
  WorkDesignBlockerDispositionReceipt,
  WorkDesignBlockerIssue,
  WorkDesignBlockerRecoveryActionId,
} from "../model/work-design-model.ts";
import type { WorkDesignAdvisorTranscriptLine } from "./work-design-context-advisor-view-model.ts";

export function workDesignActiveBlockerViewModel({
  blockerDispositionReceipt,
  deliveryPackage,
}: {
  blockerDispositionReceipt: WorkDesignBlockerDispositionReceipt | null;
  deliveryPackage: DeliveryPackageSummary;
}) {
  const packageBlockerIssue =
    deliveryPackage.package_posture === "Blocked"
      ? workDesignPackageBlockerIssue(deliveryPackage)
      : null;
  const activeBlockerIssue = packageBlockerIssue;
  const matchingBlockerDispositionReceipt =
    blockerDispositionReceipt?.issueId === activeBlockerIssue?.id
      ? blockerDispositionReceipt
      : null;
  const blockerDispositionAllowsWorkDesign =
    matchingBlockerDispositionReceipt?.clearsBlocker === true ||
    matchingBlockerDispositionReceipt?.disposition === "accept-risk";
  const workDesignBlocked =
    Boolean(activeBlockerIssue) && !blockerDispositionAllowsWorkDesign;

  return {
    activeBlockerIssue,
    blockerDispositionAllowsWorkDesign,
    matchingBlockerDispositionReceipt,
    packageBlockerIssue,
    workDesignBlocked,
  };
}

export function workDesignBlockerRecoveryViewModel({
  activeBlockerIssue,
  blockerAdvisorTurns,
  blockerDispositionJustification,
  blockerDispositionReceipt,
  blockerRecoveryActionId,
  deliveryPackage,
  matchingBlockerDispositionReceipt,
  workDesignBlocked,
}: {
  activeBlockerIssue: WorkDesignBlockerIssue | null;
  blockerAdvisorTurns: WorkDesignAdvisorTranscriptLine[];
  blockerDispositionJustification: string;
  blockerDispositionReceipt: WorkDesignBlockerDispositionReceipt | null;
  blockerRecoveryActionId: WorkDesignBlockerRecoveryActionId;
  deliveryPackage: DeliveryPackageSummary;
  matchingBlockerDispositionReceipt: WorkDesignBlockerDispositionReceipt | null;
  workDesignBlocked: boolean;
}) {
  const blockerRecoveryActions = workDesignBlockerRecoveryActions({
    blockerIssue: activeBlockerIssue,
    sourceRef: deliveryPackage.source_ref,
  });
  const selectedBlockerRecoveryAction =
    blockerRecoveryActions.find(
      (action) => action.id === blockerRecoveryActionId,
    ) ??
    blockerRecoveryActions[0] ??
    workDesignFallbackBlockerRecoveryAction;
  const selectedBlockerRecoveryActionRecorded =
    matchingBlockerDispositionReceipt?.recoveryActionId ===
    selectedBlockerRecoveryAction.id;
  const selectedBlockerRecoveryShowsState =
    selectedBlockerRecoveryActionRecorded ||
    selectedBlockerRecoveryAction.id === "accept-risk";
  const selectedBlockerRecoveryVisualTone: DeliveryTone =
    selectedBlockerRecoveryAction.id === "accept-risk"
      ? "danger"
      : selectedBlockerRecoveryActionRecorded
        ? selectedBlockerRecoveryAction.tone
        : "warn";
  const selectedBlockerRecoveryStatusLabel = selectedBlockerRecoveryShowsState
    ? selectedBlockerRecoveryAction.statusLabel
    : "selected";
  const selectedBlockerRecoveryDispositionLabel =
    selectedBlockerRecoveryShowsState
      ? workDesignBlockerDispositionCopy(
          selectedBlockerRecoveryAction.disposition,
        ).label
      : "Pending Action";
  const selectedBlockerRecoveryBlockerLabel = selectedBlockerRecoveryShowsState
    ? selectedBlockerRecoveryAction.clearsBlocker
      ? "Can Clear"
      : "Stays Blocked"
    : selectedBlockerRecoveryAction.clearsBlocker
      ? "Clears After Proof"
      : "Stays Blocked";
  const selectedBlockerRecoveryRequiresNote =
    workDesignBlockerRecoveryRequiresNote(selectedBlockerRecoveryAction);
  const selectedBlockerRecoveryCanRun =
    !selectedBlockerRecoveryAction.disabled &&
    (!selectedBlockerRecoveryRequiresNote ||
      blockerDispositionJustification.trim().length > 0);
  const blockerRecoveryNoteLabel = selectedBlockerRecoveryRequiresNote
    ? "Decision Rationale Required"
    : "Operator Note Optional";
  const blockerRecoveryNotePlaceholder = selectedBlockerRecoveryRequiresNote
    ? "Record why this blocker can stay unresolved or why the risk can be accepted."
    : "Optional context for the recovery result. Repair actions use the selected recovery proof.";
  const blockerDispositionRecordedCopy = matchingBlockerDispositionReceipt
    ? workDesignBlockerDispositionCopy(
        matchingBlockerDispositionReceipt.disposition,
      )
    : null;
  const blockerResultRecoveryAction = blockerDispositionReceipt
    ? blockerRecoveryActions.find(
        (action) => action.id === blockerDispositionReceipt.recoveryActionId,
      )
    : null;
  const blockerResultVisualTone: DeliveryTone =
    blockerResultRecoveryAction?.tone ??
    blockerDispositionRecordedCopy?.tone ??
    "warn";
  const blockerDispositionReceiptRecordedAt = matchingBlockerDispositionReceipt
    ? formatWorkDesignDateTime(matchingBlockerDispositionReceipt.recordedAt)
    : null;
  const blockerCheckLocations = activeBlockerIssue?.checkLocations ?? [];
  const blockerPossibleCauses = activeBlockerIssue?.possibleCauses ?? [];
  const blockerProblemStatusTone: DeliveryTone =
    !matchingBlockerDispositionReceipt
      ? "danger"
      : matchingBlockerDispositionReceipt.disposition === "accept-risk"
        ? "danger"
        : matchingBlockerDispositionReceipt.clearsBlocker
          ? "ok"
          : "danger";
  const blockerProblemStatusLabel = !matchingBlockerDispositionReceipt
    ? "blocked"
    : matchingBlockerDispositionReceipt.disposition === "accept-risk"
      ? "risk accepted"
      : matchingBlockerDispositionReceipt.clearsBlocker
        ? "cleared"
        : "still blocked";
  const blockerProblemLockValue = workDesignBlocked
    ? "Context, Build Tree, Review Draft, and Apply Draft are locked"
    : matchingBlockerDispositionReceipt?.outcome === "risk-accepted"
      ? "Normal Work Design unlocked by accepted risk"
      : "Normal Work Design unlocked by recovery receipt";
  const blockerProblemRecoveryValue = workDesignBlocked
    ? "Choose a valid recovery action below"
    : "Recovery has already been recorded";
  const blockerProblemClearanceValue = workDesignBlocked
    ? "Valid recovery receipt or accepted risk"
    : matchingBlockerDispositionReceipt?.outcome === "risk-accepted"
      ? "Risk acceptance receipt recorded"
      : "Recovery receipt recorded";
  const blockerAdvisorTranscript: WorkDesignAdvisorTranscriptLine[] = [
    {
      id: "advisor-blocker-opening",
      role: "advisor",
      text: "Blocker recovery runs in this workbench while normal Work Design stays locked. Start with Check Apply State, then use only an action that matches the diagnosis: link receipt, rerun apply, rollback, complete the missing step, keep blocked, or accept risk.",
    },
    {
      id: "advisor-blocker-current",
      role: "advisor",
      text: `Current blocker: ${activeBlockerIssue?.summary ?? deliveryPackage.summary} Source: ${deliveryPackage.source_ref}. Selected recovery: ${selectedBlockerRecoveryAction.label}.`,
    },
    ...blockerAdvisorTurns,
  ];

  return {
    blockerAdvisorTranscript,
    blockerCheckLocations,
    blockerDispositionRecordedCopy,
    blockerDispositionReceiptRecordedAt,
    blockerPossibleCauses,
    blockerProblemClearanceValue,
    blockerProblemLockValue,
    blockerProblemRecoveryValue,
    blockerProblemStatusLabel,
    blockerProblemStatusTone,
    blockerRecoveryActions,
    blockerRecoveryNoteLabel,
    blockerRecoveryNotePlaceholder,
    blockerResultRecoveryAction,
    blockerResultVisualTone,
    selectedBlockerRecoveryAction,
    selectedBlockerRecoveryActionRecorded,
    selectedBlockerRecoveryBlockerLabel,
    selectedBlockerRecoveryCanRun,
    selectedBlockerRecoveryDispositionLabel,
    selectedBlockerRecoveryRequiresNote,
    selectedBlockerRecoveryStatusLabel,
    selectedBlockerRecoveryVisualTone,
  };
}
