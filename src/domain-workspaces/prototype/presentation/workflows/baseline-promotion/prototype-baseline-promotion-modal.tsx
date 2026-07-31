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
import type { PrototypeBaselinePromotionStepId } from "../../../work-model/workflows/baseline-promotion/prototype-baseline-promotion-model.ts";
import {
  type PrototypeBaselinePromotionInput,
  prototypeBaselineEvidenceAssessment,
  prototypeBaselinePromotionActiveStep,
  prototypeBaselinePromotionMove,
  prototypeBaselinePromotionWorkflowSteps,
} from "../../../work-model/workflows/baseline-promotion/prototype-baseline-promotion-model.ts";
import {
  baselineBoundaryCompactDetail,
  baselineBoundaryTone,
  baselineCurrentEvidenceTone,
  baselineDecisionActionLabel,
  baselineDecisionTone,
  baselineEvidenceChecklistRows,
  baselinePromotionAdvisorDraft,
  baselinePromotionDraftComplete,
  baselinePromotionDraftDirty,
  baselinePromotionDraftFromRecord,
  baselinePromotionInputFromDraft,
  type PrototypeBaselinePromotionDraft,
} from "./prototype-baseline-promotion-view-model.ts";
import { PrototypeBaselinePromotionSupportPanels } from "./prototype-baseline-promotion-support-panels.tsx";
import { PrototypeBaselinePromotionStepPanel } from "./prototype-baseline-promotion-work-step-panel.tsx";

