"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useRef, useState } from "react";
import { workDesignAdvisorBrowserBudgetMs, workDesignAdvisorProviderBudgetMs, workDesignAdvisorContextChars } from "../../../../live-runtime/work-design-advisor-policy.ts";
import { createWorkDesignAdvisorScope } from "../../../../live-runtime/work-design-draft-advisor.ts";
import { useDraftAdvisor, advisorWorkContext } from "@/agent-console";
import type { AdvisorTransport, AdvisorEdit } from "@/agent-console/model/advisor-drafts";
import { applyContextBoardAdvisorPatch, contextBoardAdvisorEditorFacts, contextBoardAdvisorSurfaces, contextBoardSurfaceBounds, contextBoardDiagramTypes, type ContextBoardSnapshot, type ContextBoardAdvisorViewport, type ContextBoardDiagramType } from "@/product-apps/context-board";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import {
  type WorkDesignAdvisorTranscriptLine,
} from "../view-model/work-design-context-advisor-view-model.ts";
import type {
  WorkDesignContextDecision,
  WorkDesignStep,
} from "../model/work-design-model.ts";

import { WORK_DESIGN_CONTEXT_NOTE_MAX_LENGTH } from "../../../../work-model/work-design/work-design-session-model.ts";
import { assertContextBoardDiagrams, captureContextBoardDiagrams, contextBoardCanvasSnapshot, contextBoardDiagrams, contextBoardSupportingDiagrams, legacyContextDiagramId, restoreLegacyContextBoardCanvas } from "../../../../../../product-apps/context-board/context-board-diagrams.ts";

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
  getBoardViewport: () => ContextBoardAdvisorViewport | null;
  getBoardStarterExample: () => unknown;
  fitBoardContent: () => void;
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
  sourceRevision, captureBoard, getBoardViewport, getBoardStarterExample, fitBoardContent, restoreBoard, commitBoard, setContextOperatorNote,
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
  const undoLegacyCanvas = useRef(false);
  const requestViewport = useRef<ContextBoardAdvisorViewport | null>(null);
  const fitBoard = useRef(fitBoardContent); fitBoard.current = fitBoardContent;
  function applyDraft(edits: AdvisorEdit[], undo = false) {
    const current = captureBoard();
    const typeEdit = edits.find(edit => edit.field === "diagramType");
    const selectedType = (typeEdit ? String(typeEdit.value) : contextBoardDiagrams(current).find(view => view.id === (current.activeDiagramId ?? legacyContextDiagramId))!.diagramType) as ContextBoardDiagramType;
    const boardEdit = edits.find((edit) => edit.field === "board");
    let nextBoard = boardEdit ? (undo ? captureContextBoardDiagrams(boardEdit.value as ContextBoardSnapshot,
      current.diagrams ?? null, current.activeDiagramId ?? legacyContextDiagramId)
      : applyContextBoardAdvisorPatch(current, boardEdit.value, coreNodes.map((node) => node.id), { viewport: requestViewport.current, diagramType: selectedType })) : null;
    const name = edits.find(edit => edit.field === "diagramName"), description = edits.find(edit => edit.field === "diagramDescription");
    if (name || description || typeEdit) {
      const content = nextBoard ?? current, activeId = content.activeDiagramId ?? legacyContextDiagramId;
      const diagrams = contextBoardDiagrams(content).map(view => view.id === activeId ? { ...view,
        ...(name ? { name: String(name.value) } : {}), ...(description ? { description: String(description.value) } : {}),
        ...(typeEdit ? { diagramType: selectedType } : {}),
        snapshot: contextBoardCanvasSnapshot(content) } : view);
      nextBoard = { ...content, diagrams, activeDiagramId: activeId };
    }
    if (undo && nextBoard) nextBoard = restoreLegacyContextBoardCanvas(nextBoard, undoLegacyCanvas.current);
    if (nextBoard) {
      assertContextBoardDiagrams(nextBoard); commitBoard(); restoreBoard(nextBoard);
      const viewport = requestViewport.current, now = getBoardViewport();
      const surfaces = contextBoardAdvisorSurfaces(nextBoard, coreNodes.map(node => node.id));
      const bounds = surfaces.length ? contextBoardSurfaceBounds(surfaces) : null;
      // A pan while reasoning is view state, not permission to steal focus.
      if (!undo && viewport && now && bounds && !contextBoardAdvisorSurfaces(current, coreNodes.map(node => node.id)).length &&
        Math.abs(now.x - viewport.x) < 1 && Math.abs(now.y - viewport.y) < 1 && Math.abs(now.zoom - viewport.zoom) < 0.001 &&
        (bounds.maxX - bounds.minX > viewport.width || bounds.maxY - bounds.minY > viewport.height)) requestAnimationFrame(() => fitBoard.current());
    }
    for (const edit of edits) if (edit.field === "note") setContextOperatorNote(String(edit.value));
    setContextBriefAccepted(false); setHasUnsavedSessionChanges(true);
    setApplyReceiptRecorded(false); setApplyRunStartedAt(null);
    setDraftValidationAccepted(false); setDraftReviewAccepted(false);
    return edits.map((edit) => edit.field === "board" ? { field: "board", value: contextBoardCanvasSnapshot(nextBoard!) } : edit);
  }
  const advisor = useDraftAdvisor({
    captureRequestContext: () => { requestViewport.current = getBoardViewport(); },
    requestBudgetMs: workDesignAdvisorBrowserBudgetMs, providerBudgetMs: workDesignAdvisorProviderBudgetMs, stopWaitingOnly: true,
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
        editor: contextBoardAdvisorEditorFacts(selected.diagramType, requestViewport.current, getBoardStarterExample()),
        resolvedObjects: contextBoardAdvisorSurfaces(document, coreNodes.map(node => node.id))
          .map(({ id, itemType, x, y, width, height }) => ({ id, itemType, x, y, width, height })),
        packageTitle: deliveryPackage.display_name, summary: deliveryPackage.summary, contextDecision, coreNodes, sources },
        { provided: ["Overall context note", "Selected diagram contents and explanation", "Other-view index", "Explicitly included read-only supporting diagrams", "Supplied source metadata"],
          unavailable: ["Unselected other diagram contents beyond their index", "Unprovided repository files, runtime evidence and linked document contents"] }, workDesignAdvisorContextChars),
      fields: [{ key: "note", label: "Context note", value: contextOperatorNote },
        { key: "diagramName", label: "Selected diagram name", value: selected.name, maxLength: 200 },
        { key: "diagramType", label: "Selected diagram type", value: selected.diagramType, allowedValues: ["freeform", ...contextBoardDiagramTypes] },
        { key: "diagramDescription", label: "Selected diagram explanation", value: selected.description, maxLength: 8000 },
        { key: "board", label: "Selected context diagram", value: contextBoardCanvasSnapshot(document), kind: "board" }],
    }); },
    apply: (edits) => { undoLegacyCanvas.current = !captureBoard().diagrams; return applyDraft(edits); }, restore: (edits) => { applyDraft(edits, true); },
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
