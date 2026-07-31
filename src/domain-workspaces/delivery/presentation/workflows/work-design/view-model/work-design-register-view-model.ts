import type {
  DeliveryPackagePosture,
  DeliveryPackageSummary,
  DeliveryTone,
} from "../../../../read-model/index.ts";
import { getDeliveryEffectivePackageProjection } from "../../../../read-model/index.ts";

import { workDesignPackageBlockerIssue } from "../support/blocker-recovery/work-design-blocker-model.ts";
import {
  workDesignPackageLinkedFromSource,
  workDesignPackageStatusFromBlockerReceipt,
} from "./work-design-source-posture-model.ts";
import type {
  WorkDesignBlockerDispositionReceipt,
  WorkDesignBlockerIssue,
  WorkDesignRegisterPackage,
  WorkDesignRegisterRecoveryProjection,
  WorkDesignRegisterStatusProjection,
  WorkDesignPersistedSession,
  WorkDesignSessionProjectionState,
  WorkDesignStep,
} from "../model/work-design-model.ts";

export type WorkDesignRegisterStatusLabel =
  DeliveryPackagePosture | "Linked" | "Risk Accepted";

export function projectWorkDesignRegisterPackage(
  deliveryPackage: DeliveryPackageSummary,
  persistedSession: WorkDesignPersistedSession | null,
): WorkDesignRegisterPackage {
  if (deliveryPackage.workflow_phase !== "work_design") {
    return deliveryPackage;
  }

  const sourceBlockerIssue =
    deliveryPackage.package_posture === "Blocked"
      ? workDesignPackageBlockerIssue(deliveryPackage)
      : null;
  const activeBlockerIssue = sourceBlockerIssue;

  if (!activeBlockerIssue) {
    return projectWorkDesignSessionRegisterPackage(
      deliveryPackage,
      persistedSession,
    );
  }

  const matchingReceipt =
    persistedSession?.blocker?.issueId === activeBlockerIssue.id
      ? persistedSession.blocker
      : null;

  if (!persistedSession && !matchingReceipt) {
    return deliveryPackage;
  }

  const recovery = workDesignRegisterRecoveryProjection({
    deliveryPackage,
    issue: activeBlockerIssue,
    receipt: matchingReceipt,
  });

  return {
    ...deliveryPackage,
    delivery_package_register_recovery: recovery,
  };
}

function projectWorkDesignSessionRegisterPackage(
  deliveryPackage: DeliveryPackageSummary,
  persistedSession: WorkDesignPersistedSession | null,
): WorkDesignRegisterPackage {
  if (!persistedSession) {
    return deliveryPackage;
  }

  const registerStep = workDesignRegisterStepFromSessionState(
    persistedSession,
    deliveryPackage,
  );
  const registerStatus =
    workDesignRegisterStatusFromSessionState(persistedSession);

  if (
    !registerStatus &&
    registerStep === workDesignRegisterStep(deliveryPackage)
  ) {
    return deliveryPackage;
  }

  return {
    ...deliveryPackage,
    ...(registerStatus
      ? { delivery_package_register_status: registerStatus }
      : {}),
    delivery_package_register_step: registerStep,
  };
}

export function workDesignRegisterStepFromSessionState(
  sessionState: WorkDesignSessionProjectionState,
  deliveryPackage: WorkDesignRegisterPackage,
): WorkDesignStep {
  if (sessionState.apply.applyReceiptRecorded && sessionState.apply.receiptId) {
    return "history";
  }

  if (sessionState.review.draftReviewAccepted) {
    return "apply";
  }

  return workDesignRegisterStep(deliveryPackage);
}

export function workDesignRegisterStatusFromSessionState(
  sessionState: WorkDesignSessionProjectionState,
): WorkDesignRegisterStatusProjection | null {
  if (
    !sessionState.apply.applyReceiptRecorded ||
    !sessionState.apply.receiptId
  ) {
    return null;
  }

  return {
    statusLabel: "Done",
    summary:
      "Work Design apply receipt is captured. This package is complete for this Work Design pass.",
  };
}

export function workDesignRegisterRecoveryProjection({
  deliveryPackage,
  issue,
  receipt,
}: {
  deliveryPackage: WorkDesignRegisterPackage;
  issue: WorkDesignBlockerIssue;
  receipt: WorkDesignBlockerDispositionReceipt | null;
}): WorkDesignRegisterRecoveryProjection {
  if (!receipt) {
    return workDesignBlockedRegisterProjection(issue.recoveryAction);
  }

  if (receipt.disposition === "accept-risk") {
    const registerStep = workDesignRegisterStep(deliveryPackage);

    return {
      actionTitle: workDesignRegisterActionTitle(registerStep),
      nextStepLabel: workDesignNormalNextStepLabel(
        deliveryPackage,
        registerStep,
      ),
      recoveryAction: receipt.recoveryAction,
      registerStep,
      statusLabel: "Risk Accepted",
      stepLabel: workDesignStepLabel(registerStep),
    };
  }

  if (!receipt.clearsBlocker) {
    return workDesignBlockedRegisterProjection(receipt.recoveryAction);
  }

  const registerStep = workDesignRegisterStep(deliveryPackage);
  const status = workDesignPackageStatusFromBlockerReceipt(receipt);

  return {
    actionTitle: workDesignRegisterActionTitle(registerStep),
    nextStepLabel: workDesignNormalNextStepLabel(deliveryPackage, registerStep),
    recoveryAction: receipt.recoveryAction,
    registerStep,
    statusLabel: status.label,
    stepLabel: workDesignStepLabel(registerStep),
  };
}

