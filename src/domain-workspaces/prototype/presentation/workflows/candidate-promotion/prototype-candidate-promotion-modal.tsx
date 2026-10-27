"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useDraftAdvisor } from "@/agent-console";
import { candidateAdvisorFields, applyCandidateAdvisorEdits } from "../shared/prototype-advisor-fields.ts";

import {
  TerasDraftCloseGuardDialog,
  TerasFieldStack,
  TerasEmptyState,
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
import { PrototypeMaturityOwnerProgressPanel, prototypeMaturityRequestPending, type PrototypeMaturityOwnerProgress } from "../shared/prototype-maturity-owner-progress.tsx";

export function PrototypeCandidatePromotionModal({
  onBackToDashboard,
  onClose,
  onRecordReceipt,
  record,
  ownerProgress,
}: {
  onBackToDashboard: () => void;
  onClose: () => void;
  onRecordReceipt: (
    record: PrototypeRecord,
    commandId: PrototypeCommandId,
    input: PrototypeCandidatePromotionInput,
  ) => void | Promise<void>;
  record: PrototypeRecord | null;
  ownerProgress?: PrototypeMaturityOwnerProgress;
}) {
  const [activeStep, setActiveStep] =
    useState<PrototypeCandidatePromotionStepId>("interview");
  const [closeGuardIntent, setCloseGuardIntent] =
    useState<PrototypeWorkflowGuardIntent | null>(null);
  const [draft, setDraft] = useState<PrototypeCandidatePromotionDraft>(() =>
    candidatePromotionDraftFromRecord(null),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const advisor = useDraftAdvisor({
    active: Boolean(record),
    disabled: !record || submitting || ownerProgress?.pending === true ||
      prototypeMaturityRequestPending(ownerProgress) || Boolean(record && getPrototypeCommandView(record, "record-candidate-promotion").disabledReason),
    getScope: () => {
      if (!record) throw Error("Select a Prototype record first.");
      return { role: "prototype-candidate", ref: record.id, sourceRef: record.sourceRef,
        sourceRevision: record.projectionVersion,
        context: JSON.stringify({ name: record.name, summary: record.summary, candidate: record.candidate, decision: draft.decision }),
        fields: candidateAdvisorFields(draft) };
    },
    apply: (edits) => { const next = applyCandidateAdvisorEdits(draft, edits); setDraft(next);
      return edits.map((edit) => ({ field: edit.field, value: candidateAdvisorFields(next).find((field) => field.key === edit.field)!.value })); },
  });

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
  const ownerRequestPending = ownerProgress?.projection?.input.transition === "candidate-promotion" && prototypeMaturityRequestPending(ownerProgress);
  const draftMutable = !submitting && !ownerRequestPending && prototypeWorkflowRecordCanEdit({
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
    submitting || ownerProgress?.pending === true || ownerRequestPending ||
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

  async function runAdvisor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftMutable) {
      return;
    }

    const prompt = draft.advisorPrompt.trim();

    if (!prompt) {
      return;
    }

    setDraft((current) => ({ ...current, advisorPrompt: "" }));
    try { const reply = await advisor.run(prompt); setDraft((current) => ({ ...current, advisorDraft: reply.message })); }
    catch (error) { setDraft((current) => ({ ...current, advisorDraft: error instanceof Error ? error.message : "Governed advisor unavailable." })); }
  }

  async function recordCandidateDecision() {
    if (applyDisabled) {
      return;
    }

    setSubmitting(true); setSubmissionError(null);
    try { await onRecordReceipt(
      activeRecord,
      command.id,
      candidatePromotionInputFromDraft(draft),
    ); } catch (error) { setSubmissionError(error instanceof Error ? error.message : "Candidate owner request failed."); }
    finally { setSubmitting(false); }
  }

  return (
    <>
      <TerasWizardModal
        activeStepId={activeStep}
        description={ownerProgress?.mode === "live" ? "Review the Candidate decision, then follow the OOS request through exact Studio review and merged owner readback." : "Promote an exploring prototype only after the objective, scope, boundaries, and local decision are explicit."}
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
          <TerasFieldStack spacing="normal">
          {submissionError ? <TerasEmptyState>{submissionError}</TerasEmptyState> : null}
          {ownerProgress?.projection?.input.transition === "candidate-promotion" || !ownerProgress?.projection ? <PrototypeMaturityOwnerProgressPanel progress={ownerProgress} /> : null}
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
            advisorControls={advisor.panelControls}
            record={record}
            reviewReady={reviewReady}
            reviewTone={reviewTone}
          />
          </TerasFieldStack>
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
          reviewActionLabel={ownerProgress?.mode === "live" ? "Owner decision" : actionState.label}
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
