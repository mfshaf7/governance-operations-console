"use client";

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
import type { PrototypeCloseoutRetirementStepId } from "../../../work-model/workflows/closeout-retirement/prototype-closeout-retirement-model.ts";
import {
  type PrototypeCloseoutInput,
  prototypeCloseoutImpactRows,
  prototypeCloseoutRequiresMovement,
  prototypeCloseoutRetentionRows,
  prototypeCloseoutRetirementActiveStep,
  prototypeCloseoutRetirementMove,
  prototypeCloseoutRetirementWorkflowSteps,
} from "../../../work-model/workflows/closeout-retirement/prototype-closeout-retirement-model.ts";
import {
  closeoutDecisionOptionsForState,
  closeoutDecisionSignal,
  closeoutDraftAction,
  closeoutDraftComplete,
  closeoutDraftDirty,
  closeoutDraftFromRecord,
  closeoutImpactStatus,
  closeoutMoveDescription,
  closeoutReasonStatus,
  closeoutReviewStatus,
  type CloseoutDraft,
} from "./prototype-closeout-retirement-view-model.ts";
import { PrototypeCloseoutRetirementSupportPanels } from "./prototype-closeout-retirement-support-panels.tsx";
import { PrototypeCloseoutRetirementStepPanel } from "./prototype-closeout-retirement-work-step-panel.tsx";

