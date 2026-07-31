import type { TerasTone } from "@/teras";

import type { PrototypeCommandView } from "../../../work-model/commands/prototype-command-model.ts";
import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import {
  type PrototypeMovementIntentId,
  type PrototypeMovementRequestDraftInput,
  prototypeMovementIntentForRecord,
  prototypeMovementIntentLabel,
  prototypeMovementIntentTarget,
  prototypeMovementReturnInstruction,
} from "../../../work-model/workflows/movement-request/prototype-movement-request-model.ts";
import {
  prototypeDataModeLabel,
  prototypeMutationBoundaryLabel,
  prototypeVisibilityLabel,
} from "../../shared/prototype-record-display-model.ts";

export type PrototypeMovementRequestLocalDraft =
  PrototypeMovementRequestDraftInput;

export type PrototypeMovementChecklistRow = {
  detail: string;
  id: string;
  label: string;
  status: string;
  tone: TerasTone;
};

export type PrototypeMovementStatusProjection = {
  description?: string;
  label: string;
  tone: TerasTone;
};

export function movementRequestDraftFromRecord(
  record: PrototypeRecord | null,
): PrototypeMovementRequestLocalDraft {
  return {
    movementIntent: record
      ? prototypeMovementIntentForRecord(record)
      : "governed-delivery",
    requestReason: record?.movementRequest.requestReason ?? "",
    targetLane: record
      ? prototypeMovementIntentTarget(
          prototypeMovementIntentForRecord(record),
          record,
        ).targetLane
      : prototypeMovementIntentTarget("governed-delivery").targetLane,
    targetOwner: record
      ? prototypeMovementIntentTarget(
          prototypeMovementIntentForRecord(record),
          record,
        ).targetOwner
      : prototypeMovementIntentTarget("governed-delivery").targetOwner,
  };
}

export function movementRequestDraftComplete(
  draft: PrototypeMovementRequestLocalDraft,
) {
  return Boolean(
    draft.requestReason.trim() &&
    draft.movementIntent &&
    draft.targetLane.trim() &&
    draft.targetOwner.trim(),
  );
}

export function movementRequestDraftDirty(
  draft: PrototypeMovementRequestLocalDraft,
  sourceDraft: PrototypeMovementRequestLocalDraft,
) {
  return (
    draft.movementIntent !== sourceDraft.movementIntent ||
    draft.requestReason !== sourceDraft.requestReason ||
    draft.targetLane !== sourceDraft.targetLane ||
    draft.targetOwner !== sourceDraft.targetOwner
  );
}

export function movementRequestCorrectionApplied(
  draft: PrototypeMovementRequestLocalDraft,
  record: PrototypeRecord,
) {
  return (
    record.movementRequest.state !== "returned" ||
    draft.requestReason.trim() !== record.movementRequest.requestReason.trim()
  );
}

export function movementRequestDraftStatus({
  correctionApplied,
  correctionRequired,
  draftComplete,
}: {
  correctionApplied: boolean;
  correctionRequired: boolean;
  draftComplete: boolean;
}): PrototypeMovementStatusProjection {
  return {
    label:
      correctionRequired && !correctionApplied
        ? "Correction needed"
        : draftComplete
          ? "Draft ready"
          : "Needs fields",
    tone: draftComplete && correctionApplied ? "ok" : "warn",
  };
}

export function movementRequestReviewStatus({
  gateBlocked,
  requestReady,
}: {
  gateBlocked: boolean;
  requestReady: boolean;
}): PrototypeMovementStatusProjection {
  return {
    label: requestReady ? "Ready" : "Needs review",
    tone: requestReady ? "ok" : gateBlocked ? "danger" : "warn",
  };
}

export function movementRequestAuthorityStatus(
  command: PrototypeCommandView,
): PrototypeMovementStatusProjection {
  return {
    label: "Prototype local",
    tone: command.disabledReason ? "warn" : "info",
  };
}

