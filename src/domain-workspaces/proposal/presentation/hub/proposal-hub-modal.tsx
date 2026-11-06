"use client";

import { TerasDraftCloseGuardDialog, TerasModalShell, TerasLoadingState, TerasContentTray, TerasActionButton, TerasDialog } from "@/teras";

import type {
  ProposalDecisionDraft,
  ProposalRouteSelectionDraft,
} from "../../work-model/proposal-disposition-model.ts";
import type { ProposalHandoffDraft } from "../../work-model/proposal-handoff-model.ts";
import type { ProposalTriageDraft } from "../../work-model/proposal-triage-model.ts";
import type { ProposalWorkspaceScenario } from "../../read-model/proposal-workspace-read-model.ts";
import type { ProposalWorkflowLocalReceipt } from "../../local-runtime/proposal-runtime.ts";
import type { ProposalTargetApplicationResult } from "../../live-runtime/proposal-live-types.ts";
import { ProposalWorkflowFooter } from "../workflows/session/proposal-workflow-footer.tsx";
import { useProposalWorkflowSessionController } from "../workflows/session/proposal-workflow-session-controller.ts";
import { ProposalDispositionStep } from "../workflows/steps/disposition/proposal-disposition-step.tsx";
import { ProposalHandoffStep } from "../workflows/steps/handoff/proposal-handoff-step.tsx";
import { ProposalHistoryStep } from "../workflows/steps/history/proposal-history-step.tsx";
import { ProposalTriageStep } from "../workflows/steps/triage/proposal-triage-step.tsx";
import type { ProposalRepositoryGateResolution } from "../../../operation-integrations/proposal-repository-request-projection.ts";
import { ProposalHubHome } from "./proposal-hub-home.tsx";

