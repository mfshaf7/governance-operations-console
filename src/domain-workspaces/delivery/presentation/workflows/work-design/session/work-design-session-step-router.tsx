"use client";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import { TerasContentFrame } from "@/teras";
import type { workDesignDesignHubProjection } from "../view-model/work-design-hub-model.ts";
import { WorkDesignApplyDraftView } from "../steps/apply-draft/work-design-apply-draft-view.tsx";
import type { useWorkDesignApplyWorkflow } from "../steps/apply-draft/use-work-design-apply-workflow.ts";
import { WorkDesignBuildTreeStep } from "../steps/build-tree/work-design-build-tree-step.tsx";
import type { useWorkDesignBuildTree } from "../embedded-products/build-tree/index.ts";
import { WorkDesignContextStep } from "../steps/context/work-design-context-step.tsx";
import type { useWorkDesignContextBoard } from "../embedded-products/context-board/index.ts";
import { WorkDesignReviewDraftView } from "../steps/review-draft/work-design-review-draft-view.tsx";
import type { useWorkDesignReviewTreeDialog } from "../steps/review-draft/use-work-design-review-tree-dialog.ts";
import { WorkDesignHistoryView } from "../steps/history/work-design-history-view.tsx";
import { WorkDesignHubView } from "../hub/work-design-hub-view.tsx";
import type { useWorkDesignContextArtifacts } from "../artifacts/context-brief/index.ts";
import type { useWorkDesignContextActions } from "../session-controller/use-work-design-context-actions.ts";
import type { WorkDesignSessionState } from "../session-controller/use-work-design-session-state.ts";
import { WorkDesignProgressPanel } from "../shell/work-design-progress-panel.tsx";
import { workDesignReviewDraftViewModel } from "../view-model/work-design-session-view-model.ts";
import { workDesignContextAdvisorTranscript } from "../view-model/work-design-context-advisor-view-model.ts";
import type { WorkDesignCurrentMove } from "../view-model/work-design-current-move.ts";
import {
  type WorkDesignProgressStep,
  workDesignSteps,
} from "../view-model/work-design-step-model.ts";

type WorkDesignSessionStepRouterProps = {
  applyCompleted: boolean;
  applyReady: boolean;
  applyWorkflow: ReturnType<typeof useWorkDesignApplyWorkflow>;
  buildTree: ReturnType<typeof useWorkDesignBuildTree>;
  contextActions: ReturnType<typeof useWorkDesignContextActions>;
  contextArtifacts: ReturnType<typeof useWorkDesignContextArtifacts>;
  contextBoard: ReturnType<typeof useWorkDesignContextBoard>;
  currentMove: WorkDesignCurrentMove;
  deliveryPackage: DeliveryPackageSummary;
  draftTreePresent: boolean;
  exportApplyLog: () => void;
  exportContextSnapshotAttachment: () => void;
  exportWorkDesignReceipt: () => void;
  reviewHandoffNoteRecorded: boolean;
  designHubProjection: ReturnType<typeof workDesignDesignHubProjection>;
  modalState: WorkDesignSessionState;
  openBlockerRecovery: () => void;
  progressActiveStep: WorkDesignProgressStep;
  reviewReady: boolean;
  reviewTreeDialog: ReturnType<typeof useWorkDesignReviewTreeDialog>;
  saveContextSession: () => void;
  sourceApplyComplete: boolean;
  workDesignBlocked: boolean;
};