export function movementRequestIntentStatus(
  record: PrototypeRecord,
): PrototypeMovementStatusProjection {
  return {
    label: "Intent",
    tone: record.movementRequest.movementType ? "ok" : "warn",
  };
}

export function movementRequestPacketStatus({
  actionLabel,
  command,
  correctionRequired,
  requestReady,
}: {
  actionLabel: string;
  command: PrototypeCommandView;
  correctionRequired: boolean;
  requestReady: boolean;
}): PrototypeMovementStatusProjection {
  return {
    label: requestReady
      ? actionLabel
      : correctionRequired
        ? "Correction needed"
        : "Needs fields",
    tone: requestReady ? command.tone : "warn",
  };
}

export function movementRequestGateStatus({
  gateBlocked,
  gatesClear,
}: {
  gateBlocked: boolean;
  gatesClear: boolean;
}) {
  return {
    status: gateBlocked ? "blocked" : gatesClear ? "clear" : "review",
  };
}

export function movementIntentChecklistRows(
  draft: PrototypeMovementRequestLocalDraft,
  record: PrototypeRecord,
): PrototypeMovementChecklistRow[] {
  const correctionApplied = movementRequestCorrectionApplied(draft, record);

  return [
    {
      detail: prototypeMovementIntentLabel(draft.movementIntent),
      id: "movement-intent",
      label: "Intent",
      status: "selected",
      tone: "ok",
    },
    {
      detail: draft.requestReason.trim() || "Request reason required.",
      id: "movement-reason",
      label: "Reason",
      status: !draft.requestReason.trim()
        ? "needed"
        : correctionApplied
          ? "ready"
          : "correct",
      tone: draft.requestReason.trim() && correctionApplied ? "ok" : "warn",
    },
  ];
}

export function movementReviewChecklistRows(
  draft: PrototypeMovementRequestLocalDraft,
  record: PrototypeRecord,
  gateState: { gateBlocked: boolean; gatesClear: boolean },
): PrototypeMovementChecklistRow[] {
  return [
    {
      detail:
        record.baseline.lastPacketReceiptRef ??
        "Baseline receipt required before movement preparation.",
      id: "movement-baseline",
      label: "Baseline",
      status:
        record.baseline.state === "ready-for-movement" ? "ready" : "locked",
      tone: record.baseline.state === "ready-for-movement" ? "ok" : "warn",
    },
    {
      detail: draft.requestReason.trim() || "Request reason required.",
      id: "movement-request",
      label: "Request",
      status: movementRequestDraftComplete(draft) ? "ready" : "needed",
      tone: movementRequestDraftComplete(draft) ? "ok" : "warn",
    },
    {
      detail: gateState.gateBlocked
        ? "A blocking or stale gate must be resolved."
        : gateState.gatesClear
          ? "Gate snapshot is clear."
          : "Gate snapshot needs Movement Control review.",
      id: "movement-gates",
      label: "Gates",
      status: movementRequestGateStatus(gateState).status,
      tone: gateState.gateBlocked
        ? "danger"
        : gateState.gatesClear
          ? "ok"
          : "warn",
    },
  ];
}

