"use client";

import { TerasPanel, TerasPanelHeader, TerasProgressStepList } from "@/teras";
import type {
  DeliveryRefinementApplyReceipt,
  DeliveryRefinementPacket,
  DeliveryRefinementStepId,
  DeliveryTone,
} from "../../../../read-model/index.ts";

import {
  refinementProgressRoutes,
  refinementStepStateLabel,
  refinementStepTone,
} from "../view-model/refinement-step-model.ts";
import { refinementProgressPanelProjection } from "../view-model/refinement-shell-view-model.ts";
import type { DeliveryRefinementModalStep } from "../model/refinement-model.ts";

export function RefinementProgressPanel({
  applyInFlight,
  readOnly = false,
  activeReceipt,
  activeStep,
  currentMove,
  onSelectStep,
  packet,
  progressActiveStep,
  refinementBlocked,
}: {
  applyInFlight: boolean;
  readOnly?: boolean;
  activeReceipt: DeliveryRefinementApplyReceipt | null;
  activeStep: DeliveryRefinementModalStep;
  currentMove: {
    description: string;
    title: string;
    tone: DeliveryTone;
  };
  onSelectStep: (step: DeliveryRefinementModalStep) => void;
  packet: DeliveryRefinementPacket | null;
  progressActiveStep: DeliveryRefinementStepId;
  refinementBlocked: boolean;
}) {
  const panelProjection = refinementProgressPanelProjection({
    activeReceipt,
    activeStep,
    currentMove,
    packet,
    progressActiveStep,
    refinementBlocked,
  });

  return (
    <TerasPanel frame="padded" treatment="rail" tone={panelProjection.tone}>
      <TerasPanelHeader
        kicker={panelProjection.kicker}
        statusLabel={applyInFlight ? "processing" : panelProjection.statusLabel}
        statusTone={applyInFlight ? "info" : panelProjection.statusTone}
        title={applyInFlight ? "Applying reviewed metadata…" : panelProjection.title}
        description={applyInFlight ? "Waiting for the backend run and canonical receipt. This does not start execution work." : panelProjection.description}
      />
      <TerasProgressStepList
        activeStepId={activeStep}
        columns={4}
        offset="normal"
        onSelectStep={onSelectStep}
        steps={refinementProgressRoutes.map((step, index) => {
          const available = !applyInFlight && (readOnly || step.archive || !refinementBlocked);
          const nextStep = refinementProgressRoutes[index + 1];
          const tone =
            refinementBlocked && !step.archive
              ? "muted"
              : step.archive
                ? "info"
                : !packet ? "muted" : refinementStepTone({
                    applyRecorded: Boolean(activeReceipt),
                    activeStep: progressActiveStep,
                    candidateStep: step.id,
                    packet,
                  });

          return {
            available,
            connectsToNext: nextStep ? !nextStep.archive : false,
            detail: applyInFlight && step.id === "apply_refinement" ? "processing" : refinementBlocked && !step.archive ? "locked" : step.detail,
            id: step.id,
            label: step.label,
            stateLabel:
              applyInFlight && step.id === "apply_refinement" ? "Processing" : refinementBlocked && !step.archive
                ? "Locked"
                : step.archive
                  ? "Archive"
                  : !packet ? "Unavailable" : refinementStepStateLabel({
                      applyRecorded: Boolean(activeReceipt),
                      activeStep: progressActiveStep,
                      candidateStep: step.id,
                      packet,
                    }),
            tone,
          };
        })}
      />
    </TerasPanel>
  );
}
