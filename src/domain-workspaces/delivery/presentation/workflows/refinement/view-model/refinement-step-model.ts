import type {
  DeliveryRefinementPacket,
  DeliveryRefinementStepId,
  DeliveryTone,
} from "../../../../read-model/index.ts";

export const refinementSteps: Array<{
  detail: string;
  id: DeliveryRefinementStepId;
  label: string;
}> = [
  {
    detail: "metadata",
    id: "metadata_draft",
    label: "Metadata Workbench",
  },
  {
    detail: "gates",
    id: "readiness_review",
    label: "Readiness Review",
  },
  {
    detail: "OOS apply",
    id: "apply_refinement",
    label: "Apply Refinement",
  },
];

export type RefinementProgressRoute =
  | {
      archive: false;
      detail: string;
      id: DeliveryRefinementStepId;
      label: string;
    }
  | {
      archive: true;
      detail: string;
      id: "receipt";
      label: string;
    };

export const refinementProgressRoutes: RefinementProgressRoute[] = [
  ...refinementSteps.map((step) => ({
    ...step,
    archive: false as const,
  })),
  {
    archive: true,
    detail: "archive",
    id: "receipt",
    label: "History",
  },
];

export function refinementStepIndex(step: DeliveryRefinementStepId) {
  return refinementSteps.findIndex((item) => item.id === step);
}

export function refinementStepStateLabel({
  applyRecorded = false,
  activeStep,
  candidateStep,
  packet,
}: {
  applyRecorded?: boolean;
  activeStep: DeliveryRefinementStepId;
  candidateStep: DeliveryRefinementStepId;
  packet: DeliveryRefinementPacket;
}) {
  if (applyRecorded || packet.receipt || packet.status === "applied") {
    return "Done";
  }

  if (packet.status === "blocked" || packet.status === "stale") {
    return "Locked";
  }

  if (candidateStep === activeStep) {
    return "Current";
  }

  if (refinementStepIndex(candidateStep) < refinementStepIndex(activeStep)) {
    return "Done";
  }

  return "Next";
}

export function refinementStepTone({
  applyRecorded = false,
  activeStep,
  candidateStep,
  packet,
}: {
  applyRecorded?: boolean;
  activeStep: DeliveryRefinementStepId;
  candidateStep: DeliveryRefinementStepId;
  packet: DeliveryRefinementPacket;
}): DeliveryTone {
  const stateLabel = refinementStepStateLabel({
    applyRecorded,
    activeStep,
    candidateStep,
    packet,
  });

  if (stateLabel === "Done") {
    return "ok";
  }

  if (packet.status === "blocked") {
    return candidateStep === "readiness_review" ? "danger" : "muted";
  }

  if (packet.status === "stale") {
    return "muted";
  }

  return candidateStep === activeStep ? "warn" : "muted";
}
