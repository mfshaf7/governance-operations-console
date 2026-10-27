"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useDraftAdvisor } from "@/agent-console";
import type { AdvisorTransport, AdvisorEdit } from "@/agent-console/model/advisor-drafts";
import { applyContextBoardAdvisorPatch, type ContextBoardSnapshot } from "@/product-apps/context-board";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import {
  type WorkDesignAdvisorTranscriptLine,
} from "../view-model/work-design-context-advisor-view-model.ts";
import type {
  WorkDesignContextDecision,
  WorkDesignStep,
} from "../model/work-design-model.ts";

type UseWorkDesignContextActionsParams = {
  active: boolean;
  coreNodes: Array<{ id: string; label: string; detail: string }>;
  sources: unknown;
  contextAdvisorPrompt: string;
  contextBriefReadOnly: boolean;
  contextBriefReady: boolean;
  contextDecision: WorkDesignContextDecision;
  contextOperatorNote: string;
  deliveryPackage: DeliveryPackageSummary;
  requestContextAdvice: AdvisorTransport;
  sourceRevision: string;
  captureBoard: () => ContextBoardSnapshot;
  restoreBoard: (snapshot: ContextBoardSnapshot) => void;
  commitBoard: () => void;
  setContextOperatorNote: Dispatch<SetStateAction<string>>;
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
  active,
  coreNodes, sources,
  contextAdvisorPrompt,
  contextBriefReadOnly,
  contextBriefReady,
  contextDecision,
  contextOperatorNote,
  deliveryPackage,
  requestContextAdvice,
  sourceRevision, captureBoard, restoreBoard, commitBoard, setContextOperatorNote,
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
  function applyDraft(edits: AdvisorEdit[], undo = false) {
    const boardEdit = edits.find((edit) => edit.field === "board");
    const nextBoard = boardEdit ? (undo ? boardEdit.value as ContextBoardSnapshot : applyContextBoardAdvisorPatch(captureBoard(), boardEdit.value, coreNodes.map((node) => node.id))) : null;
    if (nextBoard) { commitBoard(); restoreBoard(nextBoard); }
    for (const edit of edits) if (edit.field === "note") setContextOperatorNote(String(edit.value));
    setContextBriefAccepted(false); setHasUnsavedSessionChanges(true);
    setApplyReceiptRecorded(false); setApplyRunStartedAt(null);
    setDraftValidationAccepted(false); setDraftReviewAccepted(false);
    return edits.map((edit) => edit.field === "board" ? { field: "board", value: nextBoard } : edit);
  }
  const advisor = useDraftAdvisor({
    active,
    disabled: contextBriefReadOnly,
    getScope: () => ({ role: "work-design-context", ref: deliveryPackage.delivery_package_id,
      sourceRef: deliveryPackage.source_ref, sourceRevision, packageRef: deliveryPackage.delivery_package_id,
      context: JSON.stringify({ packageTitle: deliveryPackage.display_name, summary: deliveryPackage.summary, contextDecision, coreNodes, sources }),
      fields: [{ key: "note", label: "Context note", value: contextOperatorNote },
        { key: "board", label: "Context diagram", value: captureBoard(), kind: "board" }],
    }),
    apply: (edits) => applyDraft(edits), restore: (edits) => { applyDraft(edits, true); },
    transport: requestContextAdvice,
  });
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
      const response = await advisor.run(prompt);
      setContextAdvisorTurns((current) => [
        ...current,
        {
          id: `advisor-context-${turnId}`,
          role: "advisor",
          text: response.message,
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
    contextAdvisorControls: advisor.panelControls,
    acceptContextBrief,
    submitContextAdvisorPrompt,
    updateContextDecision,
  };
}
