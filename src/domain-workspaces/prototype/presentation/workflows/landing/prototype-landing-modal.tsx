"use client";

import { useEffect, useState } from "react";

import {
  TerasDraftCloseGuardDialog,
  TerasWizardFooter,
  TerasWizardModal,
} from "@/teras";

import type { PrototypeCommandId } from "../../../work-model/commands/prototype-command-model.ts";
import { getPrototypeCommandView } from "../../../work-model/commands/prototype-command-model.ts";
import type {
  PrototypeRecord,
  PrototypeSupportAreaId,
  PrototypeSupportState,
} from "../../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeLandingStepId } from "../../../work-model/workflows/landing/prototype-landing-model.ts";
import {
  prototypeLandingDraftFromRecord,
  prototypeLandingActiveStep,
  prototypeLandingPlanFromDraft,
  prototypeLandingMove,
  prototypeLandingSetupTone,
  prototypeLandingSupportRowsSummary,
  prototypeLandingWorkflowSteps,
  type PrototypeLandingDraft,
} from "../../../work-model/workflows/landing/prototype-landing-model.ts";
import {
  prototypeBasePlatformLabel,
  prototypeSetupItemsForProfile,
} from "@/domain-workspaces/prototype/domain/support/prototype-setup-profile-model";
import {
  prototypeSupportProfileIsCustom,
  prototypeSupportRowsForProfileView,
  prototypeSupportRowsFromInputs,
  prototypeSupportRowWithState,
} from "@/domain-workspaces/prototype/domain/support/prototype-support-profile-model";
import {
  prototypeLandingApplySystemSupportLocks,
  prototypeLandingDraftKey,
  prototypeLandingRunActionStatus,
  prototypeLandingRunLogRows,
  prototypeLandingRunStatus,
  prototypeLandingSupportDerivedFields,
  prototypeLandingSupportPlannerStatus,
  prototypeLandingSupportRowIsSystemLocked,
} from "./prototype-landing-view-model.ts";
import { PrototypeLandingGuideDialog } from "./prototype-landing-guide-dialog.tsx";
import { PrototypeLandingProfileStepPanel } from "./prototype-landing-profile-step-panel.tsx";
import { PrototypeLandingRunStepPanel } from "./prototype-landing-run-step-panel.tsx";
import { PrototypeLandingSetupPlanStepPanel } from "./prototype-landing-setup-plan-step-panel.tsx";
import {
  PrototypeLandingRunSupportPanels,
  PrototypeLandingSetupCheckPanel,
  PrototypeLandingSupportCheckPanel,
} from "./prototype-landing-support-panels.tsx";
import {
  type PrototypeWorkflowGuardIntent,
  prototypeWorkflowStepNavigation,
  prototypeWorkflowSubject,
} from "../shared/prototype-workflow-modal-model.ts";
import type {
  PrototypeLandingSimulationInput,
  PrototypeLandingSimulationResult,
} from "../../../local-runtime/prototype-landing-runtime.ts";
import type { PrototypeLandingCommandInput } from "../../../work-model/workflows/landing/prototype-landing-model.ts";

