import type { DeliveryTone } from "../../../../read-model/index.ts";

import { workDesignContextDecisionCopy } from "./work-design-context-decision-model.ts";
import type {
  WorkDesignContextDecision,
  WorkDesignStep,
} from "../model/work-design-model.ts";

export type WorkDesignProgressStep = Exclude<WorkDesignStep, "history" | "hub">;

export const workDesignSteps: Array<{
  id: WorkDesignStep;
  label: string;
  summary: string;
}> = [
  { id: "context", label: "Context Session", summary: "ART + AI" },
  { id: "build", label: "Build Tree", summary: "draft" },
  { id: "review", label: "Review Draft", summary: "gate" },
  { id: "apply", label: "Apply Draft", summary: "Apply update" },
  { id: "history", label: "History", summary: "archive" },
];

export function workDesignProgressActiveStep(state: {
  activeStep: WorkDesignStep;
  applyReceiptRecorded: boolean;
  contextBriefAccepted: boolean;
  contextDecision: WorkDesignContextDecision;
  draftTreePresent: boolean;
  draftReviewAccepted: boolean;
  reviewReady: boolean;
  sourceWorkDesignClosed?: boolean;
  validateReady: boolean;
}): WorkDesignProgressStep {
  if (state.activeStep !== "hub" && state.activeStep !== "history") {
    return state.activeStep;
  }

  const sourceApplyComplete =
    Boolean(state.sourceWorkDesignClosed) &&
    state.contextDecision === "proceed";

  if (
    state.applyReceiptRecorded ||
    sourceApplyComplete ||
    state.validateReady
  ) {
    return "apply";
  }

  if (state.draftReviewAccepted || state.reviewReady) {
    return "review";
  }

  if (
    state.draftTreePresent ||
    (state.contextBriefAccepted && state.contextDecision === "proceed")
  ) {
    return "build";
  }

  return "context";
}

export function workDesignStepStatusLabel(
  step: WorkDesignStep,
  state: {
    applyReceiptRecorded: boolean;
    contextBriefAccepted: boolean;
    contextDecision: WorkDesignContextDecision;
    draftTreePresent: boolean;
    reviewReady: boolean;
    draftReviewAccepted: boolean;
    draftValidationAccepted: boolean;
    sourceWorkDesignClosed?: boolean;
  },
) {
  const sourceTerminalComplete =
    Boolean(state.sourceWorkDesignClosed) &&
    state.contextDecision !== "proceed";
  const applyComplete =
    state.applyReceiptRecorded ||
    (Boolean(state.sourceWorkDesignClosed) &&
      state.contextDecision === "proceed");

  switch (step) {
    case "apply":
      if (sourceTerminalComplete) {
        return "not required";
      }
      if (state.applyReceiptRecorded) {
        return "preview receipt captured";
      }
      if (applyComplete) {
        return "source done";
      }
      return state.draftReviewAccepted ? "ready to apply" : "locked by review";
    case "build":
      if (sourceTerminalComplete) {
        return "not created";
      }
      if (applyComplete) {
        return "draft tree applied";
      }
      if (!state.contextBriefAccepted || state.contextDecision !== "proceed") {
        return "locked by context";
      }
      return state.reviewReady
        ? "draft tree attached"
        : state.draftTreePresent
          ? "inspect draft tree"
          : "draft tree needed";
    case "context":
      if (sourceTerminalComplete) {
        return "decision recorded";
      }
      if (applyComplete) {
        return "brief accepted";
      }
      return state.contextBriefAccepted ? "brief accepted" : "brief required";
    case "history":
      if (state.applyReceiptRecorded) {
        return "receipt archive";
      }
      if (applyComplete || state.sourceWorkDesignClosed) {
        return "decision archive";
      }
      return "archive route";
    case "hub":
      return "status route";
    case "review":
      if (sourceTerminalComplete) {
        return "not required";
      }
      if (applyComplete) {
        return "accepted";
      }
      if (!state.reviewReady) {
        return "waiting for draft";
      }
      return state.draftReviewAccepted ? "accepted" : "review required";
  }
}

export function workDesignStepTone(
  step: WorkDesignStep,
  state: {
    applyReceiptRecorded: boolean;
    contextBriefAccepted: boolean;
    contextDecision: WorkDesignContextDecision;
    draftTreePresent: boolean;
    reviewReady: boolean;
    draftReviewAccepted: boolean;
    draftValidationAccepted: boolean;
    sourceWorkDesignClosed?: boolean;
  },
): DeliveryTone {
  const sourceTerminalComplete =
    Boolean(state.sourceWorkDesignClosed) &&
    state.contextDecision !== "proceed";
  const applyComplete =
    state.applyReceiptRecorded ||
    (Boolean(state.sourceWorkDesignClosed) &&
      state.contextDecision === "proceed");

  switch (step) {
    case "apply":
      if (sourceTerminalComplete) {
        return "muted";
      }
      if (applyComplete) {
        return "ok";
      }
      return state.draftReviewAccepted ? "warn" : "muted";
    case "build":
      if (sourceTerminalComplete) {
        return "muted";
      }
      if (applyComplete) {
        return "ok";
      }
      if (!state.contextBriefAccepted || state.contextDecision !== "proceed") {
        return "muted";
      }
      return state.reviewReady ? "ok" : "warn";
    case "context":
      if (sourceTerminalComplete) {
        return "muted";
      }
      if (applyComplete) {
        return "ok";
      }
      if (!state.contextBriefAccepted) {
        return "warn";
      }
      return state.contextDecision === "proceed"
        ? "ok"
        : workDesignContextDecisionCopy(state.contextDecision).tone;
    case "history":
      return "info";
    case "hub":
      return "info";
    case "review":
      if (sourceTerminalComplete) {
        return "muted";
      }
      if (applyComplete) {
        return "ok";
      }
      if (state.draftReviewAccepted) {
        return "ok";
      }
      return state.reviewReady ? "warn" : "muted";
  }
}
