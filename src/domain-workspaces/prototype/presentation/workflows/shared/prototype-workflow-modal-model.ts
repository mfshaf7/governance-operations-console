import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import { prototypeIngressLabel } from "../../shared/prototype-record-display-model.ts";

export type PrototypeWorkflowGuardIntent = "back" | "close";

type PrototypeWorkflowStepLike<TStepId extends string> = {
  id: TStepId;
};

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