export function PrototypeLandingModal({
  onBackToDashboard,
  onClose,
  onOpenDashboard,
  onLandPrototype,
  onRunLanding,
  record,
}: {
  onBackToDashboard: () => void;
  onClose: () => void;
  onOpenDashboard: () => void;
  onLandPrototype: (
    record: PrototypeRecord,
    input: PrototypeLandingCommandInput,
    commandId: PrototypeCommandId,
  ) => void;
  onRunLanding: (
    input: PrototypeLandingSimulationInput,
  ) => Promise<PrototypeLandingSimulationResult>;
  record: PrototypeRecord | null;
}) {
  const [activeStep, setActiveStep] =
    useState<PrototypeLandingStepId>("entry-support");
  const [closeGuardIntent, setCloseGuardIntent] =
    useState<PrototypeWorkflowGuardIntent | null>(null);
  const [supportGuideOpen, setSupportGuideOpen] = useState(false);
  const [selectedSupportRowId, setSelectedSupportRowId] =
    useState<PrototypeSupportAreaId>("source");
  const [landingDraft, setLandingDraft] =
    useState<PrototypeLandingDraft | null>(null);
  const [landingRunResult, setLandingRunResult] =
    useState<PrototypeLandingSimulationResult | null>(null);
  const [landingRunSubmitting, setLandingRunSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      const nextDraft = prototypeLandingDraftFromRecord(record);

      setActiveStep(prototypeLandingActiveStep(record));
      setCloseGuardIntent(null);
      setLandingRunResult(null);
      setLandingRunSubmitting(false);
      setSupportGuideOpen(false);
      setLandingDraft(nextDraft);
      setSelectedSupportRowId((current) =>
        nextDraft.supportRows.some((row) => row.id === current)
          ? current
          : (nextDraft.supportRows[0]?.id ?? "source"),
      );
    }
  }, [record]);

  if (!record) {
    return null;
  }

  const activeRecord = record;
  const activeLandingDraft =
    landingDraft ?? prototypeLandingDraftFromRecord(record);
  const activeLandingDraftKey = prototypeLandingDraftKey(activeLandingDraft);
  const sourceLandingDraftKey = prototypeLandingDraftKey(
    prototypeLandingDraftFromRecord(record),
  );
  const command = getPrototypeCommandView(record, "land-prototype-request");
  const landingMove = prototypeLandingMove(record);
  const landingDraftDirty = activeLandingDraftKey !== sourceLandingDraftKey;
  const landingDraftMutable =
    record.landing.state !== "landed" &&
    record.lifecycle !== "graduated" &&
    record.lifecycle !== "retired";
  const supportProfileCustom = prototypeSupportProfileIsCustom(
    activeLandingDraft.supportProfile,
  );
  const supportRowContentMutable = landingDraftMutable && supportProfileCustom;
  const visibleSupportRows = prototypeSupportRowsForProfileView({
    rows: activeLandingDraft.supportRows,
    supportProfile: activeLandingDraft.supportProfile,
  });
  const selectedSupportRow =
    visibleSupportRows.find((row) => row.id === selectedSupportRowId) ??
    visibleSupportRows[0] ??
    activeLandingDraft.supportRows[0];
  const selectedSupportRowLocked =
    !supportRowContentMutable ||
    prototypeLandingSupportRowIsSystemLocked(
      selectedSupportRow?.id,
      activeLandingDraft,
    );
  const setupItemsDraft = prototypeSetupItemsForProfile({
    basePlatform: activeLandingDraft.basePlatform,
    sourceHome: activeLandingDraft.sourceHome,
    supportRows: activeLandingDraft.supportRows,
  });
  const landingPlan = prototypeLandingPlanFromDraft(record, activeLandingDraft);
  const landingBlocked = landingPlan.hasLandingBlockers;
  const landingRunRecorded =
    Boolean(record.landing.lastLandingReceiptRef) ||
    record.landing.state === "blocked" ||
    record.landing.state === "landed";
  const landingRunComplete =
    (landingRunRecorded && !landingDraftDirty) ||
    landingRunResult?.draftKey === activeLandingDraftKey;
  const landingRunActionAvailable =
    activeStep === "result" &&
    landingDraftMutable &&
    !command.disabledReason &&
    !landingRunSubmitting &&
    (!landingRunComplete || landingDraftDirty);
  const landingRecordActionVisible =
    activeStep === "result" &&
    record.landing.state !== "landed" &&
    (!landingRunRecorded || landingDraftDirty);
  const landingRecordActionDisabled =
    !landingRunComplete || Boolean(command.disabledReason);
  const landingRunStatus = prototypeLandingRunStatus({
    landingBlocked,
    landingDraftDirty,
    landingRunComplete,
  });
  const landingRunActionStatus = prototypeLandingRunActionStatus(
    landingRunActionAvailable,
  );
  const landingCanOpenDashboard =
    record.landing.state === "landed" ||
    Boolean(command.disabledReason) ||
    (activeStep === "result" && landingRunRecorded && !landingDraftDirty);
  const supportCheckTone = landingBlocked ? "warn" : "info";
  const supportPlannerStatus = prototypeLandingSupportPlannerStatus({
    landingDraftDirty,
    landingDraftMutable,
    supportProfileCustom,
  });
  const workflowSteps = prototypeLandingWorkflowSteps(record).map((step) => {
    if (step.id === "entry-support") {
      return {
        ...step,
        detail: prototypeLandingSupportRowsSummary(
          activeLandingDraft.supportRows,
        ),
        stateLabel: landingBlocked ? "Blocked" : step.stateLabel,
        tone: landingBlocked ? "warn" : step.tone,
      };
    }

    if (step.id === "setup-plan") {
      return {
        ...step,
        detail: `${prototypeBasePlatformLabel(activeLandingDraft.basePlatform)} / ${activeLandingDraft.supportRows.length} support rows`,
        tone: prototypeLandingSetupTone(activeLandingDraft.basePlatform),
      };
    }

    return step;
  });
  const { nextStep, previousStep } = prototypeWorkflowStepNavigation(
    workflowSteps,
    activeStep,
  );
  const landingRunLogRows = prototypeLandingRunLogRows({
    basePlatformDraft: activeLandingDraft.basePlatform,
    landingDraftDirty,
    landingRunComplete,
    landingPlan,
    record,
    setupItemsDraft,
    supportRowsDraft: activeLandingDraft.supportRows,
    runEvents: landingRunResult?.run.events,
  });

  function requestBackToDashboard() {
    if (landingDraftDirty && landingDraftMutable) {
      setCloseGuardIntent("back");
      return;
    }

    onBackToDashboard();
  }

  function requestClose() {
    if (landingDraftDirty && landingDraftMutable) {
      setCloseGuardIntent("close");
      return;
    }

    onClose();
  }

  function discardSupportDraft() {
    const intent = closeGuardIntent;

    setLandingDraft(prototypeLandingDraftFromRecord(activeRecord));
    setLandingRunResult(null);
    setCloseGuardIntent(null);

    if (intent === "back") {
      onBackToDashboard();
      return;
    }

    if (intent === "close") {
      onClose();
    }
  }

  function updateSupportRowState(
    rowId: PrototypeSupportAreaId,
    state: PrototypeSupportState,
  ) {
    setLandingRunResult(null);
    setLandingDraft((currentDraft) => {
      const draft =
        currentDraft ?? prototypeLandingDraftFromRecord(activeRecord);

      if (
        !prototypeSupportProfileIsCustom(draft.supportProfile) ||
        prototypeLandingSupportRowIsSystemLocked(rowId, draft)
      ) {
        return draft;
      }

      return {
        ...draft,
        supportRows: draft.supportRows.map((row) =>
          row.id === rowId ? prototypeSupportRowWithState(row, state) : row,
        ),
      };
    });
  }

  function recordLanding() {
    if (
      !landingRunResult ||
      landingRunResult.draftKey !== activeLandingDraftKey
    ) {
      return;
    }

    onLandPrototype(
      activeRecord,
      {
        draft: activeLandingDraft,
        simulationDraftKey: landingRunResult.draftKey,
        simulationReceiptId: landingRunResult.receipt.receipt.receiptId,
      },
      command.id,
    );
  }

  async function runLanding() {
    if (!landingRunActionAvailable) {
      return;
    }

    setLandingRunSubmitting(true);
    try {
      const result = await onRunLanding({
        draft: activeLandingDraft,
        draftKey: activeLandingDraftKey,
        record: activeRecord,
      });
      setLandingRunResult(result);
    } finally {
      setLandingRunSubmitting(false);
    }
  }

  function updateLandingDraft<Field extends keyof PrototypeLandingDraft>(
    field: Field,
    value: PrototypeLandingDraft[Field],
  ) {
    setLandingRunResult(null);
    setLandingDraft((currentDraft) => {
      const nextDraft = {
        ...(currentDraft ?? prototypeLandingDraftFromRecord(activeRecord)),
        [field]: value,
      };

      if (!prototypeLandingSupportDerivedFields.has(field)) {
        return nextDraft;
      }

      if (prototypeSupportProfileIsCustom(nextDraft.supportProfile)) {
        return prototypeLandingApplySystemSupportLocks(nextDraft);
      }

      return {
        ...nextDraft,
        supportRows: prototypeSupportRowsFromInputs({
          dataMode: nextDraft.dataMode,
          mutationBoundary: nextDraft.mutationBoundary,
          previewNeed: nextDraft.previewNeed,
          sourceContext: nextDraft.summary,
          sourceHome: nextDraft.sourceHome,
          supportProfile: nextDraft.supportProfile,
          visibilityTier: nextDraft.visibilityTier,
        }),
      };
    });
  }

  return (
    <>
      <TerasWizardModal
        activeStepId={activeStep}
        description="Record the local Prototype Studio landing shape before candidate, baseline, or movement work starts."
        footer={
          <TerasWizardFooter
            back={{
              label: previousStep ? "Back" : "Back to Dashboard",
              onClick: previousStep
                ? () => setActiveStep(previousStep.id as PrototypeLandingStepId)
                : requestBackToDashboard,
              emphasis: "secondary",
            }}
            apply={
              landingRecordActionVisible
                ? {
                    dataAction: command.id,
                    disabled: landingRecordActionDisabled,
                    label: landingBlocked
                      ? "Record Blocked Landing"
                      : command.label,
                    onClick: recordLanding,
                    tone: command.tone === "danger" ? "danger" : "accent",
                    emphasis: landingRecordActionDisabled
                      ? "secondary"
                      : "primary",
                  }
                : undefined
            }
            finish={
              landingCanOpenDashboard
                ? {
                    label: "Open Dashboard",
                    onClick: onOpenDashboard,
                    emphasis: "secondary",
                  }
                : undefined
            }
            next={
              nextStep
                ? {
                    label: "Next",
                    onClick: () =>
                      setActiveStep(nextStep.id as PrototypeLandingStepId),
                  }
                : undefined
            }
          />
        }
        kicker="Prototype Workflow"
        onClose={requestClose}
        onStepSelect={(stepId) =>
          setActiveStep(stepId as PrototypeLandingStepId)
        }
        statusLabel={landingMove.statusLabel}
        statusTone={landingMove.tone}
        steps={workflowSteps}
        subject={prototypeWorkflowSubject(record, activeLandingDraft.name)}
        support={
          activeStep === "entry-support" ? (
            <PrototypeLandingSupportCheckPanel
              supportCheckTone={supportCheckTone}
              supportProfile={activeLandingDraft.supportProfile}
              supportProfileCustom={supportProfileCustom}
              visibleSupportRows={visibleSupportRows}
            />
          ) : activeStep === "setup-plan" ? (
            <PrototypeLandingSetupCheckPanel
              activeLandingDraft={activeLandingDraft}
              landingPlan={landingPlan}
              landingBlocked={landingBlocked}
              record={record}
              setupItemsDraft={setupItemsDraft}
            />
          ) : (
            <PrototypeLandingRunSupportPanels
              landingRunActionAvailable={landingRunActionAvailable}
              landingRunActionStatus={landingRunActionStatus}
              landingRunComplete={landingRunComplete}
              landingRunLogRows={landingRunLogRows}
              landingRunStatus={landingRunStatus}
              onRunLanding={runLanding}
            />
          )
        }
        surfaceId="prototype-landing"
        title="Prototype Landing"
      >
        {activeStep === "entry-support" ? (
          <PrototypeLandingProfileStepPanel
            activeLandingDraft={activeLandingDraft}
            landingDraftMutable={landingDraftMutable}
            onDraftChange={updateLandingDraft}
            onOpenSupportGuide={() => setSupportGuideOpen(true)}
            onSelectedSupportRowChange={setSelectedSupportRowId}
            onSupportRowStateChange={updateSupportRowState}
            selectedSupportRow={selectedSupportRow}
            selectedSupportRowLocked={selectedSupportRowLocked}
            supportPlannerStatus={supportPlannerStatus}
            supportProfileCustom={supportProfileCustom}
            supportRowContentMutable={supportRowContentMutable}
            visibleSupportRows={visibleSupportRows}
          />
        ) : activeStep === "setup-plan" ? (
          <PrototypeLandingSetupPlanStepPanel
            activeLandingDraft={activeLandingDraft}
            landingDraftMutable={landingDraftMutable}
            landingPlan={landingPlan}
            onDraftChange={updateLandingDraft}
          />
        ) : (
          <PrototypeLandingRunStepPanel
            activeLandingDraft={activeLandingDraft}
            landingPlan={landingPlan}
            landingBlocked={landingBlocked}
            landingRunComplete={landingRunComplete}
            record={record}
            setupItemsDraft={setupItemsDraft}
          />
        )}
      </TerasWizardModal>
      <TerasDraftCloseGuardDialog
        description="This local Prototype Landing support draft has changes that are not recorded. Leaving now will discard those row edits."
        kicker="Prototype Landing"
        leaveLabel="Discard Draft"
        onKeepEditing={() => setCloseGuardIntent(null)}
        onLeave={discardSupportDraft}
        open={closeGuardIntent !== null}
        title="Close Landing Draft?"
      />
      <PrototypeLandingGuideDialog
        onClose={() => setSupportGuideOpen(false)}
        open={supportGuideOpen}
      />
    </>
  );
}
