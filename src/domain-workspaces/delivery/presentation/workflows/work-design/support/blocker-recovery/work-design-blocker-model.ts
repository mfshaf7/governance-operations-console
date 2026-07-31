import type { DeliveryPackageSummary } from "../../../../../read-model/index.ts";

import {
  deliveryBlockerRecoveryDefaultJustification,
  deliveryBlockerRecoveryRequiresNote,
  deliveryDefaultBlockerRecoveryActionId,
  type DeliveryBlockerAdvisorResponseInput,
  type DeliveryBlockerIssue,
  type DeliveryBlockerIssueKind,
  type DeliveryBlockerRecoveryAction,
} from "../../../shared/blocker-recovery/index.ts";

export type WorkDesignBlockerRecoveryAction = DeliveryBlockerRecoveryAction;

export const workDesignFallbackBlockerRecoveryAction: WorkDesignBlockerRecoveryAction =
  {
    clearsBlocker: false,
    description:
      "Keep normal Work Design locked until a blocker issue is selected.",
    disabled: true,
    disposition: "defer",
    evidenceLines: [
      "Selected package has no active Work Design blocker issue.",
    ],
    id: "keep-blocked",
    label: "Keep Blocked",
    outcome: "still-blocked",
    primaryLabel: "Keep Blocked",
    receiptTitle: "Still Blocked",
    recoveryAction:
      "No blocker recovery action can run without an active blocker.",
    statusLabel: "locked",
    tone: "muted",
  };

export function workDesignBlockerIssueForKind({
  deliveryPackage,
  idSuffix,
  kind,
  source,
}: {
  deliveryPackage: DeliveryPackageSummary;
  idSuffix: string;
  kind: DeliveryBlockerIssueKind;
  source: DeliveryBlockerIssue["source"];
}): DeliveryBlockerIssue {
  const issueId = `${deliveryPackage.delivery_package_id}:${kind}:${idSuffix}`;

  switch (kind) {
    case "context_snapshot_attach_failed":
      return {
        canRepairLocally: true,
        id: issueId,
        kind,
        recoveryAction:
          "Retry snapshot attachment or record a bounded fallback before the reviewed draft can be treated as applied.",
        source,
        summary:
          "Apply Draft started, but the finalized context snapshot could not be attached to the Work Design receipt.",
        title: "Context Snapshot Attach Failed",
      };
    case "partial_apply_inconsistent":
      return {
        canRepairLocally: false,
        id: issueId,
        kind,
        recoveryAction:
          "Keep the package blocked until the partial apply state is reconciled and the reviewed tree matches the receipt trail.",
        source,
        summary:
          "Apply Draft returned a partial result, leaving the reviewed tree and receipt state inconsistent.",
        title: "Partial Apply State Inconsistent",
      };
    case "tree_snapshot_persist_failed":
      return {
        canRepairLocally: true,
        id: issueId,
        kind,
        recoveryAction:
          "Rebuild or retry the reviewed tree snapshot before another Apply Draft attempt.",
        source,
        summary:
          "Apply Draft started, but the reviewed tree snapshot could not be preserved for the receipt.",
        title: "Reviewed Tree Snapshot Failed",
      };
    case "receipt_persist_failed":
    default:
      return {
        canRepairLocally: true,
        id: issueId,
        kind: "receipt_persist_failed",
        recoveryAction:
          "Retry local receipt persistence or keep the package blocked until the receipt trail can be trusted.",
        source,
        summary:
          "Apply Draft started, but the immutable local Work Design receipt could not be stored.",
        title: "Apply Receipt Store Failed",
      };
  }
}

export function workDesignPackageBlockerIssue(
  deliveryPackage: DeliveryPackageSummary,
): DeliveryBlockerIssue {
  if (deliveryPackage.work_design_blocker) {
    return {
      canRepairLocally: deliveryPackage.work_design_blocker.can_repair_locally,
      checkLocations: deliveryPackage.work_design_blocker.check_locations,
      id: `${deliveryPackage.delivery_package_id}:${deliveryPackage.work_design_blocker.issue_kind}:source`,
      kind: deliveryPackage.work_design_blocker.issue_kind,
      possibleCauses: deliveryPackage.work_design_blocker.possible_causes,
      recoveryAction: deliveryPackage.work_design_blocker.recovery_action,
      source: deliveryPackage.work_design_blocker.source,
      summary: deliveryPackage.work_design_blocker.summary,
      title: deliveryPackage.work_design_blocker.title,
    };
  }

  return workDesignBlockerIssueForKind({
    deliveryPackage,
    idSuffix: "source",
    kind: "receipt_persist_failed",
    source: "package",
  });
}

