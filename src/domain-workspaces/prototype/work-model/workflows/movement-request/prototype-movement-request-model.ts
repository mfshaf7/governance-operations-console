import type { OperationTone } from "../../../../operation-contracts/operation-state.ts";

import type {
  PrototypeCurrentMove,
  PrototypeMovementRequestDraft,
  PrototypeRecord,
} from "../../../domain/prototype-types.ts";
import {
  prototypeMovementRequestStateTone,
  prototypeMovementStateLabel,
} from "../../../domain/prototype-movement-state.ts";

export type PrototypeMovementRequestStepId = "intent" | "request";

export type PrototypeMovementRequestStep = {
  available: boolean;
  connectsToNext?: boolean;
  current: boolean;
  detail: string;
  id: PrototypeMovementRequestStepId;
  label: string;
  stateLabel: string;
  tone: OperationTone;
};

export type PrototypeMovementRequestMove = {
  description: string;
  statusLabel: string;
  title: string;
  tone: OperationTone;
};

export type PrototypeMovementIntentId =
  "governed-delivery" | "impacted-closeout" | "returned-correction";

const prototypeMovementIntentIds = [
  "governed-delivery",
  "impacted-closeout",
  "returned-correction",
] as const satisfies readonly PrototypeMovementIntentId[];

export type PrototypeMovementRequestDraftInput = {
  movementIntent: PrototypeMovementIntentId;
  requestReason: string;
  targetLane: string;
  targetOwner: string;
};

export type PrototypeMovementReturnInstruction = {
  authority: string;
  owner: string;
  recordedAt: string | null;
  receiptRef: string | null;
  requiredFix: string;
};

export function prototypeMovementRequestActiveStep(
  record: PrototypeRecord,
): PrototypeMovementRequestStepId {
  if (record.currentMove.id === "movement-request") {
    return "intent";
  }

  return "request";
}

export function prototypeMovementRequestMove(
  record: PrototypeRecord,
): PrototypeMovementRequestMove {
  if (record.lifecycle === "retired" || record.lifecycle === "graduated") {
    return {
      description:
        "This prototype has a terminal lifecycle record. Movement request data is review-only.",
      statusLabel: "Review",
      title: "Movement Archived",
      tone: "muted",
    };
  }

  if (record.currentMove.id === "movement-request") {
    return {
      description: record.currentMove.detail,
      statusLabel: "Current",
      title: record.currentMove.label,
      tone: record.currentMove.tone,
    };
  }

  if (record.baseline.state !== "ready-for-movement") {
    return {
      description:
        "Baseline evidence must be ready before Prototype can prepare a Movement request.",
      statusLabel: "Locked",
      title: "Baseline Required First",
      tone: "muted",
    };
  }

  if (record.movementRequest.state === "draft-ready") {
    return {
      description:
        "Movement request fields are ready for local preparation. Movement Control still owns the decision.",
      statusLabel: "Review",
      title: "Request Draft Ready",
      tone: "warn",
    };
  }

  if (record.movementRequest.state === "receipt-projected") {
    return {
      description:
        "A Movement receipt exists outside Prototype. Review history for the accepted result.",
      statusLabel: "Recorded",
      title: "External Movement Receipt",
      tone: "ok",
    };
  }

  if (record.movementRequest.state === "request-recorded") {
    return {
      description:
        "A local Movement request record exists. Movement Control still owns queueing, decision, outcome, and durable receipt.",
      statusLabel: "Request recorded",
      title: "Movement Request Recorded",
      tone: "info",
    };
  }

  if (record.movementRequest.state === "returned") {
    return {
      description: record.movementRequest.requestReason,
      statusLabel: "Returned",
      title: "Movement Correction Needed",
      tone: "warn",
    };
  }

  return {
    description: record.movementRequest.requestReason,
    statusLabel: prototypeMovementStateLabel(record.movementRequest.state),
    title: "Movement Request Draft",
    tone: prototypeMovementRequestTone(record),
  };
}

