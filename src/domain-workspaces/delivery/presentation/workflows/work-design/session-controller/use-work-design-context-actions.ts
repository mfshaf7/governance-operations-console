"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useState } from "react";
import { createWorkDesignAdvisorScope } from "../../../../live-runtime/work-design-draft-advisor.ts";
import { useDraftAdvisor, advisorWorkContext } from "@/agent-console";
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

import { WORK_DESIGN_CONTEXT_NOTE_MAX_LENGTH } from "../../../../work-model/work-design/work-design-session-model.ts";
import { assertContextBoardDiagrams, captureContextBoardDiagrams, contextBoardCanvasSnapshot, contextBoardDiagrams, contextBoardSupportingDiagrams, legacyContextDiagramId } from "../../../../../../product-apps/context-board/context-board-diagrams.ts";

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
  const [supportingDiagramIds, setSupportingDiagramIds] = useState<string[]>([]);
  function applyDraft(edits: AdvisorEdit[], undo = false) {
    const current = captureBoard();
    const boardEdit = edits.find((edit) => edit.field === "board");
    let nextBoard = boardEdit ? (undo ? captureContextBoardDiagrams(boardEdit.value as ContextBoardSnapshot,
      current.diagrams ?? null, current.activeDiagramId ?? legacyContextDiagramId)
      : applyContextBoardAdvisorPatch(current, boardEdit.value, coreNodes.map((node) => node.id))) : null;
    const name = edits.find(edit => edit.field === "diagramName"), description = edits.find(edit => edit.field === "diagramDescription");
    if (name || description) {
      const content = nextBoard ?? current, activeId = content.activeDiagramId ?? legacyContextDiagramId;
      const diagrams = contextBoardDiagrams(content).map(view => view.id === activeId ? { ...view,
        ...(name ? { name: String(name.value) } : {}), ...(description ? { description: String(description.value) } : {}),
        snapshot: contextBoardCanvasSnapshot(content) } : view);
      nextBoard = { ...content, diagrams, activeDiagramId: activeId };
    }
    if (nextBoard) { assertContextBoardDiagrams(nextBoard); commitBoard(); restoreBoard(nextBoard); }
    for (const edit of edits) if (edit.field === "note") setContextOperatorNote(String(edit.value));
    setContextBriefAccepted(false); setHasUnsavedSessionChanges(true);
    setApplyReceiptRecorded(false); setApplyRunStartedAt(null);
    setDraftValidationAccepted(false); setDraftReviewAccepted(false);
    return edits.map((edit) => edit.field === "board" ? { field: "board", value: contextBoardCanvasSnapshot(nextBoard!) } : edit);
  }
  const advisor = useDraftAdvisor({
    conversation: { role: "work-design-context", ref: deliveryPackage.delivery_package_id, sourceRef: deliveryPackage.source_ref, sourceRevision },
    active,
    disabled: contextBriefReadOnly,
    getScope: () => {
      const document = captureBoard(), activeId = document.activeDiagramId ?? legacyContextDiagramId;
      const diagrams = contextBoardDiagrams(document), selected = diagrams.find(view => view.id === activeId)!;
      return createWorkDesignAdvisorScope(deliveryPackage, { role: "work-design-context", ref: `${deliveryPackage.delivery_package_id}/${activeId}`,
      sourceRevision,
      context: advisorWorkContext({ purpose: "Understand the architecture of the system under design. ART records bound the work; they are not the system's components. Distinguish verified current behavior, proposed changes and unknowns. Build Tree handles delivery decomposition. Edit only the selected diagram. Explicitly included supporting diagrams provide read-only knowledge; remaining views are an index, not inspected content.", selectedDiagram: activeId,
        diagrams: diagrams.map(view => ({ id: view.id, name: view.name, diagramType: view.diagramType })),
        readOnlySupportingDiagrams: contextBoardSupportingDiagrams(document, supportingDiagramIds),
        canvas: { width: 5600, height: 3600 },
        packageTitle: deliveryPackage.display_name, summary: deliveryPackage.summary, contextDecision, coreNodes, sources },
        { provided: ["Overall context note", "Selected diagram contents and explanation", "Other-view index", "Explicitly included read-only supporting diagrams", "Supplied source metadata"],
          unavailable: ["Unselected other diagram contents beyond their index", "Unprovided repository files, runtime evidence and linked document contents"] }),
      fields: [{ key: "note", label: "Context note", value: contextOperatorNote },
        { key: "diagramName", label: "Selected diagram name", value: selected.name, maxLength: 200 },
        { key: "diagramDescription", label: "Selected diagram explanation", value: selected.description, maxLength: 8000 },
        { key: "board", label: "Selected context diagram", value: contextBoardCanvasSnapshot(document), kind: "board" }],
    }); },
    apply: (edits) => applyDraft(edits), restore: (edits) => { applyDraft(edits, true); },
    transport: requestContextAdvice,
  });
  function updateContextOperatorNote(value: string) {
    if (contextBriefReadOnly || (value.length > WORK_DESIGN_CONTEXT_NOTE_MAX_LENGTH && value.length >= contextOperatorNote.length)) return;
    applyDraft([{ field: "note", value }]);
  }

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
              ? `Advisor request failed: ${error.message}`
              : "The advisor request failed. No draft was changed.",
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

  const diagramDocument = captureBoard();
  return {
    contextAdvisorControls: { ...advisor.panelControls, supportingContext: {
      label: "Supporting diagrams", choices: contextBoardDiagrams(diagramDocument).filter(view => view.id !== (diagramDocument.activeDiagramId ?? legacyContextDiagramId)).map(view => ({ id: view.id, label: view.name, selected: supportingDiagramIds.includes(view.id) })),
      onToggle: (id: string) => setSupportingDiagramIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]),
    } },
    acceptContextBrief,
    submitContextAdvisorPrompt,
    updateContextDecision,
    updateContextOperatorNote,
  };
}