export function ProposalHubModal({
  previewMode = true, sourceLoading = false, sourceError = null, onRetrySource,
  sourceHistory = null, historyPending = false, historyError = null, onLoadHistory,
  decisionDraft,
  handoffDraft,
  onCancelTargetApplication,
  onApplyDispositionDraft,
  onApplyHandoffDraft,
  onApplyTriageDraft,
  onChangeDecisionDraft,
  onChangeHandoffDraft,
  onChangeRouteSelectionDraft,
  onChangeTriageDraft,
  onClose,
  onInspectProposal,
  onOpenRepositorySurface,
  proposal,
  repositoryGateResolution,
  routeSelectionDraft,
  triageDraft,
  targetApplication,
  targetApplicationError,
  targetApplicationPending,
  workflowReceipts,
}: {
  previewMode?:boolean;sourceLoading?:boolean;sourceError?:string|null;onRetrySource?:()=>void;
  sourceHistory?:import("../../live-runtime/proposal-live-types.ts").ProposalOosHistory|null;
  historyPending?:boolean;historyError?:string|null;onLoadHistory?:()=>Promise<void>;
  decisionDraft: ProposalDecisionDraft | null;
  handoffDraft: ProposalHandoffDraft | null;
  onApplyDispositionDraft: (drafts: {
    decisionDraft: ProposalDecisionDraft;
    routeSelectionDraft: ProposalRouteSelectionDraft | null;
  }) => Promise<void>;
  onApplyHandoffDraft: (
    draft: ProposalHandoffDraft,
  ) => Promise<{ complete: boolean }>;
  onCancelTargetApplication: () => Promise<void>;
  onApplyTriageDraft: (draft: ProposalTriageDraft) => Promise<void>;
  onChangeDecisionDraft: (draft: ProposalDecisionDraft) => void;
  onChangeHandoffDraft: (draft: ProposalHandoffDraft) => void;
  onChangeRouteSelectionDraft: (draft: ProposalRouteSelectionDraft) => void;
  onChangeTriageDraft: (draft: ProposalTriageDraft) => void;
  onClose: () => void;
  onInspectProposal: (proposal: ProposalWorkspaceScenario) => void;
  onOpenRepositorySurface?: (proposalId: string) => void;
  proposal: ProposalWorkspaceScenario | null;
  repositoryGateResolution: ProposalRepositoryGateResolution | null;
  routeSelectionDraft: ProposalRouteSelectionDraft | null;
  triageDraft: ProposalTriageDraft | null;
  targetApplication: ProposalTargetApplicationResult | null;
  targetApplicationError: string | null;
  targetApplicationPending: boolean;
  workflowReceipts: ProposalWorkflowLocalReceipt[];
}) {
  const controller = useProposalWorkflowSessionController({
    decisionDraft,
    handoffDraft,
    onApplyDispositionDraft,
    onApplyHandoffDraft,
    onApplyTriageDraft,
    onClose,
    onInspectProposal,
    proposal,
    repositoryGateResolution,
    routeSelectionDraft,
    triageDraft,
  });

  if (!proposal || !controller) {
    return null;
  }

  const {
    activeDecisionDraft,
    activeHandoffDraft,
    activeRouteSelectionDraft,
    activeTriageDraft,
    activeWorkflowStep,
    applyDispositionDraft,
    applyHandoffDraft,
    applyTriageDraft,
    dispositionCloseGuardOpen,
    dispositionReadOnly,
    footerMove,
    handoffCloseGuardOpen,
    handoffReadOnly,
    handoffStepAvailable,
    hubProjection,
    keepDispositionEditing,
    keepHandoffEditing,
    keepTriageEditing,
    leaveDisposition,
    leaveHandoff,
    leaveTriage,
    progressSteps,
    requestClose,
    requestWorkflowStep,
    returnToRegister,
    returnToHub,
    runFooterMove,
    runCurrentMove,
    shellDescription,
    shellTitle,
    triageCloseGuardOpen,
    triageReadOnly,
  } = controller;
  const { currentMove } = hubProjection;
  const feedback=(<TerasDialog open={Boolean(controller.operation.pending || controller.operation.error || controller.operation.result)} busy={controller.operation.pending} busyLabel={controller.operation.label} closeDisabled={controller.operation.pending} height="content" width="standard" contentOverflow="auto"
      kicker="Proposal update" title={controller.operation.pending ? "Updating proposal" : controller.operation.error ? "Submission not confirmed" : "Update recorded"}
      description={controller.operation.pending ? "Please wait while the original request is checked." : controller.operation.error ?? controller.operation.result} onClose={controller.operation.pending ? undefined : controller.dismissOperation}
      actions={controller.operation.pending ? undefined : <TerasActionButton emphasis="primary" onClick={controller.dismissOperation}>Continue</TerasActionButton>} />);
  if(sourceLoading || sourceError) return <><TerasModalShell surfaceId="proposal-workflow-source" title="Proposal Hub" kicker="Selected Proposal" width="medium" height="content" bodyLayout="scroll" onClose={onClose}>
    {sourceError ? <TerasContentTray kicker="Details unavailable" description={sourceError} actions={<TerasActionButton emphasis="secondary" onClick={onRetrySource}>Retry details</TerasActionButton>} /> : <TerasLoadingState fill label="Loading current proposal…" skeleton="details" />}
  </TerasModalShell>{feedback}</>;


  return (
    <>
    <TerasModalShell
      busy={controller.operation.pending} busyLabel={controller.operation.label}
      height={activeWorkflowStep === "hub" ? "content" : "fill"}
      description={shellDescription}
      footer={
        <ProposalWorkflowFooter
          activeStep={activeWorkflowStep}
          currentMove={currentMove}
          footerMove={footerMove}
          onBackToHub={returnToHub}
          onBackToRegister={returnToRegister}
          onRunFooterMove={runFooterMove}
          onRunCurrentMove={runCurrentMove}
        />
      }
      kicker="Proposal Workflow"
      bodyLayout="fill"
      modalAttributes={{ "data-teras-active-step": activeWorkflowStep }}
      onClose={requestClose}
      surfaceId="proposal-workflow"
      title={shellTitle}
      width={activeWorkflowStep === "hub" ? "medium" : "large"}
    >

      {activeWorkflowStep === "disposition" ? (
        <>
          <ProposalDispositionStep
            decisionDraft={activeDecisionDraft}
            onApplyDraft={applyDispositionDraft}
            onChangeDecisionDraft={onChangeDecisionDraft}
            onChangeRouteSelectionDraft={onChangeRouteSelectionDraft}
            onOpenDetails={() => onInspectProposal(proposal)}
            onSelectStep={requestWorkflowStep}
            proposal={proposal}
            progressSteps={progressSteps}
            readOnly={dispositionReadOnly}
            routeSelectionDraft={activeRouteSelectionDraft}
          />
          <TerasDraftCloseGuardDialog
            description="This local Proposal Disposition draft is autosaved but not applied. Leaving returns to the Proposal Hub; reopening this proposal restores the draft."
            kicker="Proposal Disposition"
            leaveLabel="Back to Hub"
            onKeepEditing={keepDispositionEditing}
            onLeave={leaveDisposition}
            open={dispositionCloseGuardOpen}
            title="Leave Disposition Draft?"
          />
        </>
      ) : activeWorkflowStep === "handoff" ? (
        <>
          <ProposalHandoffStep
            previewMode={previewMode}
            draft={activeHandoffDraft}
            onApplyDraft={applyHandoffDraft}
            onChangeDraft={onChangeHandoffDraft}
            onOpenDetails={() => onInspectProposal(proposal)}
            onOpenRepositorySurface={onOpenRepositorySurface}
            onSelectStep={requestWorkflowStep}
            proposal={proposal}
            progressSteps={progressSteps}
            readOnly={handoffReadOnly}
            workflowReady={handoffStepAvailable}
            repositoryGateResolution={repositoryGateResolution}
            routeSelectionDraft={activeRouteSelectionDraft}
            onCancelTargetApplication={()=>void controller.runOperation("Cancelling target request…",onCancelTargetApplication,"Cancellation result refreshed. Review the target status.")}
            targetApplication={targetApplication}
            targetApplicationError={targetApplicationError}
            targetApplicationPending={targetApplicationPending}
          />
          <TerasDraftCloseGuardDialog
            description="This local Proposal Handoff draft is autosaved but not applied. Leaving returns to the Proposal Hub; reopening this proposal restores the draft."
            kicker="Proposal Handoff"
            leaveLabel="Back to Hub"
            onKeepEditing={keepHandoffEditing}
            onLeave={leaveHandoff}
            open={handoffCloseGuardOpen}
            title="Leave Handoff Draft?"
          />
        </>
      ) : activeWorkflowStep === "history" ? (
        <ProposalHistoryStep
          sourceHistory={sourceHistory} historyPending={historyPending} historyError={historyError} onLoadHistory={onLoadHistory}
          onOpenDetails={() => onInspectProposal(proposal)}
          onSelectStep={requestWorkflowStep}
          proposal={proposal}
          progressSteps={progressSteps}
          workflowReceipts={workflowReceipts}
        />
      ) : activeWorkflowStep === "triage" ? (
        <>
          <ProposalTriageStep
            draft={activeTriageDraft}
            onApplyDraft={applyTriageDraft}
            onChangeDraft={onChangeTriageDraft}
            onOpenDetails={() => onInspectProposal(proposal)}
            onSelectStep={requestWorkflowStep}
            proposal={proposal}
            progressSteps={progressSteps}
            readOnly={triageReadOnly}
          />
          <TerasDraftCloseGuardDialog
            description="This local Proposal Triage draft is autosaved but not applied. Leaving returns to the Proposal Hub; reopening this proposal restores the draft."
            kicker="Proposal Triage"
            leaveLabel="Back to Hub"
            onKeepEditing={keepTriageEditing}
            onLeave={leaveTriage}
            open={triageCloseGuardOpen}
            title="Leave Triage Draft?"
          />
        </>
      ) : (
        <ProposalHubHome
          hubProjection={hubProjection}
          onOpenHistory={() => requestWorkflowStep("history")}
          onRunCurrentMove={runCurrentMove}
          onSelectStep={requestWorkflowStep}
          proposal={proposal}
        />
      )}
    </TerasModalShell>
    {feedback}
    </>
  );
}
