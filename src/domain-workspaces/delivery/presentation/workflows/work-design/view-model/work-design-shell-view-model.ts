import type { DeliveryTone } from "../../../../read-model/index.ts";
import type {
  WorkDesignContextDecision,
  WorkDesignStep,
} from "../model/work-design-model.ts";
import type { WorkDesignCurrentMove } from "./work-design-current-move.ts";

export type WorkDesignFooterActionKind =
  | "accept-context-brief"
  | "open-apply-draft"
  | "open-read-only-history"
  | "open-receipt-history"
  | "open-review-draft"
  | "request-close"
  | "return-to-design-hub"
  | "return-to-register"
  | "run-apply-draft";

export type WorkDesignFooterActionProjection = {
  dataAction: string;
  disabled?: boolean;
  emphasis?: "primary" | "secondary";
  kind: WorkDesignFooterActionKind;
  label: string;
  tone?: DeliveryTone;
};

export function workDesignSessionShellCopy(
  step: WorkDesignStep,
  {
    terminalDecisionRecorded = false,
  }: {
    terminalDecisionRecorded?: boolean;
  } = {},
): {
  description: string;
  title: string;
} {
  switch (step) {
    case "apply":
      return {
        description: "Review the apply sequence, then approve the update.",
        title: "Apply Draft",
      };
    case "build":
      return {
        description:
          "Build the draft Epic tree with Feature, User story, and optional Risk nodes before review.",
        title: "Build Tree",
      };
    case "context":
      return {
        description:
          "Run the AI-assisted context session, inspect bounded ART/OOS sources, and decide whether this package should create a new draft tree.",
        title: "Context Session",
      };
    case "history":
      if (terminalDecisionRecorded) {
        return {
          description:
            "Inspect the read-only Work Design decision archive and event trail.",
          title: "Decision History",
        };
      }

      return {
        description:
          "Inspect the read-only Work Design receipt archive and event trail.",
        title: "Receipt History",
      };
    case "review":
      return {
        description:
          "Confirm the draft tree and optionally record a handoff note before Apply Draft.",
        title: "Review Draft",
      };
    case "hub":
    default:
      return {
        description:
          "Inspect package status, draft shape, and the next required step before continuing.",
        title: "Design Hub",
      };
  }
}

export function workDesignProgressPanelProjection({
  activeStep,
  applyReceiptRecorded,
  contextDecision,
  currentMove,
  sourceWorkDesignClosed,
  workDesignBlocked,
}: {
  activeStep: WorkDesignStep;
  applyReceiptRecorded: boolean;
  contextDecision: WorkDesignContextDecision;
  currentMove: WorkDesignCurrentMove;
  sourceWorkDesignClosed: boolean;
  workDesignBlocked: boolean;
}) {
  const sourceCompleteWithoutReceipt =
    sourceWorkDesignClosed && !applyReceiptRecorded;

  return {
    description: currentMove.description,
    kicker:
      activeStep === "history"
        ? sourceCompleteWithoutReceipt
          ? "Work Design History"
          : "Receipt Archive"
        : "Current Required Move",
    sourceTerminalComplete:
      sourceWorkDesignClosed && contextDecision !== "proceed",
    statusLabel:
      activeStep === "history"
        ? sourceCompleteWithoutReceipt
          ? "closed"
          : "archive"
        : undefined,
    statusTone: sourceCompleteWithoutReceipt
      ? ("ok" as DeliveryTone)
      : ("info" as DeliveryTone),
    title: currentMove.title,
    tone: workDesignBlocked
      ? ("danger" as DeliveryTone)
      : ("info" as DeliveryTone),
  };
}

export function workDesignSessionFooterProjection({
  activeStep,
  applyReceiptRecorded,
  applyReady,
  contextBriefReady,
  contextDecision,
  contextDecisionTone,
  reviewRouteReady,
  validateReady,
  workDesignClosed,
}: {
  activeStep: WorkDesignStep;
  applyReceiptRecorded: boolean;
  applyReady: boolean;
  contextBriefReady: boolean;
  contextDecision: WorkDesignContextDecision;
  contextDecisionTone: DeliveryTone;
  reviewRouteReady: boolean;
  validateReady: boolean;
  workDesignClosed: boolean;
}): {
  primaryAction: WorkDesignFooterActionProjection | null;
  returnAction: WorkDesignFooterActionProjection;
} {
  const returnAction: WorkDesignFooterActionProjection =
    activeStep === "hub"
      ? {
          dataAction: "return-to-register",
          emphasis: "secondary",
          kind: "return-to-register",
          label: "Back to Register",
        }
      : {
          dataAction: "return-to-design-hub",
          emphasis: "secondary",
          kind: "return-to-design-hub",
          label: "Back to Hub",
        };

  if (activeStep === "hub") {
    return {
      primaryAction: null,
      returnAction,
    };
  }

  if (workDesignClosed && activeStep !== "history") {
    return {
      primaryAction: {
        dataAction: "open-read-only-history",
        kind: "open-read-only-history",
        label: "View History",
        tone: "info",
      },
      returnAction,
    };
  }

  if (activeStep === "context") {
    return {
      primaryAction: {
        dataAction: "accept-context-brief",
        disabled: !contextBriefReady,
        kind: "accept-context-brief",
        label:
          contextDecision === "proceed"
            ? "Build From Brief"
            : "Record Decision",
        tone: contextBriefReady ? contextDecisionTone : "warn",
      },
      returnAction,
    };
  }

  if (activeStep === "build") {
    return {
      primaryAction: {
        dataAction: "open-review-draft",
        disabled: !reviewRouteReady,
        kind: "open-review-draft",
        label: "Review Draft",
        tone: reviewRouteReady ? "info" : "warn",
      },
      returnAction,
    };
  }

  if (activeStep === "review") {
    return {
      primaryAction: {
        dataAction: "open-apply-draft",
        disabled: !validateReady,
        kind: "open-apply-draft",
        label: "Apply Draft",
        tone: validateReady ? "ok" : "warn",
      },
      returnAction,
    };
  }

  if (activeStep === "apply" && !applyReceiptRecorded) {
    return {
      primaryAction: {
        dataAction: "run-apply-draft",
        disabled: !applyReady,
        kind: "run-apply-draft",
        label: "Apply Work Design",
        tone: "ok",
      },
      returnAction,
    };
  }

  if (activeStep === "apply") {
    return {
      primaryAction: {
        dataAction: "open-receipt-history",
        kind: "open-receipt-history",
        label: "View Receipt History",
        tone: "info",
      },
      returnAction,
    };
  }

  return {
    primaryAction: {
      dataAction: "return-to-register",
      kind: "request-close",
      label: "Back to Register",
      tone: "ok",
    },
    returnAction,
  };
}
