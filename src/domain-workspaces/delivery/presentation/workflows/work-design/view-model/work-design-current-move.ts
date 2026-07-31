import type { DeliveryTone } from "../../../../read-model/index.ts";

import type {
  WorkDesignBlockerDispositionReceipt,
  WorkDesignBlockerIssue,
  WorkDesignContextDecision,
  WorkDesignStep,
} from "../model/work-design-model.ts";
import type { WorkDesignBlockerDispositionCopy } from "./work-design-blocker-disposition-model.ts";
import type { WorkDesignContextDecisionCopy } from "./work-design-context-decision-model.ts";

export type WorkDesignCurrentMove = {
  description: string;
  label?: string;
  title: string;
  tone: DeliveryTone;
};

export function workDesignBlockedCurrentMove({
  activeBlockerIssue,
  blockerDispositionCopy,
  matchingBlockerDispositionReceipt,
}: {
  activeBlockerIssue: WorkDesignBlockerIssue | null;
  blockerDispositionCopy: WorkDesignBlockerDispositionCopy | null;
  matchingBlockerDispositionReceipt: WorkDesignBlockerDispositionReceipt | null;
}): WorkDesignCurrentMove {
  return {
    description:
      matchingBlockerDispositionReceipt && blockerDispositionCopy
        ? activeBlockerIssue?.source === "apply"
          ? `${blockerDispositionCopy.label} was recorded, and the failed Apply sequence remains blocked until the evidence is repaired or the decision changes.`
          : `${blockerDispositionCopy.label} was recorded, but this read-only package remains blocked until the OpenProject package changes or risk is accepted.`
        : (activeBlockerIssue?.summary ??
          "This package is blocked inside Work Design. Open Blocker Recovery from this hub before changing context, tree, review, or apply state."),
    label: "blocked",
    title:
      matchingBlockerDispositionReceipt && blockerDispositionCopy
        ? blockerDispositionCopy.title
        : (activeBlockerIssue?.title ?? "Work Design Blocked"),
    tone: "danger",
  };
}

export function workDesignCurrentMove({
  activeStep,
  applyReceiptRecorded,
  applyReady,
  blockedMove,
  contextBriefAccepted,
  contextDecision,
  contextDecisionCopy,
  draftTreePresent,
  draftReviewAccepted,
  reviewReady,
  sourceWorkDesignClosed,
  workDesignBlocked,
}: {
  activeStep: WorkDesignStep;
  applyReceiptRecorded: boolean;
  applyReady: boolean;
  blockedMove?: WorkDesignCurrentMove | null;
  contextBriefAccepted: boolean;
  contextDecision: WorkDesignContextDecision;
  contextDecisionCopy: WorkDesignContextDecisionCopy;
  draftTreePresent: boolean;
  draftReviewAccepted: boolean;
  reviewReady: boolean;
  sourceWorkDesignClosed: boolean;
  workDesignBlocked: boolean;
}): WorkDesignCurrentMove {
  if (workDesignBlocked && blockedMove) {
    return blockedMove;
  }

  const sourceCompleteWithoutReceipt =
    sourceWorkDesignClosed && !applyReceiptRecorded;
  const sourceTerminalDecision =
    sourceWorkDesignClosed && contextDecision !== "proceed";

  if (sourceCompleteWithoutReceipt && sourceTerminalDecision) {
    return {
      description:
        "Inspect the read-only decision archive, event trail, and carried context evidence. This route does not advance the workflow.",
      label: "terminal",
      title: "Terminal Decision Recorded",
      tone: "info",
    };
  }

  if (activeStep === "history") {
    return {
      description:
        "Inspect the read-only receipt archive, event trail, and handoff artifacts. This route does not advance the workflow.",
      label: "archive",
      title: "Receipt History",
      tone: "info",
    };
  }

  if (applyReceiptRecorded) {
    return {
      description:
        "The mock Work Design receipt is captured. Refinement can consume the finalized draft reference next.",
      label: "receipt",
      title: "Work Design Applied",
      tone: "ok",
    };
  }

  if (sourceWorkDesignClosed && contextDecision === "proceed") {
    return {
      description: "The source read model marks this Work Design pass Done.",
      label: "done",
      title: "Work Design Complete",
      tone: "ok",
    };
  }

  if (activeStep === "context") {
    return {
      description: contextBriefAccepted
        ? contextDecisionCopy.historyDescription
        : "Inspect bounded ART/OOS context and record the operator decision before tree building.",
      label: contextBriefAccepted ? "accepted" : "context",
      title: contextBriefAccepted
        ? contextDecisionCopy.historyTitle
        : "Context Session Required",
      tone: contextBriefAccepted ? contextDecisionCopy.tone : "warn",
    };
  }

  if (!contextBriefAccepted) {
    return {
      description:
        "Run the AI-assisted context session before Work Design creates or changes the draft tree.",
      label: "context",
      title: "Context Brief Required",
      tone: "warn",
    };
  }

  if (contextDecision !== "proceed") {
    return {
      description: contextDecisionCopy.historyDescription,
      label: contextDecisionCopy.label,
      title: contextDecisionCopy.historyTitle,
      tone: contextDecisionCopy.tone,
    };
  }

  if (activeStep === "build") {
    return {
      description: draftReviewAccepted
        ? "The draft tree has operator review acceptance. Build Tree is available for read-back inspection."
        : reviewReady
          ? "The tree has the minimum draft shape. Continue editing or move it into operator review."
          : draftTreePresent
            ? "Inspect the draft tree before review."
            : "Build the draft tree before review.",
      label: draftReviewAccepted
        ? "reviewed"
        : reviewReady
          ? "inspect draft"
          : "drafting",
      title: "Build Tree Draft",
      tone: draftReviewAccepted ? "ok" : reviewReady ? "info" : "warn",
    };
  }

  if (activeStep === "review") {
    return {
      description: draftReviewAccepted
        ? "The draft has operator review acceptance and can move into Apply Draft."
        : "Confirm the tree before Apply Draft can treat this as the accepted draft. A handoff note is optional.",
      label: draftReviewAccepted ? "reviewed" : "review",
      title: "Review Draft",
      tone: draftReviewAccepted ? "ok" : "warn",
    };
  }

  if (activeStep === "apply") {
    return {
      description: applyReady
        ? "Approve the update. Validation, backend update, snapshot attach, and receipt return run in the same apply sequence."
        : "Resolve the review and apply inputs before the work-design update can start.",
      label: "apply",
      title: applyReady ? "Apply Work Design" : "Apply Locked",
      tone: "warn",
    };
  }

  if (!reviewReady) {
    return {
      description: draftTreePresent
        ? "Inspect the draft tree before review."
        : "Build the draft tree before review.",
      label: "drafting",
      title: "Build Tree Draft",
      tone: "warn",
    };
  }

  if (!draftReviewAccepted) {
    return {
      description:
        "Operator review is required before Apply Draft can validate the accepted draft.",
      label: "review",
      title: "Review Draft",
      tone: "warn",
    };
  }

  if (applyReady) {
    return {
      description: "The draft is reviewed and ready for apply.",
      label: "apply",
      title: "Apply Work Design",
      tone: "ok",
    };
  }

  return {
    description: "Continue the current Work Design step.",
    label: activeStep,
    title: "Continue Work Design",
    tone: "info",
  };
}
