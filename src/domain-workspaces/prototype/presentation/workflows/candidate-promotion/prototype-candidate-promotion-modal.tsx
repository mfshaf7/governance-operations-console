"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import {
  TerasDraftCloseGuardDialog,
  TerasWizardFooter,
  TerasWizardModal,
} from "@/teras";

import type { PrototypeCommandId } from "../../../work-model/commands/prototype-command-model.ts";
import { getPrototypeCommandView } from "../../../work-model/commands/prototype-command-model.ts";
import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import {
  type PrototypeWorkflowGuardIntent,
  prototypeWorkflowRecordCanEdit,
  prototypeWorkflowStepNavigation,
  prototypeWorkflowSubject,
} from "../shared/prototype-workflow-modal-model.ts";
import type { PrototypeCandidatePromotionStepId } from "../../../work-model/workflows/candidate-promotion/prototype-candidate-promotion-model.ts";
import {
  prototypeCandidatePromotionActionState,
  prototypeCandidatePromotionActiveStep,
  prototypeCandidatePromotionMove,
  prototypeCandidatePromotionWorkflowSteps,
  type PrototypeCandidatePromotionInput,
} from "../../../work-model/workflows/candidate-promotion/prototype-candidate-promotion-model.ts";
import {
  candidatePromotionAdvisorDraft,
  candidatePromotionBoundaryDetail,
  candidatePromotionBoundaryReady,
  candidatePromotionDecisionActionLabel,
  candidatePromotionDecisionTone,
  candidatePromotionDraftComplete,
  candidatePromotionDraftDirty,
  candidatePromotionDraftFromRecord,
  candidatePromotionIssueProjection,
  candidatePromotionInputFromDraft,
  candidatePromotionReadyTone,
  candidatePromotionReviewTone,
  type PrototypeCandidatePromotionDraft,
} from "./prototype-candidate-promotion-view-model.ts";
import { PrototypeCandidatePromotionSupportPanels } from "./prototype-candidate-promotion-support-panels.tsx";
import { PrototypeCandidatePromotionStepPanel } from "./prototype-candidate-promotion-work-step-panel.tsx";