export function workDesignRegisterStatusLabel(
  deliveryPackage: WorkDesignRegisterPackage,
): WorkDesignRegisterStatusLabel {
  if (workDesignPackageLinkedFromSource(deliveryPackage)) {
    return "Linked";
  }

  return (
    deliveryPackage.delivery_package_register_recovery?.statusLabel ??
    deliveryPackage.delivery_package_register_status?.statusLabel ??
    getDeliveryEffectivePackageProjection(deliveryPackage).posture
  );
}

export function workDesignRegisterStatusTone(
  deliveryPackage: WorkDesignRegisterPackage,
): DeliveryTone {
  return workDesignRegisterToneForStatus(
    workDesignRegisterStatusLabel(deliveryPackage),
  );
}

export function workDesignRegisterToneForStatus(
  statusLabel: WorkDesignRegisterStatusLabel,
): DeliveryTone {
  switch (statusLabel) {
    case "Ready":
      return "info";
    case "Linked":
      return "muted";
    case "Done":
      return "ok";
    case "Blocked":
    case "Risk Accepted":
      return "danger";
    case "Closeout Pending":
      return "warn";
    case "In Progress":
      return "info";
    case "Deferred":
    case "Retired":
      return "muted";
  }
}

export function workDesignRegisterPackageSummary(
  deliveryPackage: WorkDesignRegisterPackage,
) {
  const recovery = deliveryPackage.delivery_package_register_recovery;
  const status = deliveryPackage.delivery_package_register_status;

  if (!recovery) {
    if (status) {
      return status.summary;
    }

    return getDeliveryEffectivePackageProjection(deliveryPackage).summary;
  }

  if (recovery.statusLabel === "Ready") {
    return "Work Design package is ready to continue through the normal Design Hub flow.";
  }

  if (recovery.statusLabel === "Risk Accepted") {
    return "Work Design can continue with accepted risk; the unresolved proof remains visible in Blocker Recovery.";
  }

  return deliveryPackage.summary;
}

export function workDesignSelectedPackageShowsBlockerContext(
  deliveryPackage: WorkDesignRegisterPackage,
) {
  const recovery = deliveryPackage.delivery_package_register_recovery;

  return (
    !recovery ||
    recovery.statusLabel === "Risk Accepted" ||
    recovery.statusLabel === "Blocked"
  );
}

export function workDesignStepLabel(step: WorkDesignStep) {
  switch (step) {
    case "apply":
      return "Apply Draft";
    case "build":
      return "Build Tree";
    case "context":
      return "Context Session";
    case "history":
      return "History";
    case "hub":
      return "Hub";
    case "review":
      return "Review Draft";
  }
}

export function workDesignRegisterStep(
  deliveryPackage: WorkDesignRegisterPackage,
) {
  if (
    deliveryPackage.local_workflow_projection?.workflow_phase ===
      "work_design" &&
    deliveryPackage.local_workflow_projection.status_label === "Done"
  ) {
    return "history";
  }

  return (
    deliveryPackage.delivery_package_register_step ??
    deliveryPackage.work_design_context_session?.initial_step ??
    "context"
  );
}

export function workDesignRegisterActionTitle(step: WorkDesignStep) {
  switch (step) {
    case "apply":
      return "Apply Draft";
    case "build":
      return "Continue Build Tree";
    case "context":
    case "hub":
      return "Open Context Session";
    case "history":
      return "View Work Design History";
    case "review":
      return "Review Draft";
  }
}

export function workDesignRegisterActionTone(
  step: WorkDesignStep,
): DeliveryTone {
  switch (step) {
    case "apply":
    case "context":
    case "hub":
    case "review":
      return "warn";
    case "build":
      return "info";
    case "history":
      return "ok";
  }
}

export function workDesignNormalNextStepLabel(
  deliveryPackage: DeliveryPackageSummary,
  step = workDesignRegisterStep(deliveryPackage),
) {
  if (workDesignPackageLinkedFromSource(deliveryPackage)) {
    return "View Decision";
  }

  if (
    deliveryPackage.local_workflow_projection?.workflow_phase ===
      "work_design" &&
    deliveryPackage.local_workflow_projection.status_label === "Done"
  ) {
    return "Work Design Complete";
  }

  if (deliveryPackage.package_posture === "Done") {
    return "Work Design Complete";
  }

  if (deliveryPackage.package_posture === "Retired") {
    return "Archive";
  }

  switch (step) {
    case "apply":
      return "History";
    case "build":
      return "Review Draft";
    case "context":
      return "Build Tree";
    case "history":
      return "Work Design Complete";
    case "hub":
      return "Context Session";
    case "review":
      return "Apply Draft";
  }
}

export function workDesignNextStepLabel(
  deliveryPackage: WorkDesignRegisterPackage,
) {
  if (deliveryPackage.delivery_package_register_recovery) {
    return deliveryPackage.delivery_package_register_recovery.nextStepLabel;
  }

  if (deliveryPackage.package_posture === "Blocked") {
    return "Blocker Recovery";
  }

  return workDesignNormalNextStepLabel(deliveryPackage);
}

function workDesignBlockedRegisterProjection(
  recoveryAction: string,
): WorkDesignRegisterRecoveryProjection {
  return {
    actionTitle: "Open Blocked Design Hub",
    nextStepLabel: "Blocker Recovery",
    recoveryAction,
    registerStep: "hub",
    statusLabel: "Blocked",
    stepLabel: "Blocked In Design Hub",
  };
}