export function prototypeMovementRequestWorkflowSteps(
  record: PrototypeRecord,
): PrototypeMovementRequestStep[] {
  const activeStep = prototypeMovementRequestActiveStep(record);
  const gatesNeedingWork = record.movementRequest.gateSnapshot.filter(
    (gate) => gate.status !== "ready" && gate.status !== "not-required",
  );
  const recordedOutput = prototypeMovementRequestHasRecordedOutput(record);
  const gatesTone = prototypeMovementGateTone(record);
  const requestTone = prototypeMovementRequestTone(record);

  return [
    {
      available: true,
      connectsToNext: true,
      current: activeStep === "intent",
      detail: `${record.movementRequest.movementType} / ${record.movementRequest.targetHome}`,
      id: "intent",
      label: "Movement Intent",
      stateLabel: record.movementRequest.movementType ? "Ready" : "Open",
      tone: record.movementRequest.movementType ? "ok" : "warn",
    },
    {
      available: true,
      connectsToNext: false,
      current: activeStep === "request",
      detail:
        gatesNeedingWork.length > 0
          ? `${gatesNeedingWork.length} gate${gatesNeedingWork.length === 1 ? " needs" : "s need"} review`
          : recordedOutput
            ? (record.movementRequest.lastMovementReceiptRef ??
              "Review request fields.")
            : "Review request fields.",
      id: "request",
      label: "Review and Apply",
      stateLabel: prototypeMovementStateLabel(record.movementRequest.state),
      tone: gatesNeedingWork.length > 0 ? gatesTone : requestTone,
    },
  ];
}

export function prototypeMovementRequestActionState(record: PrototypeRecord) {
  if (record.lifecycle === "retired" || record.lifecycle === "graduated") {
    return {
      label: "Review only",
      tone: "muted" as OperationTone,
    };
  }

  if (record.movementRequest.state === "returned") {
    return {
      label: "Correction needed",
      tone: "warn" as OperationTone,
    };
  }

  if (prototypeMovementRequestHasRecordedOutput(record)) {
    return {
      label: "Request recorded",
      tone: "info" as OperationTone,
    };
  }

  if (record.baseline.state !== "ready-for-movement") {
    return {
      label: "Locked",
      tone: "muted" as OperationTone,
    };
  }

  return {
    label: "Local record",
    tone: prototypeMovementRequestTone(record),
  };
}

export function prototypeRecordAfterMovementRequest(
  record: PrototypeRecord,
  receiptRef: string,
  draft: PrototypeMovementRequestDraftInput = {
    movementIntent: prototypeMovementIntentForRecord(record),
    requestReason: record.movementRequest.requestReason,
    targetLane: record.movementRequest.targetLane,
    targetOwner: record.movementRequest.targetOwner,
  },
): PrototypeRecord {
  if (
    record.lifecycle === "retired" ||
    record.lifecycle === "graduated" ||
    record.baseline.state !== "ready-for-movement" ||
    !draft.requestReason.trim() ||
    !draft.targetLane.trim() ||
    !draft.targetOwner.trim() ||
    !prototypeMovementIntentValid(draft.movementIntent) ||
    (record.movementRequest.state === "returned" &&
      draft.requestReason.trim() ===
        record.movementRequest.requestReason.trim()) ||
    record.movementRequest.gateSnapshot.some((gate) =>
      ["blocked", "stale"].includes(gate.status),
    )
  ) {
    return record;
  }

  const nextMove: PrototypeCurrentMove = {
    actionLabel: "View History",
    detail:
      "Movement request draft was recorded locally. Movement Control still owns queueing, decision, outcome, and receipt.",
    id: "history",
    label: "Review movement request receipt",
    tone: "info",
  };

  return {
    ...record,
    currentMove: nextMove,
    lastMovementReceiptRef: receiptRef,
    movementRequest: {
      ...record.movementRequest,
      lastMovementReceiptRef: receiptRef,
      movementType: prototypeMovementTypeForIntent(
        draft.movementIntent,
        record,
      ),
      requestReason: draft.requestReason,
      state: "request-recorded",
      targetLane: draft.targetLane,
      targetOwner: draft.targetOwner,
    },
    projectionFreshness: "prototype-local movement request recorded",
    projectionVersion: appendPrototypeProjectionVersion(
      record.projectionVersion,
      "movement-request",
    ),
  };
}

export function prototypeMovementIntentValid(
  intent: unknown,
): intent is PrototypeMovementIntentId {
  return prototypeMovementIntentIds.some((candidate) => candidate === intent);
}

