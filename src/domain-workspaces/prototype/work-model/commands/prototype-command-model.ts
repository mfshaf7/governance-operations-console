import type { OperationTone } from "../../../operation-contracts/operation-state.ts";

import type { PrototypeRecord } from "../../domain/prototype-types.ts";
import {
  prototypePreviewCheckDisabledReason,
  prototypePreviewRuntimeCommandDisabledReason,
} from "../preview-runtime/prototype-preview-state-model.ts";

export type PrototypeCommandId =
  | "capture-prototype-request"
  | "record-baseline-promotion"
  | "land-prototype-request"
  | "prepare-movement-request"
  | "record-closeout-retirement"
  | "record-candidate-promotion"
  | "confirm-preview-profile"
  | "refresh-preview-proof"
  | "restart-preview"
  | "save-preview-profile"
  | "start-preview"
  | "stop-preview";

export type PrototypeCommandView = {
  authority: "prototype-local" | "read-only";
  disabledReason: string | null;
  id: PrototypeCommandId;
  label: string;
  receiptSummary: string;
  tone: OperationTone;
};

export function getPrototypeCommandView(
  record: PrototypeRecord,
  commandId: PrototypeCommandId,
): PrototypeCommandView {
  const base = prototypeCommandBase(commandId);

  return {
    ...base,
    disabledReason: prototypeCommandDisabledReason(record, commandId),
  };
}

export function prototypeCommandDisabledReason(
  record: PrototypeRecord,
  commandId: PrototypeCommandId,
) {
  if (record.lifecycle === "retired" || record.lifecycle === "graduated") {
    return "Terminal Prototype records are review-only unless reactivation is approved by the owning workflow.";
  }

  switch (commandId) {
    case "capture-prototype-request":
      return null;
    case "record-baseline-promotion":
      if (
        record.landing.state !== "landed" ||
        !record.landing.lastLandingReceiptRef
      ) {
        return "Prototype landing must be recorded before Baseline Promotion.";
      }

      if (
        record.candidate.state !== "candidate" ||
        record.candidate.decision !== "promote-candidate" ||
        !record.candidate.lastReceiptRef
      ) {
        return "Candidate Promotion must be recorded before Baseline Promotion.";
      }

      if (record.baseline.state === "receipt-projected") {
        return "Baseline Promotion already has a recorded receipt.";
      }

      if (
        record.baseline.lastPacketReceiptRef &&
        record.baseline.state === "ready-for-movement"
      ) {
        return "Baseline Promotion is already recorded for this local session.";
      }

      return null;
    case "land-prototype-request":
      if (record.landing.state === "landed") {
        return "Prototype landing is already recorded for this source record.";
      }

      return null;
    case "record-candidate-promotion":
      if (
        record.landing.state !== "landed" ||
        !record.landing.lastLandingReceiptRef
      ) {
        return "Prototype landing must be recorded before Candidate Promotion.";
      }

      return null;
    case "confirm-preview-profile":
      if (record.preview.profileState === "no-profile") {
        return "Save the preview profile draft before confirmation.";
      }

      return null;
    case "prepare-movement-request":
      if (record.baseline.state !== "ready-for-movement") {
        return "Baseline Promotion must be ready before Prototype can prepare a Movement request.";
      }

      if (
        record.movementRequest.lastMovementReceiptRef &&
        record.movementRequest.state !== "returned"
      ) {
        return "Movement request is already recorded for this local session.";
      }

      return null;
    case "record-closeout-retirement":
      if (record.landing.state !== "landed") {
        return "Prototype landing must finish before closeout.";
      }

      return null;
    case "refresh-preview-proof":
      return prototypePreviewCheckDisabledReason(record);
    case "restart-preview":
      return prototypePreviewRuntimeCommandDisabledReason(record, commandId);
    case "save-preview-profile":
      return null;
    case "start-preview":
      return prototypePreviewRuntimeCommandDisabledReason(record, commandId);
    case "stop-preview":
      return prototypePreviewRuntimeCommandDisabledReason(record, commandId);
  }
}

function prototypeCommandBase(
  commandId: PrototypeCommandId,
): Omit<PrototypeCommandView, "disabledReason"> {
  switch (commandId) {
    case "capture-prototype-request":
      return {
        authority: "prototype-local",
        id: commandId,
        label: "Submit Prototype Request",
        receiptSummary: "Direct Prototype request captured locally.",
        tone: "info",
      };
    case "record-baseline-promotion":
      return {
        authority: "prototype-local",
        id: commandId,
        label: "Record Baseline Promotion",
        receiptSummary: "Local Baseline Promotion preparation recorded.",
        tone: "warn",
      };
    case "land-prototype-request":
      return {
        authority: "prototype-local",
        id: commandId,
        label: "Record Landing",
        receiptSummary:
          "Prototype landing recorded locally and routed to the first required move.",
        tone: "warn",
      };
    case "prepare-movement-request":
      return {
        authority: "prototype-local",
        id: commandId,
        label: "Prepare Movement Request",
        receiptSummary:
          "Movement request draft prepared for Movement Control review.",
        tone: "warn",
      };
    case "record-closeout-retirement":
      return {
        authority: "prototype-local",
        id: commandId,
        label: "Record Closeout Decision",
        receiptSummary:
          "Closeout decision recorded in the Prototype local session.",
        tone: "warn",
      };
    case "record-candidate-promotion":
      return {
        authority: "prototype-local",
        id: commandId,
        label: "Record Candidate Decision",
        receiptSummary: "Local Candidate Promotion decision saved for review.",
        tone: "info",
      };
    case "confirm-preview-profile":
      return {
        authority: "prototype-local",
        id: commandId,
        label: "Confirm Preview Profile",
        receiptSummary:
          "Local preview profile confirmed; runtime controls are available.",
        tone: "ok",
      };
    case "refresh-preview-proof":
      return {
        authority: "prototype-local",
        id: commandId,
        label: "Record Preview Check",
        receiptSummary:
          "Local preview check will be saved as Prototype evidence. Baseline Promotion can use the saved receipt.",
        tone: "warn",
      };
    case "restart-preview":
      return {
        authority: "prototype-local",
        id: commandId,
        label: "Restart Preview",
        receiptSummary:
          "Local preview restart recorded; a new check is required before evidence is ready.",
        tone: "warn",
      };
    case "save-preview-profile":
      return {
        authority: "prototype-local",
        id: commandId,
        label: "Save Preview Profile",
        receiptSummary:
          "Local preview profile draft saved and runtime proof marked stale.",
        tone: "warn",
      };
    case "start-preview":
      return {
        authority: "prototype-local",
        id: commandId,
        label: "Start Preview",
        receiptSummary:
          "Local preview start recorded; proof remains pending until a check is recorded.",
        tone: "ok",
      };
    case "stop-preview":
      return {
        authority: "prototype-local",
        id: commandId,
        label: "Stop Preview",
        receiptSummary:
          "Local preview stop recorded; previous proof remains in history.",
        tone: "danger",
      };
  }
}
