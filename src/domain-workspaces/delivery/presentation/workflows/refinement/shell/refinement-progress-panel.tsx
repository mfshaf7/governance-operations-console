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
  activeReceipt,
  activeStep,
  currentMove,
  onSelectStep,
  packet,
  progressActiveStep,
  refinementBlocked,
}: {
  activeReceipt: DeliveryRefinementApplyReceipt | null;
  activeStep: DeliveryRefinementModalStep;
  currentMove: {
    description: string;
    title: string;
    tone: DeliveryTone;
  };
  onSelectStep: (step: DeliveryRefinementModalStep) => void;
  packet: DeliveryRefinementPacket;
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
        statusLabel={panelProjection.statusLabel}
        statusTone={panelProjection.statusTone}
        title={panelProjection.title}
        description={panelProjection.description}
      />
      <TerasProgressStepList
        activeStepId={activeStep}
        columns={4}
        offset="normal"
        onSelectStep={onSelectStep}
        steps={refinementProgressRoutes.map((step, index) => {
          const available = step.archive || !refinementBlocked;
          const nextStep = refinementProgressRoutes[index + 1];
          const tone =
            refinementBlocked && !step.archive
              ? "muted"
              : step.archive
                ? "info"
                : refinementStepTone({
                    applyRecorded: Boolean(activeReceipt),
                    activeStep: progressActiveStep,
                    candidateStep: step.id,
                    packet,
                  });

          return {
            available,
            connectsToNext: nextStep ? !nextStep.archive : false,
            detail: refinementBlocked && !step.archive ? "locked" : step.detail,
            id: step.id,
            label: step.label,
            stateLabel:
              refinementBlocked && !step.archive
                ? "Locked"
                : step.archive
                  ? "Archive"
                  : refinementStepStateLabel({
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