export function prototypeMovementIntentForRecord(
  record: PrototypeRecord,
): PrototypeMovementIntentId {
  if (record.movementRequest.state === "returned") {
    return "returned-correction";
  }

  switch (record.movementRequest.movementType) {
    case "retire":
    case "suspend":
      return "impacted-closeout";
    case "accepted-risk":
    case "baseline":
    case "defer":
    case "graduation":
      return "governed-delivery";
  }
}

export function prototypeMovementReturnInstruction(
  record: PrototypeRecord,
): PrototypeMovementReturnInstruction | null {
  if (record.movementRequest.state !== "returned") {
    return null;
  }

  const returnGate = record.movementRequest.gateSnapshot.find(
    (gate) =>
      Boolean(gate.requiredFix) &&
      gate.status !== "ready" &&
      gate.status !== "not-required",
  );
  const receiptRef =
    record.movementRequest.lastMovementReceiptRef ??
    record.lastMovementReceiptRef;
  const receipt = receiptRef
    ? record.receipts.find((candidate) => candidate.id === receiptRef)
    : null;

  return {
    authority: returnGate?.authority ?? "Movement Control",
    owner: returnGate?.owner ?? record.movementRequest.targetOwner,
    recordedAt: receipt?.recordedAt ?? null,
    receiptRef,
    requiredFix:
      returnGate?.requiredFix ??
      "Review the retained Movement return evidence before resubmission.",
  };
}

export function prototypeMovementIntentLabel(
  intent: PrototypeMovementIntentId,
) {
  switch (intent) {
    case "governed-delivery":
      return "Governed Delivery Request";
    case "impacted-closeout":
      return "Impacted Closeout Request";
    case "returned-correction":
      return "Returned Movement Correction";
  }
}

export function prototypeMovementIntentTarget(
  intent: PrototypeMovementIntentId,
  record?: PrototypeRecord,
) {
  if (record && prototypeMovementIntentForRecord(record) === intent) {
    const defaultTarget = movementIntentDefaultTarget(intent);

    return {
      targetLane: record.movementRequest.targetLane || defaultTarget.targetLane,
      targetOwner:
        record.movementRequest.targetOwner || defaultTarget.targetOwner,
    };
  }

  return movementIntentDefaultTarget(intent);
}

function appendPrototypeProjectionVersion(version: string, suffix: string) {
  return version.includes(`+${suffix}`) ? version : `${version}+${suffix}`;
}

function prototypeMovementTypeForIntent(
  intent: PrototypeMovementIntentId,
  record: PrototypeRecord,
): PrototypeMovementRequestDraft["movementType"] {
  switch (intent) {
    case "governed-delivery":
      return record.movementRequest.movementType === "graduation"
        ? "graduation"
        : "baseline";
    case "impacted-closeout":
      return record.movementRequest.movementType === "suspend"
        ? "suspend"
        : "retire";
    case "returned-correction":
      return record.movementRequest.movementType;
  }
}

function movementIntentDefaultTarget(intent: PrototypeMovementIntentId) {
  switch (intent) {
    case "governed-delivery":
      return {
        targetLane: "baseline movement",
        targetOwner: "Movement reviewer",
      };
    case "impacted-closeout":
      return {
        targetLane: "impacted closeout",
        targetOwner: "Movement reviewer",
      };
    case "returned-correction":
      return {
        targetLane: "movement correction",
        targetOwner: "Movement reviewer",
      };
  }
}

function prototypeMovementGateTone(record: PrototypeRecord): OperationTone {
  if (
    record.movementRequest.gateSnapshot.some((gate) =>
      ["blocked", "stale"].includes(gate.status),
    )
  ) {
    return "danger";
  }

  if (
    record.movementRequest.gateSnapshot.some((gate) =>
      ["missing", "review", "waived"].includes(gate.status),
    )
  ) {
    return "warn";
  }

  return "ok";
}

function prototypeMovementRequestTone(record: PrototypeRecord): OperationTone {
  return prototypeMovementRequestStateTone(record.movementRequest.state);
}

export function prototypeMovementRequestHasRecordedOutput(
  record: PrototypeRecord,
) {
  return (
    record.movementRequest.state === "request-recorded" ||
    record.movementRequest.state === "receipt-projected"
  );
}
