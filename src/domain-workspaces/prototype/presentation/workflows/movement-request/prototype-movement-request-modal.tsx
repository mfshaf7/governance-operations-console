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
import type { PrototypeMovementRequestStepId } from "../../../work-model/workflows/movement-request/prototype-movement-request-model.ts";
import {
  type PrototypeMovementIntentId,
  type PrototypeMovementRequestDraftInput,
  prototypeMovementIntentTarget,
  prototypeMovementRequestActionState,
  prototypeMovementRequestActiveStep,
  prototypeMovementRequestHasRecordedOutput,
  prototypeMovementRequestMove,
  prototypeMovementRequestWorkflowSteps,
} from "../../../work-model/workflows/movement-request/prototype-movement-request-model.ts";
import {
  movementGateTone,
  movementIntentChoiceOptions,
  movementRequestAuthorityStatus,
  movementRequestCorrectionApplied,
  movementRequestDraftComplete,
  movementRequestDraftDirty,
  movementRequestDraftFromRecord,
  movementRequestDraftStatus,
  movementRequestGateStatus,
  movementRequestIntentStatus,
  movementRequestPacketStatus,
  movementRequestReviewStatus,
  type PrototypeMovementRequestLocalDraft,
} from "./prototype-movement-request-view-model.ts";
import { PrototypeMovementReadinessDialog } from "./prototype-movement-readiness-dialog.tsx";
import { PrototypeMovementRequestSupportPanels } from "./prototype-movement-request-support-panels.tsx";
import { PrototypeMovementRequestStepPanel } from "./prototype-movement-request-work-step-panel.tsx";

