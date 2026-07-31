"use client";

import {
  TerasPanel,
  TerasPanelHeader,
  TerasProgressStepList,
  type TerasTone,
} from "@/teras";

import type { ProposalWorkflowNavigationTarget } from "../../../work-model/proposal-workflow-navigation.ts";
import type { ProposalWorkflowStepProjection } from "../../../work-model/proposal-workflow-step-model.ts";

export function ProposalWorkflowProgressPanel({
  description,
  onSelectStep,
  statusLabel,
  statusTone,
  steps,
  title,
}: {
  description: string;
  onSelectStep: (step: ProposalWorkflowNavigationTarget) => void;
  statusLabel: string;
  statusTone: TerasTone;
  steps: ProposalWorkflowStepProjection[];
  title: string;
}) {
  const historyActive = steps.some(
    (step) => step.id === "history" && step.current,
  );

  return (
    <TerasPanel frame="padded" treatment="rail" tone="info">
      <TerasPanelHeader
        description={description}
        kicker={historyActive ? "Receipt Archive" : "Current Required Move"}
        statusLabel={statusLabel}
        statusTone={statusTone}
        title={title}
      />
      <TerasProgressStepList
        activeStepId={steps.find((step) => step.current)?.id ?? steps[0]?.id}
        columns={4}
        offset="normal"
        onSelectStep={onSelectStep}
        steps={steps}
      />
    </TerasPanel>
  );
}
