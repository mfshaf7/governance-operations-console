import type {
  DeliveryPackageSummary,
  DeliveryTone,
} from "../../../../../read-model/index.ts";

import {
  type DeliveryBlockerDisposition,
  type DeliveryBlockerDispositionReceipt,
  type DeliveryBlockerIssue,
  type DeliveryBlockerRecoveryAction,
} from "../../../shared/blocker-recovery/index.ts";

export type RefinementBlockerDispositionCopy = {
  recoveryAction: string;
  resultLabel: string;
  title: string;
  tone: DeliveryTone;
};

export type RefinementSelectedBlockerRecoveryProjection = {
  blockerLabel: string;
  dispositionLabel: string;
  recorded: boolean;
  showsState: boolean;
  statusLabel: string;
  visualTone: DeliveryTone;
};

export type RefinementBlockerResultProjection = {
  dispositionCopy: RefinementBlockerDispositionCopy | null;
  problemClearanceValue: string;
  problemLockValue: string;
  problemRecoveryValue: string;
  problemStatusLabel: string;
  problemStatusTone: DeliveryTone;
  recoveryAction: DeliveryBlockerRecoveryAction | null;
  stillBlocked: boolean;
  visualTone: DeliveryTone;
};

export function refinementBlockerIssue(
  deliveryPackage: DeliveryPackageSummary,
): DeliveryBlockerIssue | null {
  const packet = deliveryPackage.refinement_packet;

  if (
    deliveryPackage.package_posture !== "Blocked" &&
    packet?.status !== "blocked"
  ) {
    return null;
  }

  const blockedGate =
    packet?.readiness_gates.find((gate) => gate.status === "blocked") ?? null;
  const blockedField = packet?.draft_groups
    .flatMap((group) => group.fields)
    .find((field) => field.status === "blocked");

  return {
    canRepairLocally: false,
    checkLocations: [
      `Refinement readiness gates for ${deliveryPackage.source_ref}`,
      "Metadata Workbench selected ART item and field",
      "Applied Work Design handoff tree",
      "OpenProject package owner and security-boundary fields",
    ],
    id: `${deliveryPackage.delivery_package_id}:partial_apply_inconsistent:refinement-source`,
    kind: "partial_apply_inconsistent",
    possibleCauses: [
      blockedGate?.detail ??
        "A required Refinement readiness gate is still blocked.",
      blockedField
        ? `${blockedField.label} is blocked: ${blockedField.value}.`
        : "A required metadata field has no accepted owner or source value.",
      "The package cannot apply metadata until the blocker owner or accepted risk decision is explicit.",
    ],
    recoveryAction:
      "Repair the missing metadata owner in the source package or record an explicit keep-blocked or risk-acceptance decision. Refinement must not silently clear the blocked state.",
    source: "package",
    summary:
      blockedGate?.detail ??
      "Refinement cannot apply metadata because a required readiness gate is blocked.",
    title: blockedGate?.label ?? "Refinement Metadata Blocked",
  };
}