export function PrototypeCloseoutRetirementModal({
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
    input: PrototypeCloseoutInput,
  ) => void;
  record: PrototypeRecord | null;
}) {
  const [activeStep, setActiveStep] =
    useState<PrototypeCloseoutRetirementStepId>("impact");
  const [closeGuardIntent, setCloseGuardIntent] =
    useState<PrototypeWorkflowGuardIntent | null>(null);
  const [
    localRetirementConfirmationGuard,
    setLocalRetirementConfirmationGuard,
  ] = useState(false);
  const [draft, setDraft] = useState<CloseoutDraft>(() =>
    closeoutDraftFromRecord(null),
  );

  useEffect(() => {
    if (record) {
      setActiveStep(prototypeCloseoutRetirementActiveStep(record));
      setCloseGuardIntent(null);
      setLocalRetirementConfirmationGuard(false);
      setDraft(closeoutDraftFromRecord(record));
    }
  }, [record]);

  if (!record) {
    return null;
  }

  const activeRecord = record;
  const command = getPrototypeCommandView(record, "record-closeout-retirement");
  const closeoutMove = prototypeCloseoutRetirementMove(record);
  const impactRows = prototypeCloseoutImpactRows(record);
  const retentionRows = prototypeCloseoutRetentionRows(record);
  const requiresMovement = prototypeCloseoutRequiresMovement(record);
  const workflowSteps = prototypeCloseoutRetirementWorkflowSteps(record);
  const { nextStep, previousStep } = prototypeWorkflowStepNavigation(
    workflowSteps,
    activeStep,
  );
  const sourceDraft = closeoutDraftFromRecord(record);
  const draftDirty = closeoutDraftDirty(draft, sourceDraft);
  const draftComplete = closeoutDraftComplete(draft);
  const draftMutable = prototypeWorkflowRecordCanEdit({
    disabledReason: command.disabledReason,
    record,
  });
  const decisionSignal = closeoutDecisionSignal(requiresMovement, impactRows);
  const decisionOptions = closeoutDecisionOptionsForState({
    decisionSignal,
    requiresMovement,
  });
  const showSupersededBy =
    draft.reason === "duplicate" || draft.reason === "completed-elsewhere";
  const decisionAction = closeoutDraftAction(draft.decision);
  const canRecordCloseout =
    !command.disabledReason &&
    draftComplete &&
    (draft.decision !== "prepare-impacted-request" || requiresMovement) &&
    (draft.decision !== "retire-locally" || !requiresMovement);
  const reasonStatus = closeoutReasonStatus(draftComplete);
  const impactStatus = closeoutImpactStatus(requiresMovement);
  const reviewStatus = closeoutReviewStatus(canRecordCloseout);

  function updateDraft(patch: Partial<CloseoutDraft>) {
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

  function discardCloseoutDraft() {
    const intent = closeGuardIntent;

    setDraft(closeoutDraftFromRecord(activeRecord));
    setCloseGuardIntent(null);

    if (intent === "back") {
      onBackToDashboard();
      return;
    }

    if (intent === "close") {
      onClose();
    }
  }

  function recordCloseoutDecision() {
    if (!canRecordCloseout) {
      return;
    }

    if (draft.decision === "retire-locally") {
      setLocalRetirementConfirmationGuard(true);
      return;
    }

    onRecordReceipt(activeRecord, command.id, draft);
  }

  function confirmLocalRetirement() {
    if (!canRecordCloseout || draft.decision !== "retire-locally") {
      setLocalRetirementConfirmationGuard(false);
      return;
    }

    setLocalRetirementConfirmationGuard(false);
    onRecordReceipt(activeRecord, command.id, draft);
  }

  return (
    <>
      <TerasWizardModal
        activeStepId={activeStep}
        description="Review closeout impact, choose retained evidence, and record either local retirement or Movement Control preparation."
        footer={
          <TerasWizardFooter
            apply={
              activeStep === "decision"
                ? {
                    dataAction: command.id,
                    disabled: !canRecordCloseout,
                    label: decisionAction.label,
                    onClick: recordCloseoutDecision,
                    tone:
                      decisionAction.tone === "danger" ? "danger" : "accent",
                    emphasis: "primary",
                  }
                : undefined
            }
            back={{
              label: previousStep ? "Back" : "Back to Dashboard",
              onClick: previousStep
                ? () =>
                    setActiveStep(
                      previousStep.id as PrototypeCloseoutRetirementStepId,
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
                        nextStep.id as PrototypeCloseoutRetirementStepId,
                      ),
                  }
                : undefined
            }
          />
        }
        kicker="Prototype Workflow"
        onClose={requestClose}
        onStepSelect={(stepId) =>
          setActiveStep(stepId as PrototypeCloseoutRetirementStepId)
        }
        statusLabel={closeoutMove.statusLabel}
        statusTone={closeoutMove.tone}
        steps={workflowSteps}
        subject={prototypeWorkflowSubject(record)}
        support={
          <PrototypeCloseoutRetirementSupportPanels
            activeStep={activeStep}
            canRecordCloseout={canRecordCloseout}
            closeoutMoveDescription={closeoutMoveDescription(
              command,
              closeoutMove,
            )}
            closeoutMoveTitle={closeoutMove.title}
            closeoutMoveTone={closeoutMove.tone}
            decisionAction={decisionAction}
            decisionOptions={decisionOptions}
            decisionSignal={decisionSignal}
            draft={draft}
            draftComplete={draftComplete}
            draftMutable={draftMutable}
            impactRows={impactRows}
            impactStatus={impactStatus}
            onDraftChange={updateDraft}
            reasonStatus={reasonStatus}
            requiresMovement={requiresMovement}
            reviewStatus={reviewStatus}
            showSupersededBy={showSupersededBy}
          />
        }
        surfaceId="prototype-closeout-retirement"
        title="Closeout / Retirement"
      >
        <PrototypeCloseoutRetirementStepPanel
          activeStep={activeStep}
          draft={draft}
          draftMutable={draftMutable}
          impactStatus={impactStatus}
          onDraftChange={updateDraft}
          retentionRows={retentionRows}
          reviewStatus={reviewStatus}
          showSupersededBy={showSupersededBy}
        />
      </TerasWizardModal>
      <TerasDraftCloseGuardDialog
        description="This closeout draft has changes that are not recorded. Leaving now will discard those edits."
        kicker="Closeout / Retirement"
        leaveLabel="Discard Draft"
        onKeepEditing={() => setCloseGuardIntent(null)}
        onLeave={discardCloseoutDraft}
        open={closeGuardIntent !== null}
        title="Close Closeout Draft?"
      />
      <TerasDraftCloseGuardDialog
        description="Local retirement makes this prototype review-only in History and records a retained local receipt."
        keepEditingLabel="Review Again"
        kicker="Local Retirement"
        leaveLabel="Record Retirement"
        onKeepEditing={() => setLocalRetirementConfirmationGuard(false)}
        onLeave={confirmLocalRetirement}
        open={localRetirementConfirmationGuard}
        title="Record Local Retirement?"
      />
    </>
  );
}
