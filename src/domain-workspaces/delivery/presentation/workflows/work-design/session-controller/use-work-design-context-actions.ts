"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import {
  workDesignMockContextAdvisorAdapter,
  type WorkDesignAdvisorTranscriptLine,
} from "../view-model/work-design-context-advisor-view-model.ts";
import type {
  WorkDesignContextDecision,
  WorkDesignStep,
} from "../model/work-design-model.ts";

type UseWorkDesignContextActionsParams = {
  contextAdvisorPrompt: string;
  contextBriefReadOnly: boolean;
  contextBriefReady: boolean;
  contextDecision: WorkDesignContextDecision;
  contextOperatorNote: string;
  deliveryPackage: DeliveryPackageSummary;
  requestContextAdvice: (
    request: Parameters<typeof workDesignMockContextAdvisorAdapter>[0],
  ) => Promise<ReturnType<typeof workDesignMockContextAdvisorAdapter>>;
  setActiveStep: Dispatch<SetStateAction<WorkDesignStep>>;
  setApplyReceiptRecorded: Dispatch<SetStateAction<boolean>>;
  setApplyRunStartedAt: Dispatch<SetStateAction<string | null>>;
  setContextAdvisorPrompt: Dispatch<SetStateAction<string>>;
  setContextAdvisorTurns: Dispatch<
    SetStateAction<WorkDesignAdvisorTranscriptLine[]>
  >;
  setContextBriefAccepted: Dispatch<SetStateAction<boolean>>;
  setContextDecision: Dispatch<SetStateAction<WorkDesignContextDecision>>;
  setHasUnsavedSessionChanges: Dispatch<SetStateAction<boolean>>;
  setDraftReviewAccepted: Dispatch<SetStateAction<boolean>>;
  setTreeReconciliationDialogOpen: Dispatch<SetStateAction<boolean>>;
  setDraftValidationAccepted: Dispatch<SetStateAction<boolean>>;
  treeDraftStale: boolean;
};

export function useWorkDesignContextActions({
  contextAdvisorPrompt,
  contextBriefReadOnly,
  contextBriefReady,
  contextDecision,
  contextOperatorNote,
  deliveryPackage,
  requestContextAdvice,
  setActiveStep,
  setApplyReceiptRecorded,
  setApplyRunStartedAt,
  setContextAdvisorPrompt,
  setContextAdvisorTurns,
  setContextBriefAccepted,
  setContextDecision,
  setHasUnsavedSessionChanges,
  setDraftReviewAccepted,
  setTreeReconciliationDialogOpen,
  setDraftValidationAccepted,
  treeDraftStale,
}: UseWorkDesignContextActionsParams) {
  function updateContextDecision(decision: WorkDesignContextDecision) {
    if (contextBriefReadOnly) {
      return;
    }

    setContextDecision(decision);
    setContextBriefAccepted(false);
    setHasUnsavedSessionChanges(true);
    setApplyReceiptRecorded(false);
    setApplyRunStartedAt(null);
    setDraftValidationAccepted(false);
    setDraftReviewAccepted(false);
  }

  async function submitContextAdvisorPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (contextBriefReadOnly) {
      return;
    }

    const prompt = contextAdvisorPrompt.trim();

    if (!prompt) {
      return;
    }

    const turnId = Date.now();
    setContextAdvisorPrompt("");
    setContextAdvisorTurns((current) => [
      ...current,
      {
        id: `operator-context-${turnId}`,
        role: "operator",
        text: prompt,
      },
    ]);
    try {
      const response = await requestContextAdvice({
        advisor_mode: "context_session",
        allowed_response_types: ["text"],
        context_decision: contextDecision,
        context_note: contextOperatorNote,
        operator_prompt: prompt,
        package_ref: deliveryPackage.delivery_package_id,
        request_id: `context-session-${turnId}`,
        source_ref: deliveryPackage.source_ref,
      });
      setContextAdvisorTurns((current) => [
        ...current,
        {
          id: response.response_id,
          role: "advisor",
          text: response.text,
        },
      ]);
    } catch (error) {
      setContextAdvisorTurns((current) => [
        ...current,
        {
          id: `advisor-context-error-${turnId}`,
          role: "advisor",
          text:
            error instanceof Error
              ? `Governed advisor unavailable: ${error.message}`
              : "Governed advisor unavailable.",
        },
      ]);
    }
  }

  function acceptContextBrief() {
    if (!contextBriefReady) {
      return;
    }

    setContextBriefAccepted(true);
    setDraftValidationAccepted(false);
    setDraftReviewAccepted(false);
    setApplyReceiptRecorded(false);
    setApplyRunStartedAt(null);

    if (contextDecision === "proceed") {
      if (treeDraftStale) {
        setTreeReconciliationDialogOpen(true);
        return;
      }

      setHasUnsavedSessionChanges(true);
      setActiveStep("build");
      return;
    }

    setHasUnsavedSessionChanges(false);
    setActiveStep("history");
  }

  return {
    acceptContextBrief,
    submitContextAdvisorPrompt,
    updateContextDecision,
  };
}