export function WorkDesignSessionStepRouter({
  applyCompleted,
  applyReady,
  applyWorkflow,
  buildTree,
  contextActions,
  contextArtifacts,
  contextBoard,
  currentMove,
  deliveryPackage,
  draftTreePresent,
  exportApplyLog,
  exportContextSnapshotAttachment,
  exportWorkDesignReceipt,
  reviewHandoffNoteRecorded,
  designHubProjection,
  modalState,
  openBlockerRecovery,
  progressActiveStep,
  reviewReady,
  reviewTreeDialog,
  saveContextSession,
  sourceApplyComplete,
  workDesignBlocked,
}: WorkDesignSessionStepRouterProps) {
  const {
    activeStep,
    applyReceiptRecorded,
    contextAdvisorPrompt,
    contextAdvisorTurns,
    contextBriefAccepted,
    contextDecision,
    contextOperatorNote,
    contextSources,
    hasUnsavedSessionChanges,
    reviewHandoffNote,
    draftReviewAccepted,
    setActiveStep,
    setContextAdvisorPrompt,
    setContextFinalizeDialogOpen,
    setContextSavedSessionsModalOpen,
    setContextSnapshotDialogOpen,
    setHasUnsavedSessionChanges,
    setReviewHandoffNote,
    setDraftReviewAccepted,
    setDraftValidationAccepted,
    draftValidationAccepted,
  } = modalState;
  const {
    applyBackendChecklistRows,
    applyDraftRef,
    applyExecutionLogLines,
    applyLogRecordedAt,
    applyReceiptId,
    applySnapshotActionLabel,
    applyTargetRecordRef,
    historyReceiptRows,
    historyTimelineRows,
    setApplyLogDialogOpen,
  } = applyWorkflow;
  const {
    addFeature,
    addRiskBranch,
    addStory,
    buildAdvisorPrompt,
    buildAdvisorTranscript,
    buildTreeViewMode,
    expandedNodeIds,
    metrics,
    openDetailNodeId,
    openScaffold,
    requestDelete,
    selectBuildTreeViewMode,
    selectWorkDesignNode,
    selectedDraftEditorOpen,
    selectedNode,
    selectedNodeId,
    setBuildAdvisorPrompt,
    setOpenDetailNodeId,
    setSelectedDraftEditorOpen,
    setTreeAddMenuNodeId,
    structuredStoryGroupIds,
    submitBuildAdvisorPrompt,
    toggleAllTreeNodes,
    toggleNodeExpansion,
    toggleStructuredStoryGroup,
    tree,
    treeAddMenuNodeId,
    treeFullyExpanded,
    updateNodeDraftBody,
    updateNodeRemark,
    updateNodeTitle,
  } = buildTree;
  const { contextBriefReadOnly } = contextBoard;
  const {
    contextBriefDisplayTitle,
    contextBriefFacts,
    contextBriefPanelTone,
    contextBriefState,
    contextBriefStatusTone,
    contextDecisionCopy,
    contextFinalizedBrief,
    contextSnapshotAttachment,
    contextSnapshotAttachmentExportLabel,
    contextSnapshotAttachmentStatusLabel,
  } = contextArtifacts;
  const { openReviewTreeDialog } = reviewTreeDialog;
  const { submitContextAdvisorPrompt, updateContextDecision } = contextActions;
  const contextAdvisorTranscript = workDesignContextAdvisorTranscript({
    contextAdvisorPrompt,
    contextAdvisorTurns,
    contextBriefReadOnly,
    contextDecision,
    contextOperatorNote,
    deliveryPackage,
  });
  const {
    reviewHandoffNoteReady,
    reviewSnapshotHandoffLabel,
    reviewSnapshotTone,
    reviewSystemCheckPassCount,
  } = workDesignReviewDraftViewModel({
    contextFinalizedBrief,
    contextSnapshotAttachment,
    contextSnapshotAttachmentStatusLabel,
    reviewHandoffNoteRecorded,
  });
  const effectiveDraftReviewAccepted =
    draftReviewAccepted || applyReceiptRecorded || sourceApplyComplete;

  return (
    <TerasContentFrame
      relative
      variant={activeStep === "context" ? "single-region" : "standard"}
    >
      {activeStep !== "context" && activeStep !== "hub" ? (
        <WorkDesignProgressPanel
          activeStep={activeStep}
          applyReceiptRecorded={applyReceiptRecorded}
          contextBriefAccepted={contextBriefAccepted}
          contextDecision={contextDecision}
          currentMove={currentMove}
          draftTreePresent={draftTreePresent}
          onSelectStep={setActiveStep}
          progressActiveStep={progressActiveStep}
          draftReviewAccepted={draftReviewAccepted}
          reviewReady={reviewReady}
          sourceWorkDesignClosed={designHubProjection.sourceWorkDesignClosed}
          draftValidationAccepted={draftValidationAccepted}
          workDesignBlocked={workDesignBlocked}
          workDesignSteps={workDesignSteps}
        />
      ) : null}

      {activeStep === "hub" ? (
        <WorkDesignHubView
          applyReceiptRecorded={applyReceiptRecorded}
          contextBriefAccepted={contextBriefAccepted}
          contextDecision={contextDecision}
          deliveryPackage={deliveryPackage}
          draftTreePresent={draftTreePresent}
          designHubProjection={designHubProjection}
          onOpenBlockerRecovery={openBlockerRecovery}
          onSelectStep={setActiveStep}
          draftReviewAccepted={draftReviewAccepted}
          reviewReady={reviewReady}
          draftValidationAccepted={draftValidationAccepted}
          workDesignBlocked={workDesignBlocked}
          workDesignSteps={workDesignSteps}
        />
      ) : activeStep === "context" ? (
        <WorkDesignContextStep
          applyCompleted={applyCompleted}
          board={contextBoard}
          contextAdvisorPrompt={contextAdvisorPrompt}
          contextAdvisorTranscript={contextAdvisorTranscript}
          contextBriefAccepted={contextBriefAccepted}
          contextBriefDisplayTitle={contextBriefDisplayTitle}
          contextBriefFacts={contextBriefFacts}
          contextBriefPanelTone={contextBriefPanelTone}
          contextBriefState={contextBriefState}
          contextBriefStatusTone={contextBriefStatusTone}
          contextDecision={contextDecision}
          contextDecisionCopy={contextDecisionCopy}
          contextSources={contextSources}
          saveContextSession={saveContextSession}
          setContextAdvisorPrompt={setContextAdvisorPrompt}
          setContextFinalizeDialogOpen={setContextFinalizeDialogOpen}
          setContextSavedSessionsModalOpen={setContextSavedSessionsModalOpen}
          submitContextAdvisorPrompt={submitContextAdvisorPrompt}
          updateContextDecision={updateContextDecision}
        />
      ) : activeStep === "build" ? (
        <WorkDesignBuildTreeStep
          addFeature={addFeature}
          addRiskBranch={addRiskBranch}
          addStory={addStory}
          buildAdvisorPrompt={buildAdvisorPrompt}
          buildAdvisorTranscript={buildAdvisorTranscript}
          buildTreeViewMode={buildTreeViewMode}
          contextDecisionCopy={contextDecisionCopy}
          contextFinalizedBrief={contextFinalizedBrief}
          contextSnapshotAttachmentStatusLabel={
            contextSnapshotAttachmentStatusLabel
          }
          expandedNodeIds={expandedNodeIds}
          openDetailNodeId={openDetailNodeId}
          openScaffold={openScaffold}
          requestDelete={requestDelete}
          selectBuildTreeViewMode={selectBuildTreeViewMode}
          selectWorkDesignNode={selectWorkDesignNode}
          selectedDraftEditorOpen={selectedDraftEditorOpen}
          selectedNode={selectedNode}
          selectedNodeId={selectedNodeId}
          setBuildAdvisorPrompt={setBuildAdvisorPrompt}
          setContextFinalizeDialogOpen={setContextFinalizeDialogOpen}
          setOpenDetailNodeId={setOpenDetailNodeId}
          setSelectedDraftEditorOpen={setSelectedDraftEditorOpen}
          setTreeAddMenuNodeId={setTreeAddMenuNodeId}
          structuredStoryGroupIds={structuredStoryGroupIds}
          submitBuildAdvisorPrompt={submitBuildAdvisorPrompt}
          toggleAllTreeNodes={toggleAllTreeNodes}
          toggleNodeExpansion={toggleNodeExpansion}
          toggleStructuredStoryGroup={toggleStructuredStoryGroup}
          tree={tree}
          treeAddMenuNodeId={treeAddMenuNodeId}
          treeFullyExpanded={treeFullyExpanded}
          updateNodeDraftBody={updateNodeDraftBody}
          updateNodeRemark={updateNodeRemark}
          updateNodeTitle={updateNodeTitle}
        />
      ) : activeStep === "review" ? (
        <WorkDesignReviewDraftView
          applyCompleted={applyCompleted}
          contextFinalizedBrief={contextFinalizedBrief}
          contextSnapshotAttachment={contextSnapshotAttachment}
          contextSnapshotAttachmentExportLabel={
            contextSnapshotAttachmentExportLabel
          }
          deliveryPackage={deliveryPackage}
          metrics={metrics}
          onChangeOperatorDraft={(value) => {
            if (applyCompleted) {
              return;
            }

            setReviewHandoffNote(value);
            setHasUnsavedSessionChanges(true);
            setDraftReviewAccepted(false);
            setDraftValidationAccepted(false);
          }}
          onExportSnapshot={exportContextSnapshotAttachment}
          onMarkReviewed={() => {
            setDraftReviewAccepted(true);
            setDraftValidationAccepted(false);
            setHasUnsavedSessionChanges(false);
          }}
          onOpenFinalizedBrief={() => setContextFinalizeDialogOpen(true)}
          onOpenReviewTree={openReviewTreeDialog}
          onOpenSnapshot={() => setContextSnapshotDialogOpen(true)}
          reviewHandoffNote={reviewHandoffNote}
          draftReviewAccepted={effectiveDraftReviewAccepted}
          reviewHandoffNoteReady={reviewHandoffNoteReady}
          reviewReady={reviewReady}
          reviewSnapshotHandoffLabel={reviewSnapshotHandoffLabel}
          reviewSnapshotTone={reviewSnapshotTone}
          reviewSystemCheckPassCount={reviewSystemCheckPassCount}
          tree={tree}
        />
      ) : activeStep === "apply" ? (
        <WorkDesignApplyDraftView
          applyReceiptRecorded={applyReceiptRecorded}
          applyBackendChecklistRows={applyBackendChecklistRows}
          applyDraftRef={applyDraftRef}
          applyExecutionLogLines={applyExecutionLogLines}
          applyLogRecordedAt={applyLogRecordedAt}
          applyReady={applyReady}
          applySnapshotActionLabel={applySnapshotActionLabel}
          applyTargetRecordRef={applyTargetRecordRef}
          contextSnapshotAttachment={contextSnapshotAttachment}
          deliveryPackage={deliveryPackage}
          exportApplyLog={exportApplyLog}
          hasUnsavedSessionChanges={hasUnsavedSessionChanges}
          onOpenFinalizedBrief={() => setContextFinalizeDialogOpen(true)}
          draftReviewAccepted={draftReviewAccepted}
          sourceApplyComplete={sourceApplyComplete}
        />
      ) : (
        <WorkDesignHistoryView
          applyReceiptId={applyReceiptId}
          applyReceiptRecorded={applyReceiptRecorded}
          deliveryPackage={deliveryPackage}
          historyReceiptRows={historyReceiptRows}
          historyTimelineRows={historyTimelineRows}
          onExportReceipt={exportWorkDesignReceipt}
          onOpenApplyLog={() => setApplyLogDialogOpen(true)}
          onOpenFinalizedBrief={() => setContextFinalizeDialogOpen(true)}
          onOpenReviewTree={openReviewTreeDialog}
          sourceWorkDesignClosed={designHubProjection.sourceWorkDesignClosed}
          sourceWorkDesignRetired={designHubProjection.sourceWorkDesignRetired}
          sourceTerminalDecision={
            designHubProjection.sourceWorkDesignClosed &&
            contextDecision !== "proceed"
          }
          sourceApplyComplete={sourceApplyComplete}
        />
      )}
    </TerasContentFrame>
  );
}