export function PrototypeBaselinePromotionModal({
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
    input: PrototypeBaselinePromotionInput,
  ) => void;
  record: PrototypeRecord | null;
}) {
  const [activeStep, setActiveStep] =
    useState<PrototypeBaselinePromotionStepId>("packet");
  const [closeGuardIntent, setCloseGuardIntent] =
    useState<PrototypeWorkflowGuardIntent | null>(null);
  const [draft, setDraft] = useState<PrototypeBaselinePromotionDraft>(() =>
    baselinePromotionDraftFromRecord(null),
  );

  useEffect(() => {
    if (record) {
      setActiveStep(prototypeBaselinePromotionActiveStep(record));
      setCloseGuardIntent(null);
      setDraft(baselinePromotionDraftFromRecord(record));
    }
  }, [record]);

  if (!record) {
    return null;
  }

  const activeRecord = record;
  const command = getPrototypeCommandView(record, "record-baseline-promotion");
  const packetMove = prototypeBaselinePromotionMove(record);
  const workflowSteps = prototypeBaselinePromotionWorkflowSteps(record);
  const { nextStep, previousStep } = prototypeWorkflowStepNavigation(
    workflowSteps,
    activeStep,
  );
  const sourceDraft = baselinePromotionDraftFromRecord(record);
  const draftDirty = baselinePromotionDraftDirty(draft, sourceDraft);
  const draftComplete = baselinePromotionDraftComplete(draft);
  const draftMutable = prototypeWorkflowRecordCanEdit({
    disabledReason: command.disabledReason,
    record,
  });
  const decisionTone = baselineDecisionTone(draft.decision);
  const decisionActionLabel = baselineDecisionActionLabel(draft.decision);
  const packetDefinitionReady = Boolean(
    draft.baselineTitle.trim() && draft.baselineStatement.trim(),
  );
  const packetScopeReady = record.candidate.scope.included.length > 0;
  const packetDispositionsReady = Boolean(
    draft.evidenceDisposition.trim() && draft.issueDisposition.trim(),
  );
  const packetReady =
    packetDefinitionReady && packetScopeReady && packetDispositionsReady;
  const evidenceAssessment = prototypeBaselineEvidenceAssessment(record);
  const currentEvidenceReady = evidenceAssessment.ready;
  const currentEvidenceTone = baselineCurrentEvidenceTone(record);
  const currentEvidenceClear =
    currentEvidenceReady && currentEvidenceTone === "ok";
  const currentEvidenceDetail = evidenceAssessment.ready
    ? `${record.baseline.evidenceRefs.length} refs / required proof clear`
    : `${evidenceAssessment.missingRequirements.length} requirement${evidenceAssessment.missingRequirements.length === 1 ? "" : "s"} missing`;
  const boundaryTone = baselineBoundaryTone(record);
  const boundaryClear = boundaryTone === "ok";
  const boundaryDetail = baselineBoundaryCompactDetail(record);
  const reviewDispositionsReady = packetDispositionsReady;
  const baselineStateClear =
    record.baseline.state !== "blocked" && record.baseline.state !== "returned";
  const reviewReady =
    packetDefinitionReady &&
    currentEvidenceClear &&
    boundaryClear &&
    reviewDispositionsReady &&
    baselineStateClear;
  const applyDisabled =
    Boolean(command.disabledReason) ||
    !draftComplete ||
    (draft.decision === "approve-baseline" && !reviewReady);
  const evidenceChecklistRows = baselineEvidenceChecklistRows(record);

  function updateDraft(patch: Partial<PrototypeBaselinePromotionDraft>) {
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

  function discardBaselineDraft() {
    const intent = closeGuardIntent;

    setDraft(baselinePromotionDraftFromRecord(activeRecord));
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
      advisorDraft: baselinePromotionAdvisorDraft(activeRecord, draft, prompt),
      advisorPrompt: "",
    });
  }

  function recordBaselineDecision() {
    if (applyDisabled) {
      return;
    }

    onRecordReceipt(
      activeRecord,
      command.id,
      baselinePromotionInputFromDraft(draft),
    );
  }

  return (
    <>
      <TerasWizardModal
        activeStepId={activeStep}
        description="Prepare a local Baseline Packet before Movement request preparation. Prototype records acceptance; Movement Control owns boundary movement."
        footer={
          <TerasWizardFooter
            apply={
              activeStep === "decision"
                ? {
                    dataAction: command.id,
                    disabled: applyDisabled,
                    label: decisionActionLabel,
                    onClick: recordBaselineDecision,
                    tone: decisionTone === "danger" ? "danger" : "accent",
                    emphasis: "primary",
                  }
                : undefined
            }
            back={{
              label: previousStep ? "Back" : "Back to Dashboard",
              onClick: previousStep
                ? () =>
                    setActiveStep(
                      previousStep.id as PrototypeBaselinePromotionStepId,
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
                        nextStep.id as PrototypeBaselinePromotionStepId,
                      ),
                  }
                : undefined
            }
          />
        }
        kicker="Prototype Workflow"
        onClose={requestClose}
        onStepSelect={(stepId) =>
          setActiveStep(stepId as PrototypeBaselinePromotionStepId)
        }
        statusLabel={packetMove.statusLabel}
        statusTone={packetMove.tone}
        steps={workflowSteps}
        subject={prototypeWorkflowSubject(record)}
        support={
          <PrototypeBaselinePromotionSupportPanels
            activeStep={activeStep}
            advisorPromptMutable={draftMutable}
            baselineStateClear={baselineStateClear}
            boundaryClear={boundaryClear}
            boundaryDetail={boundaryDetail}
            boundaryTone={boundaryTone}
            currentEvidenceClear={currentEvidenceClear}
            currentEvidenceDetail={currentEvidenceDetail}
            currentEvidenceTone={currentEvidenceTone}
            decisionTone={decisionTone}
            draft={draft}
            draftComplete={draftComplete}
            draftMutable={draftMutable}
            onDraftChange={updateDraft}
            onRunAdvisor={runAdvisor}
            packetDefinitionReady={packetDefinitionReady}
            packetDispositionsReady={packetDispositionsReady}
            packetReady={packetReady}
            packetScopeReady={packetScopeReady}
            record={record}
            reviewDispositionsReady={reviewDispositionsReady}
            reviewReady={reviewReady}
          />
        }
        surfaceId="prototype-baseline-promotion"
        title="Baseline Promotion"
      >
        <PrototypeBaselinePromotionStepPanel
          activeStep={activeStep}
          draft={draft}
          draftMutable={draftMutable}
          evidenceChecklistRows={evidenceChecklistRows}
          onDraftChange={updateDraft}
          packetReady={packetReady}
        />
      </TerasWizardModal>
      <TerasDraftCloseGuardDialog
        description="This local Baseline Promotion draft has changes that are not recorded. Leaving now will discard those edits."
        kicker="Baseline Promotion"
        leaveLabel="Discard Draft"
        onKeepEditing={() => setCloseGuardIntent(null)}
        onLeave={discardBaselineDraft}
        open={closeGuardIntent !== null}
        title="Close Baseline Draft?"
      />
    </>
  );
}
