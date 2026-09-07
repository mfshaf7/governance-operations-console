"use client";

import { useEffect, useState } from "react";

import {
  TerasDraftCloseGuardDialog,
  TerasWizardFooter,
  TerasWizardModal,
} from "@/teras";
import { openExternalConsoleRoute } from "@/console-integration/external-route";

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
} from "../../../local-runtime/prototype-landing-runtime.ts";
import type {
  PrototypeLandingLiveProjection,
  PrototypeLandingRunResult,
} from "../../../live-runtime/prototype-landing-live-types.ts";
import type { PrototypeLandingCommandInput } from "../../../work-model/workflows/landing/prototype-landing-model.ts";

export function PrototypeLandingModal({
  liveProjection,
  onBackToDashboard,
  onCancelLanding,
  onClose,
  onOpenDashboard,
  onLandPrototype,
  onRunLanding,
  record,
}: {
  liveProjection: PrototypeLandingLiveProjection | null;
  onBackToDashboard: () => void;
  onCancelLanding: (
    input: PrototypeLandingSimulationInput,
  ) => Promise<PrototypeLandingRunResult | null>;
  onClose: () => void;
  onOpenDashboard: () => void;
  onLandPrototype: (
    record: PrototypeRecord,
    input: PrototypeLandingCommandInput,
    commandId: PrototypeCommandId,
  ) => void;
  onRunLanding: (
    input: PrototypeLandingSimulationInput,
  ) => Promise<PrototypeLandingRunResult>;
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
    useState<PrototypeLandingRunResult | null>(null);
  const [landingRunError, setLandingRunError] = useState<string | null>(null);
  const [landingRunSubmitting, setLandingRunSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      const nextDraft =
        liveProjection?.recordId === record.id
          ? liveProjection.draft
          : prototypeLandingDraftFromRecord(record);

      setActiveStep(prototypeLandingActiveStep(record));
      setCloseGuardIntent(null);
      setLandingRunResult(
        liveProjection?.recordId === record.id
          ? {
              draftKey: liveProjection.draftKey,
              mode: "live",
              result: liveProjection.result,
            }
          : null,
      );
      setLandingRunError(null);
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

  useEffect(() => {
    if (!record || liveProjection?.recordId !== record.id) return;
    setLandingRunResult({
      draftKey: liveProjection.draftKey,
      mode: "live",
      result: liveProjection.result,
    });
  }, [liveProjection, record]);

  if (!record) {
    return null;
  }

  const activeRecord = record;
  const activeLandingDraft =
    landingDraft ?? prototypeLandingDraftFromRecord(record);
  const activeLandingDraftKey = prototypeLandingDraftKey(activeLandingDraft);
  const sourceLandingDraftKey = prototypeLandingDraftKey(
    liveProjection?.recordId === record.id
      ? liveProjection.draft
      : prototypeLandingDraftFromRecord(record),
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
  const currentRunResult =
    landingRunResult?.draftKey === activeLandingDraftKey
      ? landingRunResult
      : null;
  const liveResult = currentRunResult?.mode === "live" ? currentRunResult.result : null;
  const localRunComplete = currentRunResult?.mode === "local";
  const liveRunComplete = liveResult?.status === "succeeded";
  const landingRunComplete =
    (landingRunRecorded && !landingDraftDirty) ||
    localRunComplete ||
    liveRunComplete;
  const liveRunCanAdvance =
    !liveResult ||
    new Set(["accepted", "evaluating", "preparing", "review-required"]).has(
      liveResult.status,
    );
  const landingRunActionAvailable =
    activeStep === "result" &&
    landingDraftMutable &&
    !command.disabledReason &&
    !landingRunSubmitting &&
    (!landingRunComplete || landingDraftDirty) &&
    liveRunCanAdvance;
  const landingRecordActionVisible =
    activeStep === "result" &&
    record.landing.state !== "landed" &&
    currentRunResult?.mode !== "live" &&
    (!landingRunRecorded || landingDraftDirty);
  const landingRecordActionDisabled =
    !landingRunComplete || Boolean(command.disabledReason);
  const landingRunStatus = liveResult
    ? prototypeLandingLiveStatus(liveResult.status)
    : landingRunError
      ? { label: "Unavailable", tone: "warn" as const }
      : prototypeLandingRunStatus({
          landingBlocked,
          landingDraftDirty,
          landingRunComplete,
        });
  const landingRunActionStatus = liveResult
    ? {
        emphasis: "primary" as const,
        label:
          liveResult.status === "review-required"
            ? "Continue Landing"
            : liveRunComplete
              ? "Landing Complete"
              : "Continue Landing",
        tone: liveRunComplete ? ("ok" as const) : ("info" as const),
      }
    : prototypeLandingRunActionStatus(landingRunActionAvailable);
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
    runEvents:
      currentRunResult?.mode === "local" ? currentRunResult.run.events : undefined,
  });
  const visibleLandingLogRows = liveResult
    ? liveResult.history.map((event) => ({
        detail:
          event.details && typeof event.details.message === "string"
            ? event.details.message
            : prototypeLandingLiveEventDetail(event.status),
        formattedTimestamp: `event ${String(event.sequence).padStart(2, "0")}`,
        marker: prototypeLandingLiveEventMarker(event.status),
        timestamp: event.at,
        tone: prototypeLandingLiveStatus(event.status).tone,
      }))
    : landingRunError
      ? [
          ...landingRunLogRows,
          {
            detail: landingRunError,
            formattedTimestamp: "error",
            marker: "FAIL",
            timestamp: "",
            tone: "warn" as const,
          },
        ]
      : landingRunLogRows;

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
    setLandingRunError(null);
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
      landingRunResult.mode !== "local" ||
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
    setLandingRunError(null);
    try {
      const result = await onRunLanding({
        draft: activeLandingDraft,
        draftKey: activeLandingDraftKey,
        record: activeRecord,
      });
      setLandingRunResult(result);
    } catch (error) {
      setLandingRunError(
        error instanceof Error ? error.message : "Prototype Landing failed.",
      );
    } finally {
      setLandingRunSubmitting(false);
    }
  }

  async function cancelLanding() {
    if (!liveResult || landingRunSubmitting) return;
    setLandingRunSubmitting(true);
    setLandingRunError(null);
    try {
      const result = await onCancelLanding({
        draft: activeLandingDraft,
        draftKey: activeLandingDraftKey,
        record: activeRecord,
      });
      if (result) setLandingRunResult(result);
    } catch (error) {
      setLandingRunError(
        error instanceof Error ? error.message : "Prototype Landing cancellation failed.",
      );
    } finally {
      setLandingRunSubmitting(false);
    }
  }

  function updateLandingDraft<Field extends keyof PrototypeLandingDraft>(
    field: Field,
    value: PrototypeLandingDraft[Field],
  ) {
    setLandingRunResult(null);
    setLandingRunError(null);
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
        description="Review and apply the Prototype Studio landing shape before candidate, baseline, or movement work starts."
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
              landingRunLogRows={visibleLandingLogRows}
              landingRunStatus={landingRunStatus}
              onCancelLanding={
                liveResult && !new Set(["cancelled", "succeeded"]).has(liveResult.status)
                  ? cancelLanding
                  : undefined
              }
              onOpenReview={
                liveResult?.review?.url
                  ? () => openExternalConsoleRoute(liveResult.review?.url)
                  : undefined
              }
              onRunLanding={runLanding}
              runDescription={
                liveResult
                  ? "Continue the durable Landing run or review its source change before merged authority can be recorded."
                  : "Run the local landing setup before the footer can record the landing result."
              }
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
            liveResult={liveResult}
            record={record}
            setupItemsDraft={setupItemsDraft}
          />
        )}
      </TerasWizardModal>
      <TerasDraftCloseGuardDialog
        description="This Prototype Landing support draft has changes that are not recorded. Leaving now will discard those row edits."
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