export function movementRequestPacketRows(
  draft: PrototypeMovementRequestLocalDraft,
  record: PrototypeRecord,
): PrototypeMovementChecklistRow[] {
  const movementTarget = prototypeMovementIntentTarget(
    draft.movementIntent,
    record,
  );
  const correctionApplied = movementRequestCorrectionApplied(draft, record);

  return [
    {
      detail: prototypeMovementIntentLabel(draft.movementIntent),
      id: "movement-packet-intent",
      label: "Intent",
      status: "selected",
      tone: "info",
    },
    {
      detail: `${record.id} / ${record.sourcePath}`,
      id: "movement-packet-source",
      label: "Source",
      status: "packet",
      tone: "info",
    },
    {
      detail:
        record.baseline.lastPacketReceiptRef ?? "Baseline receipt missing.",
      id: "movement-packet-baseline",
      label: "Baseline",
      status:
        record.baseline.state === "ready-for-movement" ? "ready" : "locked",
      tone: record.baseline.state === "ready-for-movement" ? "ok" : "warn",
    },
    {
      detail: `${prototypeVisibilityLabel(record.visibilityTier)} / ${prototypeDataModeLabel(record.dataMode)} / ${prototypeMutationBoundaryLabel(record.mutationBoundary)}`,
      id: "movement-packet-boundary",
      label: "Boundary",
      status: "packet",
      tone:
        record.dataMode === "real-mutable" ||
        record.mutationBoundary === "real-system"
          ? "danger"
          : "info",
    },
    {
      detail: `${movementTarget.targetLane} / ${movementTarget.targetOwner}`,
      id: "movement-packet-target",
      label: "Target",
      status: "generated",
      tone: "info",
    },
    {
      detail: draft.requestReason || "Request reason required.",
      id: "movement-packet-reason",
      label: "Reason",
      status: !draft.requestReason.trim()
        ? "needed"
        : correctionApplied
          ? "ready"
          : "correct",
      tone: draft.requestReason.trim() && correctionApplied ? "ok" : "warn",
    },
  ];
}

export function movementGateChecklistRows(record: PrototypeRecord) {
  return record.movementRequest.gateSnapshot.map((gate) => ({
    detail: `${gate.authority} / ${gate.owner}: ${gate.requiredFix ?? gate.summary}`,
    id: gate.gateId,
    label: gate.gateKind,
    status: gate.status,
    tone: gate.tone,
  }));
}

export function movementReturnInstructionProjection(record: PrototypeRecord) {
  const instruction = prototypeMovementReturnInstruction(record);

  if (!instruction) {
    return null;
  }

  return {
    description: `${instruction.authority} returned the previous request for correction.`,
    rows: [
      {
        detail: `${instruction.authority} / ${instruction.owner}`,
        id: "movement-return-authority",
        label: "Returned by",
        status: "external",
        tone: "warn" as const,
      },
      {
        detail: instruction.recordedAt
          ? `${instruction.receiptRef ?? "Movement return receipt"} / ${instruction.recordedAt}`
          : (instruction.receiptRef ?? "Movement return receipt unavailable."),
        id: "movement-return-receipt",
        label: "Return receipt",
        status: "retained",
        tone: "info" as const,
      },
      {
        detail: instruction.requiredFix,
        id: "movement-return-required-fix",
        label: "Required correction",
        status: "required",
        tone: "warn" as const,
      },
    ] satisfies PrototypeMovementChecklistRow[],
  };
}

export function movementGateTone(record: PrototypeRecord): TerasTone {
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

export function movementIntentChoiceOptions(record: PrototypeRecord) {
  const currentIntent = prototypeMovementIntentForRecord(record);
  const disabledReason =
    "Current prototype posture does not match this Movement intent.";

  return [
    {
      disabled: currentIntent !== "governed-delivery",
      disabledReason:
        currentIntent === "governed-delivery" ? undefined : disabledReason,
      id: "governed-delivery",
      label: prototypeMovementIntentLabel("governed-delivery"),
      tone: "info",
    },
    {
      disabled: currentIntent !== "impacted-closeout",
      disabledReason:
        currentIntent === "impacted-closeout" ? undefined : disabledReason,
      id: "impacted-closeout",
      label: prototypeMovementIntentLabel("impacted-closeout"),
      tone: "warn",
    },
    {
      disabled: currentIntent !== "returned-correction",
      disabledReason:
        currentIntent === "returned-correction" ? undefined : disabledReason,
      id: "returned-correction",
      label: prototypeMovementIntentLabel("returned-correction"),
      tone: "warn",
    },
  ] satisfies Array<{
    disabled: boolean;
    disabledReason?: string;
    id: PrototypeMovementIntentId;
    label: string;
    tone: "info" | "warn";
  }>;
}
