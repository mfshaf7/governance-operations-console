import type {
  DeliveryRefinementApplyReceipt,
  DeliveryRefinementPacket,
  DeliveryRefinementStepId,
  DeliveryTone,
} from "../../../../read-model/index.ts";
import type { DeliveryRefinementModalStep } from "../model/refinement-model.ts";
import {
  refinementPacketStatusLabel,
  refinementPacketStatusTone,
} from "./refinement-packet-model.ts";

export function refinementSessionShellCopy(
  step: DeliveryRefinementModalStep,
  {
    receiptRecorded = false,
  }: {
    receiptRecorded?: boolean;
  } = {},
): {
  description: string;
  title: string;
} {
  switch (step) {
    case "apply_refinement":
      return {
        description:
          "Review the bounded OOS apply plan and submit the Refinement update.",
        title: "Apply Refinement",
      };
    case "metadata_draft":
      return {
        description:
          "Repair or accept backend-safe metadata from the applied Work Design handoff.",
        title: "Metadata Workbench",
      };
    case "readiness_review":
      return {
        description:
          "Review gates, drafted values, and package readiness before apply.",
        title: "Readiness Review",
      };
    case "receipt":
      return {
        description: receiptRecorded
          ? "Inspect the read-only Refinement apply receipt and event trail."
          : "Inspect the read-only Refinement history route before apply evidence exists.",
        title: receiptRecorded ? "Receipt History" : "Refinement History",
      };
    case "hub":
    default:
      return {
        description:
          "Inspect package status, next required move, progress, and archive access before opening a step.",
        title: "Refinement Hub",
      };
  }
}

export function refinementProgressPanelProjection({
  activeReceipt,
  activeStep,
  currentMove,
  packet,
  refinementBlocked,
}: {
  activeReceipt: DeliveryRefinementApplyReceipt | null;
  activeStep: DeliveryRefinementModalStep;
  currentMove: {
    description: string;
    title: string;
    tone: DeliveryTone;
  };
  packet: DeliveryRefinementPacket;
  progressActiveStep: DeliveryRefinementStepId;
  refinementBlocked: boolean;
}) {
  return {
    description: currentMove.description,
    kicker: activeStep === "receipt" ? "History" : "Current Required Move",
    statusLabel: refinementBlocked
      ? "blocked"
      : activeReceipt
        ? "receipt"
        : refinementPacketStatusLabel(packet),
    statusTone: refinementBlocked
      ? ("danger" as DeliveryTone)
      : activeReceipt
        ? ("ok" as DeliveryTone)
        : refinementPacketStatusTone(packet),
    title: currentMove.title,
    tone: refinementBlocked
      ? ("danger" as DeliveryTone)
      : ("info" as DeliveryTone),
  };
}