export function workDesignBlockerRecoveryActions({
  blockerIssue,
  sourceRef,
}: {
  blockerIssue: DeliveryBlockerIssue | null;
  sourceRef: string;
}): WorkDesignBlockerRecoveryAction[] {
  if (!blockerIssue) {
    return [workDesignFallbackBlockerRecoveryAction];
  }

  const checkLocations = blockerIssue.checkLocations?.length
    ? blockerIssue.checkLocations
    : [
        `Apply Run Log for ${sourceRef}`,
        "Work Design Receipt Archive",
        "Current package projection",
      ];
  const checkAction: WorkDesignBlockerRecoveryAction = {
    clearsBlocker: false,
    description:
      "Read the apply log, receipt archive, and package projection before choosing a repair action.",
    disabled: false,
    disposition: "workaround",
    evidenceLines: checkLocations,
    id: "inspect-apply-state",
    label: "Check Apply State",
    outcome: "still-blocked",
    primaryLabel: "Check Apply State",
    receiptTitle: "Apply State Checked",
    recoveryAction:
      "Diagnosis recorded. Keep normal Work Design locked until a concrete repair or explicit risk acceptance is recorded.",
    statusLabel: "diagnosis",
    tone: "info",
  };
  const keepBlockedAction: WorkDesignBlockerRecoveryAction = {
    clearsBlocker: false,
    description:
      "Leave the package blocked while the missing proof or partial state is repaired elsewhere.",
    disabled: false,
    disposition: "defer",
    evidenceLines: [
      "Blocker remains visible in Design Hub.",
      "Normal Work Design actions stay locked.",
      "Operator note records the next repair owner or proof needed.",
    ],
    id: "keep-blocked",
    label: "Keep Blocked",
    outcome: "still-blocked",
    primaryLabel: "Keep Blocked",
    receiptTitle: "Still Blocked",
    recoveryAction:
      "Keep the package blocked until the failed evidence is repaired or the operator records a different decision.",
    statusLabel: "no change",
    tone: "muted",
  };
  const acceptRiskAction: WorkDesignBlockerRecoveryAction = {
    clearsBlocker: true,
    description:
      "Unlock local Work Design without repairing the missing or degraded proof. This is an explicit risk decision.",
    disabled: false,
    disposition: "accept-risk",
    evidenceLines: [
      "Risk acceptance note is recorded locally.",
      "The blocker evidence remains described in the receipt.",
      "Future live wiring must keep the unresolved proof visible to audit.",
    ],
    id: "accept-risk",
    label: "Accept Risk",
    outcome: "risk-accepted",
    primaryLabel: "Accept Risk And Continue",
    receiptTitle: "Risk Acceptance Recorded",
    recoveryAction:
      "Continue locally with explicit risk acceptance; this does not repair the missing or degraded proof.",
    statusLabel: "override",
    tone: "danger",
  };
  const rerunApplyAction: WorkDesignBlockerRecoveryAction = {
    clearsBlocker: true,
    description:
      "Run the approved Apply Draft path again so the system produces a new receipt instead of hand-creating one.",
    disabled: false,
    disposition: "remove",
    evidenceLines: [
      "Approved Apply Draft path is used.",
      "New apply run returns a recovery receipt.",
      "Package projection refreshes after the receipt is linked.",
    ],
    id: "rerun-apply",
    label: "Rerun Apply",
    outcome: "cleared",
    primaryLabel: "Rerun Apply",
    receiptTitle: "Apply Rerun Recorded",
    recoveryAction:
      "Mock recovery: Apply Draft rerun through the approved path and returned a new recovery receipt.",
    statusLabel: "repair",
    tone: "ok",
  };
  const rollbackApplyAction: WorkDesignBlockerRecoveryAction = {
    clearsBlocker: true,
    description:
      "Undo the unsafe apply state so the package returns to a known pre-apply posture.",
    disabled: false,
    disposition: "remove",
    evidenceLines: [
      "Changed package state is rolled back or reconciled.",
      "Rollback receipt records the restored safe point.",
      "Work Design can return to Apply Draft after the blocker clears.",
    ],
    id: "rollback-apply",
    label: "Rollback Apply",
    outcome: "cleared",
    primaryLabel: "Rollback Apply",
    receiptTitle: "Apply Rollback Recorded",
    recoveryAction:
      "Mock recovery: partial or unproven apply state rolled back to a known safe point.",
    statusLabel: "repair",
    tone: "warn",
  };

  switch (blockerIssue.kind) {
    case "context_snapshot_attach_failed": {
      const attachSnapshotAction: WorkDesignBlockerRecoveryAction = {
        clearsBlocker: true,
        description:
          "Attach the finalized context snapshot or an approved replacement to the package record.",
        disabled: false,
        disposition: "remove",
        evidenceLines: [
          "Snapshot artifact identity is present.",
          "Attachment target is the selected package record.",
          "Receipt records attached or approved replacement status.",
        ],
        id: "attach-snapshot",
        label: "Attach Snapshot",
        outcome: "cleared",
        primaryLabel: "Attach Snapshot",
        receiptTitle: "Snapshot Attachment Recorded",
        recoveryAction:
          "Mock recovery: finalized context snapshot attached and receipt status updated.",
        statusLabel: "repair",
        tone: "ok",
      };

      return [
        checkAction,
        attachSnapshotAction,
        rerunApplyAction,
        keepBlockedAction,
        acceptRiskAction,
      ];
    }
    case "partial_apply_inconsistent": {
      const completeMissingStepAction: WorkDesignBlockerRecoveryAction = {
        clearsBlocker: true,
        description:
          "Finish the missing apply step so the package and receipt describe the same state.",
        disabled: false,
        disposition: "remove",
        evidenceLines: [
          "OpenProject package state matches the reviewed draft.",
          "Receipt records the completed missing step.",
          "Projection refresh confirms package and receipt agreement.",
        ],
        id: "complete-missing-step",
        label: "Complete Missing Step",
        outcome: "cleared",
        primaryLabel: "Complete Missing Step",
        receiptTitle: "Partial Apply Completed",
        recoveryAction:
          "Mock recovery: missing apply step completed and package state now matches the receipt.",
        statusLabel: "repair",
        tone: "ok",
      };

      return [
        checkAction,
        completeMissingStepAction,
        rollbackApplyAction,
        keepBlockedAction,
        acceptRiskAction,
      ];
    }
    case "tree_snapshot_persist_failed": {
      const rebuildTreeSnapshotAction: WorkDesignBlockerRecoveryAction = {
        clearsBlocker: true,
        description:
          "Recreate the reviewed tree snapshot from the current reviewed draft before applying again.",
        disabled: false,
        disposition: "remove",
        evidenceLines: [
          "Reviewed draft tree is still available.",
          "Tree snapshot is rebuilt from that reviewed draft.",
          "Apply Draft can retry with a stable input snapshot.",
        ],
        id: "rebuild-tree-snapshot",
        label: "Rebuild Tree Snapshot",
        outcome: "cleared",
        primaryLabel: "Rebuild Tree Snapshot",
        receiptTitle: "Tree Snapshot Rebuilt",
        recoveryAction:
          "Mock recovery: reviewed tree snapshot rebuilt and Apply Draft can be retried.",
        statusLabel: "repair",
        tone: "ok",
      };

      return [
        checkAction,
        rebuildTreeSnapshotAction,
        rerunApplyAction,
        keepBlockedAction,
        acceptRiskAction,
      ];
    }
    case "receipt_persist_failed":
    default: {
      const linkReceiptAction: WorkDesignBlockerRecoveryAction = {
        clearsBlocker: true,
        description:
          "Use this only when diagnosis finds a valid receipt that was created but not linked to the package.",
        disabled: false,
        disposition: "remove",
        evidenceLines: [
          "Valid receipt exists in the Apply Run Log or Receipt Archive.",
          "Receipt matches this package and reviewed draft.",
          "Receipt link is attached back to the package record.",
        ],
        id: "link-existing-receipt",
        label: "Link Existing Receipt",
        outcome: "cleared",
        primaryLabel: "Link Existing Receipt",
        receiptTitle: "Existing Receipt Linked",
        recoveryAction:
          "Mock recovery: existing receipt linked back to the package record.",
        statusLabel: "repair",
        tone: "ok",
      };

      return [
        checkAction,
        linkReceiptAction,
        rerunApplyAction,
        rollbackApplyAction,
        keepBlockedAction,
        acceptRiskAction,
      ];
    }
  }
}