export const refinementFallbackBlockerRecoveryAction: DeliveryBlockerRecoveryAction =
  {
    clearsBlocker: false,
    description: "Keep Refinement locked until a blocker issue is selected.",
    disabled: true,
    disposition: "defer",
    evidenceLines: ["Selected package has no active Refinement blocker issue."],
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

export function refinementBlockerRecoveryActions(
  blockerIssue: DeliveryBlockerIssue | null,
): DeliveryBlockerRecoveryAction[] {
  if (!blockerIssue) {
    return [refinementFallbackBlockerRecoveryAction];
  }

  return [
    {
      clearsBlocker: false,
      description:
        "Inspect the blocked readiness gate, affected metadata field, and source package owner before choosing a recovery action.",
      disabled: false,
      disposition: "workaround",
      evidenceLines: [
        "Blocked readiness gate is identified.",
        "Affected metadata field and ART item are visible in Metadata Workbench.",
        "Required source owner or boundary decision is named.",
      ],
      id: "inspect-apply-state",
      label: "Check Metadata Blocker",
      outcome: "still-blocked",
      primaryLabel: "Record Diagnosis",
      receiptTitle: "Metadata Blocker Checked",
      recoveryAction:
        "Diagnosis recorded. Refinement stays locked until metadata proof, keep-blocked, or risk acceptance is recorded.",
      statusLabel: "diagnosis",
      tone: "info",
    },
    {
      clearsBlocker: true,
      description:
        "Use this after the missing owner, boundary, or required metadata value has been repaired in the source package.",
      disabled: false,
      disposition: "remove",
      evidenceLines: [
        "Required metadata owner or boundary value is present.",
        "Affected ART item and field match the applied Work Design handoff.",
        "Readiness gate can be reviewed again before Apply Refinement.",
      ],
      id: "complete-missing-step",
      label: "Record Metadata Repair",
      outcome: "cleared",
      primaryLabel: "Mark Repair Recorded",
      receiptTitle: "Metadata Repair Recorded",
      recoveryAction:
        "Mock recovery: required Refinement metadata proof recorded and the package can return to readiness review.",
      statusLabel: "repair",
      tone: "ok",
    },
    {
      clearsBlocker: false,
      description:
        "Leave the package blocked while the owner, boundary, or required source value is repaired outside this Refinement session.",
      disabled: false,
      disposition: "defer",
      evidenceLines: [
        "Blocker remains visible in the Refinement Hub.",
        "Apply Refinement stays locked.",
        "Operator note records the next repair owner or proof needed.",
      ],
      id: "keep-blocked",
      label: "Keep Blocked",
      outcome: "still-blocked",
      primaryLabel: "Keep Blocked",
      receiptTitle: "Still Blocked",
      recoveryAction:
        "Keep the package blocked until the required metadata proof is repaired or a different blocker decision is recorded.",
      statusLabel: "no change",
      tone: "muted",
    },
    {
      clearsBlocker: true,
      description:
        "Unlock local Refinement without repairing the source metadata. This is an explicit operator risk decision.",
      disabled: false,
      disposition: "accept-risk",
      evidenceLines: [
        "Risk acceptance note is recorded locally.",
        "The blocked metadata field remains visible to audit.",
        "Future live wiring must keep unresolved source proof visible.",
      ],
      id: "accept-risk",
      label: "Accept Risk",
      outcome: "risk-accepted",
      primaryLabel: "Accept Risk And Continue",
      receiptTitle: "Risk Acceptance Recorded",
      recoveryAction:
        "Continue locally with explicit risk acceptance; this does not repair the missing metadata proof.",
      statusLabel: "override",
      tone: "danger",
    },
  ];
}

export function refinementSelectedBlockerRecoveryProjection({
  matchingReceipt,
  selectedAction,
}: {
  matchingReceipt: DeliveryBlockerDispositionReceipt | null;
  selectedAction: DeliveryBlockerRecoveryAction;
}): RefinementSelectedBlockerRecoveryProjection {
  const recorded = matchingReceipt?.recoveryActionId === selectedAction.id;
  const showsState = recorded || selectedAction.id === "accept-risk";
  const visualTone: DeliveryTone =
    selectedAction.id === "accept-risk"
      ? "danger"
      : recorded
        ? selectedAction.tone
        : "warn";

  return {
    blockerLabel: showsState
      ? selectedAction.clearsBlocker
        ? "Can Resume"
        : "Stays Blocked"
      : selectedAction.clearsBlocker
        ? "Resumes After Proof"
        : "Stays Blocked",
    dispositionLabel: showsState
      ? refinementBlockerDispositionCopy(selectedAction.disposition).title
      : "Pending Action",
    recorded,
    showsState,
    statusLabel: showsState ? selectedAction.statusLabel : "selected",
    visualTone,
  };
}

export function refinementBlockerResultProjection({
  activeBlockerIssue,
  actions,
  matchingReceipt,
}: {
  activeBlockerIssue: DeliveryBlockerIssue | null;
  actions: DeliveryBlockerRecoveryAction[];
  matchingReceipt: DeliveryBlockerDispositionReceipt | null;
}): RefinementBlockerResultProjection {
  const dispositionCopy = matchingReceipt
    ? refinementBlockerDispositionCopy(matchingReceipt.disposition)
    : null;
  const recoveryAction = matchingReceipt
    ? (actions.find(
        (action) => action.id === matchingReceipt.recoveryActionId,
      ) ?? null)
    : null;
  const stillBlocked =
    Boolean(activeBlockerIssue) &&
    !(
      matchingReceipt?.clearsBlocker ||
      matchingReceipt?.disposition === "accept-risk"
    );

  return {
    dispositionCopy,
    problemClearanceValue: stillBlocked
      ? "Metadata owner proof, keep-blocked decision, or accepted risk"
      : matchingReceipt?.disposition === "accept-risk"
        ? "Risk acceptance recorded"
        : "Metadata repair receipt recorded",
    problemLockValue: stillBlocked
      ? "Metadata Workbench, Readiness Review, and Apply Refinement are locked"
      : matchingReceipt?.disposition === "accept-risk"
        ? "Refinement may resume locally by accepted risk"
        : "Refinement may resume after metadata repair proof",
    problemRecoveryValue: stillBlocked
      ? "Choose a recovery action below"
      : "Recovery result has already been recorded",
    problemStatusLabel: stillBlocked
      ? "blocked"
      : matchingReceipt?.disposition === "accept-risk"
        ? "risk accepted"
        : "cleared",
    problemStatusTone: stillBlocked
      ? "danger"
      : matchingReceipt?.disposition === "accept-risk"
        ? "danger"
        : "ok",
    recoveryAction,
    stillBlocked,
    visualTone: recoveryAction?.tone ?? dispositionCopy?.tone ?? "warn",
  };
}

export function refinementBlockerDispositionCopy(
  disposition: DeliveryBlockerDisposition,
): RefinementBlockerDispositionCopy {
  switch (disposition) {
    case "accept-risk":
      return {
        recoveryAction:
          "Continue locally with an explicit risk note; missing metadata proof stays visible.",
        resultLabel: "risk accepted",
        title: "Risk Acceptance Recorded",
        tone: "danger",
      };
    case "remove":
      return {
        recoveryAction:
          "Return to Refinement only after the selected recovery action records metadata proof.",
        resultLabel: "cleared",
        title: "Recovery Cleared",
        tone: "ok",
      };
    case "workaround":
      return {
        recoveryAction:
          "Keep the package blocked while diagnosis is proven or a recovery action is recorded.",
        resultLabel: "diagnosis recorded",
        title: "Diagnosis Recorded",
        tone: "warn",
      };
    case "defer":
    default:
      return {
        recoveryAction:
          "Leave the package blocked until the metadata issue is fixed or the operator records a different decision.",
        resultLabel: "kept blocked",
        title: "Still Blocked",
        tone: "muted",
      };
  }
}

export function refinementBlockerAdvisorResponse({
  activeBlockerIssue,
  deliveryPackage,
  prompt,
  recoveryAction,
}: {
  activeBlockerIssue: DeliveryBlockerIssue | null;
  deliveryPackage: DeliveryPackageSummary;
  prompt: string;
  recoveryAction: DeliveryBlockerRecoveryAction;
}) {
  const promptHint =
    prompt.length > 120 ? `${prompt.slice(0, 117)}...` : prompt;
  const checkText = activeBlockerIssue?.checkLocations?.length
    ? `Check: ${activeBlockerIssue.checkLocations.join("; ")}. `
    : "";

  return (
    `Mock refinement blocker advisor: ${recoveryAction.label} is a ${recoveryAction.statusLabel} action. ` +
    `${recoveryAction.description} ${checkText}` +
    `Required proof: ${recoveryAction.evidenceLines.join("; ")}. ` +
    `Recovery result: ${recoveryAction.recoveryAction} ` +
    `For ${deliveryPackage.source_ref}, make sure the note says which metadata owner or boundary proof is missing and what must be true before Refinement apply resumes. ` +
    `Operator ask: ${promptHint}`
  );
}