export function PrototypeCandidatePromotionModal({
  onBackToDashboard,
  onClose,
  onRecordReceipt,
  record,
}: {
  onBackToDashboard: () => void;
  onClose: () => void;
  onRecordReceipt: (
    record: PrototypeRecord,
    commandId: PrototypeCommandId,
    input: PrototypeCandidatePromotionInput,
  ) => void;
  record: PrototypeRecord | null;
}) {
  const [activeStep, setActiveStep] =
    useState<PrototypeCandidatePromotionStepId>("interview");
  const [closeGuardIntent, setCloseGuardIntent] =
    useState<PrototypeWorkflowGuardIntent | null>(null);
  const [draft, setDraft] = useState<PrototypeCandidatePromotionDraft>(() =>
    candidatePromotionDraftFromRecord(null),
  );

  useEffect(() => {
    if (record) {
      setActiveStep(prototypeCandidatePromotionActiveStep(record));
      setCloseGuardIntent(null);
      setDraft(candidatePromotionDraftFromRecord(record));
    }
  }, [record]);

  if (!record) {
    return null;
  }

  const activeRecord = record;
  const command = getPrototypeCommandView(record, "record-candidate-promotion");
  const actionState = prototypeCandidatePromotionActionState(record);
  const candidateMove = prototypeCandidatePromotionMove(record);
  const workflowSteps = prototypeCandidatePromotionWorkflowSteps(record);
  const { nextStep, previousStep } = prototypeWorkflowStepNavigation(
    workflowSteps,
    activeStep,
  );
  const sourceDraft = candidatePromotionDraftFromRecord(record);
  const draftDirty = candidatePromotionDraftDirty(draft, sourceDraft);
  const draftComplete = candidatePromotionDraftComplete(draft);
  const draftMutable = prototypeWorkflowRecordCanEdit({
    disabledReason: command.disabledReason,
    record,
  });
  const actionTone = candidatePromotionDecisionTone(draft.decision);
  const actionLabel = candidatePromotionDecisionActionLabel(draft.decision);
  const boundaryReady = candidatePromotionBoundaryReady(record);
  const boundaryTone = candidatePromotionReadyTone(boundaryReady);
  const boundaryDetail = candidatePromotionBoundaryDetail(record);
  const issueProjection = candidatePromotionIssueProjection(record);
  const blockedIssue = issueProjection.blockedIssue;
  const issueTone = issueProjection.tone;
  const issueDetail = issueProjection.detail;
  const reviewReady = draftComplete && boundaryReady && !blockedIssue;
  const reviewTone = candidatePromotionReviewTone({
    blockedIssue,
    reviewReady,
  });
  const applyDisabled =
    Boolean(command.disabledReason) ||
    !draftComplete ||
    (draft.decision === "block-promotion" && !blockedIssue) ||
    (draft.decision === "promote-candidate" && !reviewReady);

  function updateDraft(patch: Partial<PrototypeCandidatePromotionDraft>) {
    if (!draftMutable) {
      return;
    }

    setDraft((current) => ({
      ...current,
      ...patch,
    }));
  }

  function requestBackToDashboard() {
    if (draftDirty && draftMutable) {
      setCloseGuardIntent("back");
      return;
    }

    onBackToDashboard();
  }

  function requestClose() {
    if (draftDirty && draftMutable) {
      setCloseGuardIntent("close");
      return;
    }

    onClose();
  }

  function discardCandidateDraft() {
    const intent = closeGuardIntent;

    setDraft(candidatePromotionDraftFromRecord(activeRecord));
    setCloseGuardIntent(null);

    if (intent === "back") {
      onBackToDashboard();
      return;
    }

    if (intent === "close") {
      onClose();
    }
  }

  function runAdvisor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftMutable) {
      return;
    }

    const prompt = draft.advisorPrompt.trim();

    if (!prompt) {
      return;
    }

    updateDraft({
      advisorDraft: candidatePromotionAdvisorDraft(activeRecord, draft, prompt),
      advisorPrompt: "",
    });
  }

  function recordCandidateDecision() {
    if (applyDisabled) {
      return;
    }

    onRecordReceipt(
      activeRecord,
      command.id,
      candidatePromotionInputFromDraft(draft),
    );
  }

  return (
    <>
      <TerasWizardModal
        activeStepId={activeStep}
        description="Promote an exploring prototype only after the objective, scope, boundaries, and local decision are explicit."
        footer={
          <TerasWizardFooter
            apply={
              activeStep === "review"
                ? {
                    dataAction: command.id,
                    disabled: applyDisabled,
                    label: actionLabel,
                    onClick: recordCandidateDecision,
                    tone: actionTone === "danger" ? "danger" : "accent",
                    emphasis: "primary",
                  }
                : undefined
            }
            back={{
              label: previousStep ? "Back" : "Back to Dashboard",
              onClick: previousStep
                ? () =>
                    setActiveStep(
                      previousStep.id as PrototypeCandidatePromotionStepId,
                    )
                : requestBackToDashboard,
              emphasis: "secondary",
            }}
            finish={
              command.disabledReason
                ? {
                    label: "Open Dashboard",
                    onClick: onBackToDashboard,
                    emphasis: "secondary",
                  }
                : undefined
            }
            next={
              nextStep
                ? {
                    label: "Next",
                    onClick: () =>
                      setActiveStep(
                        nextStep.id as PrototypeCandidatePromotionStepId,
                      ),
                  }
                : undefined
            }
          />
        }
        kicker="Prototype Workflow"
        onClose={requestClose}
        onStepSelect={(stepId) =>
          setActiveStep(stepId as PrototypeCandidatePromotionStepId)
        }
        statusLabel={candidateMove.statusLabel}
        statusTone={candidateMove.tone}
        steps={workflowSteps}
        subject={prototypeWorkflowSubject(record)}
        support={
          <PrototypeCandidatePromotionSupportPanels
            actionTone={actionTone}
            activeStep={activeStep}
            blockedIssue={blockedIssue}
            boundaryDetail={boundaryDetail}
            boundaryReady={boundaryReady}
            boundaryTone={boundaryTone}
            draft={draft}
            draftComplete={draftComplete}
            draftMutable={draftMutable}
            issueDetail={issueDetail}
            issueTone={issueTone}
            onDraftChange={updateDraft}
            onRunAdvisor={runAdvisor}
            record={record}
            reviewReady={reviewReady}
            reviewTone={reviewTone}
          />
        }
        surfaceId="prototype-candidate-promotion"
        title="Candidate Promotion"
      >
        <PrototypeCandidatePromotionStepPanel
          activeStep={activeStep}
          draft={draft}
          draftComplete={draftComplete}
          draftMutable={draftMutable}
          issueTone={issueTone}
          onDraftChange={updateDraft}
          record={record}
          reviewActionLabel={actionState.label}
          reviewReady={reviewReady}
        />
      </TerasWizardModal>
      <TerasDraftCloseGuardDialog
        description="This local Candidate Promotion draft has changes that are not recorded. Leaving now will discard those edits."
        kicker="Candidate Promotion"
        leaveLabel="Discard Draft"
        onKeepEditing={() => setCloseGuardIntent(null)}
        onLeave={discardCandidateDraft}
        open={closeGuardIntent !== null}
        title="Close Candidate Draft?"
      />
    </>
  );
}