function prototypeLandingLiveStatus(status: string) {
  switch (status) {
    case "succeeded":
      return { label: "Done", tone: "ok" as const };
    case "review-required":
      return { label: "Review Required", tone: "info" as const };
    case "rejected":
    case "requires-action":
      return { label: "Needs Action", tone: "warn" as const };
    case "cancelled":
    case "cancelling":
      return { label: "Cancelled", tone: "muted" as const };
    default:
      return { label: "Running", tone: "info" as const };
  }
}

function prototypeLandingLiveEventMarker(status: string) {
  switch (status) {
    case "succeeded":
      return "DONE";
    case "rejected":
    case "requires-action":
      return "FAIL";
    case "cancelled":
    case "cancelling":
      return "STOP";
    default:
      return "RUN";
  }
}

function prototypeLandingLiveEventDetail(status: string) {
  return {
    accepted: "OOS durably accepted the Landing request.",
    cancelled: "OOS retained the cancellation result.",
    cancelling: "OOS is reconciling the Landing cancellation.",
    evaluating: "WGCF is evaluating the accepted Landing artifacts.",
    preparing: "Prototype Studio source is being prepared for review.",
    rejected: "The Landing request was rejected without source mutation.",
    "requires-action": "Landing stopped on an authority finding.",
    "review-required": "The exact source change is ready for human review and merge.",
    succeeded: "Merged Prototype Studio authority and the terminal receipt agree.",
  }[status] ?? `Landing recorded ${status}.`;
}