export function PrototypeMovementRequestModal({
  onBackToDashboard,
  onClose,
  onOpenHistory,
  onRecordReceipt,
  record,
}: {
  onBackToDashboard: () => void;
  onClose: () => void;
  onOpenHistory: (record: PrototypeRecord) => void;
  onRecordReceipt: (
    record: PrototypeRecord,
    commandId: PrototypeCommandId,
    draft: PrototypeMovementRequestDraftInput,
  ) => void;
  record: PrototypeRecord | null;
}) {
  const [activeStep, setActiveStep] =
    useState<PrototypeMovementRequestStepId>("intent");
  const [closeGuardIntent, setCloseGuardIntent] =
    useState<PrototypeWorkflowGuardIntent | null>(null);
  const [readinessDialogOpen, setReadinessDialogOpen] = useState(false);
  const [draft, setDraft] = useState<PrototypeMovementRequestLocalDraft>(() =>
    movementRequestDraftFromRecord(null),
  );

  useEffect(() => {
    if (record) {
      setActiveStep(prototypeMovementRequestActiveStep(record));
      setCloseGuardIntent(null);
      setReadinessDialogOpen(false);
      setDraft(movementRequestDraftFromRecord(record));
    }
  }, [record]);

  if (!record) {
    return null;
  }

  const activeRecord = record;
  const actionState = prototypeMovementRequestActionState(record);
  const command = getPrototypeCommandView(record, "prepare-movement-request");
  const movementMove = prototypeMovementRequestMove(record);
  const movementTarget = prototypeMovementIntentTarget(
    draft.movementIntent,
    record,
  );
  const intentOptions = movementIntentChoiceOptions(record);
  const workflowSteps = prototypeMovementRequestWorkflowSteps(record);
  const { nextStep, previousStep } = prototypeWorkflowStepNavigation(
    workflowSteps,
    activeStep,
  );
  const sourceDraft = movementRequestDraftFromRecord(record);
  const draftDirty = movementRequestDraftDirty(draft, sourceDraft);
  const draftComplete = movementRequestDraftComplete(draft);
  const correctionRequired = record.movementRequest.state === "returned";
  const correctionApplied = movementRequestCorrectionApplied(draft, record);
  const gateBlocked = record.movementRequest.gateSnapshot.some((gate) =>
    ["blocked", "stale"].includes(gate.status),
  );
  const gatesClear = record.movementRequest.gateSnapshot.every((gate) =>
    ["not-required", "ready"].includes(gate.status),
  );
  const gateTone = movementGateTone(record);
  const movementRequestRecorded =
    prototypeMovementRequestHasRecordedOutput(record);
  const requestReady =
    draftComplete &&
    correctionApplied &&
    !gateBlocked &&
    record.baseline.state === "ready-for-movement";
  const draftStatus = movementRequestDraftStatus({
    correctionApplied,
    correctionRequired,
    draftComplete,
  });
  const reviewStatus = movementRequestReviewStatus({
    gateBlocked,
    requestReady,
  });
  const authorityStatus = movementRequestAuthorityStatus(command);
  const intentStatus = movementRequestIntentStatus(record);
  const packetStatus = movementRequestPacketStatus({
    actionLabel: actionState.label,
    command,
    correctionRequired: correctionRequired && !correctionApplied,
    requestReady,
  });
  const gateFactStatus = movementRequestGateStatus({
    gateBlocked,
    gatesClear,
  });
  const draftMutable = prototypeWorkflowRecordCanEdit({
    disabledReason: command.disabledReason,
    record,
  });

  function updateDraft(patch: Partial<PrototypeMovementRequestLocalDraft>) {
    if (!draftMutable) {
      return;
    }

    setDraft((current) => ({
      ...current,
      ...patch,
    }));
  }

  function updateMovementIntent(movementIntent: PrototypeMovementIntentId) {
    const target = prototypeMovementIntentTarget(movementIntent, activeRecord);

    updateDraft({
      movementIntent,
      targetLane: target.targetLane,
      targetOwner: target.targetOwner,
    });
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

  function discardMovementDraft() {
    const intent = closeGuardIntent;

    setDraft(movementRequestDraftFromRecord(activeRecord));
    setCloseGuardIntent(null);

    if (intent === "back") {
      onBackToDashboard();
      return;
    }

    if (intent === "close") {
      onClose();
    }
  }

  function recordMovementRequest() {
    if (!requestReady || command.disabledReason) {
      return;
    }

    onRecordReceipt(activeRecord, command.id, {
      movementIntent: draft.movementIntent,
      requestReason: draft.requestReason,
      targetLane: movementTarget.targetLane,
      targetOwner: movementTarget.targetOwner,
    });
  }

  return (
    <>
      <TerasWizardModal
        activeStepId={activeStep}
        description="Prepare a structured Movement Control request draft. Prototype records preparation only; Movement Control owns queueing, decision, outcome, and receipts."
        footer={
          <TerasWizardFooter
            apply={
              activeStep === "request" && !movementRequestRecorded
                ? {
                    dataAction: command.id,
                    disabled: Boolean(command.disabledReason) || !requestReady,
                    label: command.label,
                    onClick: recordMovementRequest,
                    tone: command.tone === "danger" ? "danger" : "accent",
                  }
                : undefined
            }
            back={{
              label: previousStep ? "Back" : "Back to Dashboard",
              onClick: previousStep
                ? () =>
                    setActiveStep(
                      previousStep.id as PrototypeMovementRequestStepId,
                    )
                : requestBackToDashboard,
              emphasis: "secondary",
            }}
            finish={
              movementRequestRecorded
                ? {
                    label: "View History",
                    onClick: () => onOpenHistory(activeRecord),
                    emphasis: "primary",
                  }
                : command.disabledReason
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
                        nextStep.id as PrototypeMovementRequestStepId,
                      ),
                  }
                : undefined
            }
          />
        }
        kicker="Prototype Workflow"
        onClose={requestClose}
        onStepSelect={(stepId) =>
          setActiveStep(stepId as PrototypeMovementRequestStepId)
        }
        statusLabel={movementMove.statusLabel}
        statusTone={movementMove.tone}
        steps={workflowSteps}
        subject={prototypeWorkflowSubject(record)}
        support={
          <PrototypeMovementRequestSupportPanels
            activeStep={activeStep}
            authorityStatus={authorityStatus}
            draft={draft}
            draftStatus={draftStatus}
            gateBlocked={gateBlocked}
            gateFactStatus={gateFactStatus}
            gatesClear={gatesClear}
            gateTone={gateTone}
            movementRequestRecorded={movementRequestRecorded}
            onOpenReadiness={() => setReadinessDialogOpen(true)}
            record={record}
            reviewStatus={reviewStatus}
          />
        }
        surfaceId="prototype-movement-request"
        title="Movement Request"
      >
        <PrototypeMovementRequestStepPanel
          activeStep={activeStep}
          draft={draft}
          draftMutable={draftMutable}
          intentOptions={intentOptions}
          intentStatus={intentStatus}
          movementRequestRecorded={movementRequestRecorded}
          movementTarget={movementTarget}
          onDraftChange={updateDraft}
          onMovementIntentChange={updateMovementIntent}
          packetStatus={packetStatus}
          record={record}
        />
      </TerasWizardModal>
      <TerasDraftCloseGuardDialog
        description="This local Movement Request draft has changes that are not recorded. Leaving now will discard those edits."
        kicker="Movement Request"
        leaveLabel="Discard Draft"
        onKeepEditing={() => setCloseGuardIntent(null)}
        onLeave={discardMovementDraft}
        open={closeGuardIntent !== null}
        title="Close Movement Draft?"
      />
      <PrototypeMovementReadinessDialog
        onClose={() => setReadinessDialogOpen(false)}
        open={readinessDialogOpen}
        record={activeRecord}
      />
    </>
  );
}
