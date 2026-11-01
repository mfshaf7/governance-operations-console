import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import { prototypeIngressLabel } from "../../shared/prototype-record-display-model.ts";

export type PrototypeWorkflowGuardIntent = "back" | "close";

type PrototypeWorkflowStepLike<TStepId extends string> = {
  id: TStepId;
};

// Step badges describe navigation only. Workflow eligibility and draft readiness
// are shown by their own status panels, not inferred from the source's next move.
export function prototypeWorkflowNavigationSteps<T extends { id: string }>(
  steps: T[], activeStep: string,
) {
  return steps.map((step) => ({
    ...step,
    stateLabel: step.id === activeStep ? "Current" : "Open",
    tone: step.id === activeStep ? "info" as const : "muted" as const,
  }));
}

export function prototypeWorkflowStepNavigation<TStepId extends string>(
  steps: readonly PrototypeWorkflowStepLike<TStepId>[],
  activeStep: TStepId,
) {
  const activeStepIndex = steps.findIndex((step) => step.id === activeStep);

  return {
    nextStep: steps[activeStepIndex + 1],
    previousStep: steps[activeStepIndex - 1],
  };
}

export function prototypeWorkflowSubject(
  record: PrototypeRecord,
  title = record.name,
) {
  return {
    detail: `${record.id} / ${prototypeIngressLabel(record.ingress)}`,
    eyebrow: "Selected Prototype",
    title,
  };
}

export function prototypeWorkflowRecordCanEdit({
  disabledReason,
  record,
}: {
  disabledReason?: string | null;
  record: PrototypeRecord;
}) {
  return (
    !disabledReason &&
    record.lifecycle !== "retired" &&
    record.lifecycle !== "graduated"
  );
}
