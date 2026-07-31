import type {
  DeliveryRefinementApplyReceipt,
  DeliveryTone,
} from "../../../../read-model/index.ts";

import type { RefinementMetadataWorkbenchSummary } from "./refinement-metadata-model.ts";
import type { RefinementHubAction } from "./refinement-hub-model.ts";
import type { DeliveryRefinementModalStep } from "../model/refinement-model.ts";

export function refinementCurrentMove({
  activeReceipt,
  activeStep,
  hubAction,
  metadataWorkbenchSummary,
  refinementBlocked,
}: {
  activeReceipt: DeliveryRefinementApplyReceipt | null;
  activeStep: DeliveryRefinementModalStep;
  hubAction: RefinementHubAction | null;
  metadataWorkbenchSummary: RefinementMetadataWorkbenchSummary;
  refinementBlocked: boolean;
}): {
  description: string;
  title: string;
  tone: DeliveryTone;
} {
  if (refinementBlocked) {
    return {
      description:
        hubAction?.description ??
        "Normal Refinement steps stay locked until Blocker Recovery records a disposition.",
      title: hubAction?.title ?? "Blocker Route Required",
      tone: "danger",
    };
  }

  if (activeStep === "metadata_draft") {
    return {
      description: metadataWorkbenchSummary.ready
        ? "Metadata decisions are recorded for this packet. Continue to readiness review before apply."
        : "Repair or intentionally accept each selected ART item's backend-safe metadata before readiness review.",
      title: metadataWorkbenchSummary.title,
      tone: metadataWorkbenchSummary.tone,
    };
  }

  if (activeStep === "receipt") {
    return {
      description: activeReceipt
        ? "Inspect immutable apply evidence. This route does not advance the active workflow."
        : "Inspect the read-only receipt archive. Apply Refinement must complete before immutable evidence appears.",
      title: activeReceipt ? "Receipt Recorded" : "Receipt History",
      tone: "info",
    };
  }

  if (activeStep === "readiness_review" && metadataWorkbenchSummary.ready) {
    return {
      description:
        "Review AI-drafted, repaired, warning, and passed gates before opening the apply plan.",
      title: "Review Draft-Ready Metadata",
      tone: "warn",
    };
  }

  return {
    description:
      hubAction?.description ?? refinementContentDescription(activeStep),
    title: hubAction?.title ?? refinementContentTitle(activeStep),
    tone: hubAction?.tone ?? "warn",
  };
}

function refinementContentTitle(step: DeliveryRefinementModalStep) {
  switch (step) {
    case "hub":
      return "Current Required Move";
    case "apply_refinement":
      return "OOS Apply Plan";
    case "metadata_draft":
      return "Backend-Safe Metadata Workbench";
    case "readiness_review":
      return "Gate Findings";
    case "receipt":
      return "Apply Receipt";
  }
}

function refinementContentDescription(step: DeliveryRefinementModalStep) {
  switch (step) {
    case "hub":
      return "Confirm package posture, current status, next required move, and archive access before opening a step.";
    case "apply_refinement":
      return "Review which bounded OOS planning routes and item-scoped metadata changes will run. This does not start execution work.";
    case "metadata_draft":
      return "Repair or intentionally accept backend-safe fields by target record before readiness review.";
    case "readiness_review":
      return "Review missing, blocked, stale, warning, and passed gates before apply.";
    case "receipt":
      return "Inspect immutable apply evidence after Refinement completes.";
  }
}
