"use client";

import type { WorkDesignCurrentMove } from "../view-model/work-design-current-move.ts";
import { workDesignProgressPanelProjection } from "../view-model/work-design-shell-view-model.ts";
import {
  type WorkDesignProgressStep,
  workDesignStepTone,
  workDesignStepStatusLabel,
} from "../view-model/work-design-step-model.ts";
import type {
  WorkDesignContextDecision,
  WorkDesignStep,
} from "../model/work-design-model.ts";
import { TerasPanelHeader, TerasPanel, TerasProgressStepList } from "@/teras";

type WorkDesignProgressStepItem = {
  id: WorkDesignStep;
  label: string;
  summary: string;
};

type WorkDesignProgressPanelProps = {
  activeStep: WorkDesignStep;
  applyReceiptRecorded: boolean;
  contextBriefAccepted: boolean;
  contextDecision: WorkDesignContextDecision;
  currentMove: WorkDesignCurrentMove;
  draftTreePresent: boolean;
  onSelectStep: (step: WorkDesignStep) => void;
  progressActiveStep: WorkDesignProgressStep;
  draftReviewAccepted: boolean;
  reviewReady: boolean;
  sourceWorkDesignClosed: boolean;
  draftValidationAccepted: boolean;
  workDesignBlocked: boolean;
  workDesignSteps: WorkDesignProgressStepItem[];
};

export function WorkDesignProgressPanel({
  activeStep,
  applyReceiptRecorded,
  contextBriefAccepted,
  contextDecision,
  currentMove,
  draftTreePresent,
  onSelectStep,
  progressActiveStep,
  draftReviewAccepted,
  reviewReady,
  sourceWorkDesignClosed,
  draftValidationAccepted,
  workDesignBlocked,
  workDesignSteps,
}: WorkDesignProgressPanelProps) {
  const panelProjection = workDesignProgressPanelProjection({
    activeStep,
    applyReceiptRecorded,
    contextDecision,
    currentMove,
    sourceWorkDesignClosed,
    workDesignBlocked,
  });

  return (
    <TerasPanel frame="padded" treatment="rail" tone={panelProjection.tone}>
      <TerasPanelHeader
        kicker={panelProjection.kicker}
        statusLabel={panelProjection.statusLabel}
        statusTone={panelProjection.statusTone}
        title={panelProjection.title}
        description={panelProjection.description}
      />
      <TerasProgressStepList
        activeStepId={activeStep}
        columns={5}
        offset="normal"
        onSelectStep={onSelectStep}
        steps={workDesignSteps.map((item, index) => {
          const nextStep = workDesignSteps[index + 1];
          const archiveStep = item.id === "history";
          const available = archiveStep || !workDesignBlocked;
          const stepTone =
            workDesignBlocked && !archiveStep
              ? "muted"
              : workDesignStepTone(item.id, {
                  applyReceiptRecorded,
                  contextBriefAccepted,
                  contextDecision,
                  draftTreePresent,
                  reviewReady,
                  draftReviewAccepted,
                  draftValidationAccepted,
                  sourceWorkDesignClosed,
                });
          const stepStateLabel =
            workDesignBlocked && !archiveStep
              ? "Locked"
              : archiveStep
                ? "Archive"
                : panelProjection.sourceTerminalComplete
                  ? item.id === "context"
                    ? "Done"
                    : "Not Required"
                  : item.id === progressActiveStep
                    ? stepTone === "ok"
                      ? "Done"
                      : "Current"
                    : stepTone === "ok"
                      ? "Done"
                      : available
                        ? "Next"
                        : "Locked";

          return {
            available,
            connectsToNext: nextStep ? nextStep.id !== "history" : false,
            detail:
              workDesignBlocked && !archiveStep
                ? "locked"
                : workDesignStepStatusLabel(item.id, {
                    applyReceiptRecorded,
                    contextBriefAccepted,
                    contextDecision,
                    draftTreePresent,
                    reviewReady,
                    draftReviewAccepted,
                    draftValidationAccepted,
                    sourceWorkDesignClosed,
                  }),
            id: item.id,
            label: item.label,
            stateLabel: stepStateLabel,
            tone: stepTone,
          };
        })}
      />
    </TerasPanel>
  );
}