export function workDesignBlockerRecoveryRequiresNote(
  action: WorkDesignBlockerRecoveryAction,
) {
  return deliveryBlockerRecoveryRequiresNote(action);
}

export function workDesignDefaultBlockerRecoveryActionId(
  actions: WorkDesignBlockerRecoveryAction[],
) {
  return deliveryDefaultBlockerRecoveryActionId(
    actions,
    workDesignFallbackBlockerRecoveryAction,
  );
}

export function workDesignBlockerRecoveryDefaultJustification(
  action: WorkDesignBlockerRecoveryAction,
) {
  return deliveryBlockerRecoveryDefaultJustification(action);
}

export function workDesignBlockerAdvisorResponse({
  deliveryPackage,
  prompt,
  recoveryAction,
}: DeliveryBlockerAdvisorResponseInput) {
  const promptHint =
    prompt.length > 120 ? `${prompt.slice(0, 117)}...` : prompt;
  const sourceBlocker = deliveryPackage.work_design_blocker;
  const sourceCauseText = sourceBlocker?.possible_causes?.length
    ? `Possible causes: ${sourceBlocker.possible_causes.join("; ")}. `
    : "";
  const sourceCheckText = sourceBlocker?.check_locations?.length
    ? `Check: ${sourceBlocker.check_locations.join("; ")}. `
    : "";

  return (
    `Mock blocker advisor: ${recoveryAction.label} is a ${recoveryAction.statusLabel} action. ${recoveryAction.description} ` +
    sourceCauseText +
    sourceCheckText +
    `Required proof: ${recoveryAction.evidenceLines.join("; ")}. ` +
    `Recovery result: ${recoveryAction.recoveryAction} ` +
    `For ${deliveryPackage.source_ref}, make sure the note says what is broken, where the fix happens, and what proof is needed before normal work continues. ` +
    `Operator ask: ${promptHint}`
  );
}
