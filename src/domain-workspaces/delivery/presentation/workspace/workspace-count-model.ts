import type {
  DeliveryPackageSummary,
  DeliveryReadModel,
  DeliveryTone,
} from "../../read-model/index.ts";
import {
  getDeliveryEffectivePackagePosture,
  getDeliveryWorkflowPhaseCount,
} from "../../read-model/index.ts";

import type { DeliveryWorkspaceSurfaceId } from "./workspace-types.ts";

export function getOpenIntakeSourceCount(model: DeliveryReadModel) {
  return model.intake_sources.filter(
    (source) => source.intake_status !== "consumed",
  ).length;
}

export function deliverySurfaceItemCount({
  executionCount,
  model,
  surfaceId,
}: {
  executionCount: number;
  model: DeliveryReadModel;
  surfaceId: DeliveryWorkspaceSurfaceId;
}) {
  switch (surfaceId) {
    case "home":
      return (
        getOpenIntakeSourceCount(model) +
        getDeliveryWorkflowPhaseCount("work_design", model) +
        getDeliveryWorkflowPhaseCount("refinement", model) +
        executionCount
      );
    case "execution-board":
      return executionCount;
    case "intake":
      return getOpenIntakeSourceCount(model);
    case "work-design":
      return getDeliveryWorkflowPhaseCount("work_design", model);
    case "refinement":
      return getDeliveryWorkflowPhaseCount("refinement", model);
    case "catalog":
      return 0;
  }
}

export function deliveryOverviewStats(
  model: DeliveryReadModel,
  executionCount: number,
): Array<{ id: string; label: string; tone: DeliveryTone; value: string }> {
  const blockedSignalCount = getDeliveryBlockedSignalCount(model);

  return [
    {
      id: "intake",
      label: "Intake",
      tone: getOpenIntakeSourceCount(model) > 0 ? "warn" : "muted",
      value: String(getOpenIntakeSourceCount(model)),
    },
    {
      id: "design",
      label: "Design",
      tone:
        getDeliveryWorkflowPhaseCount("work_design", model) > 0
          ? "info"
          : "muted",
      value: String(getDeliveryWorkflowPhaseCount("work_design", model)),
    },
    {
      id: "refinement",
      label: "Refinement",
      tone:
        getDeliveryWorkflowPhaseCount("refinement", model) > 0
          ? "warn"
          : "muted",
      value: String(getDeliveryWorkflowPhaseCount("refinement", model)),
    },
    {
      id: "execution",
      label: "Execution",
      tone: executionCount > 0 ? "info" : "muted",
      value: String(executionCount),
    },
    {
      id: "blocked",
      label: "Blocked",
      tone: blockedSignalCount > 0 ? "danger" : "muted",
      value: String(blockedSignalCount),
    },
  ];
}

function getDeliveryBlockedSignalCount(model: DeliveryReadModel) {
  const failedIntakeSourceRefs = new Set(
    model.intake_sources
      .filter((source) => source.intake_status === "consume_failed")
      .map((source) => source.source_ref),
  );
  const blockedPackageCount = model.packages.filter((deliveryPackage) => {
    if (effectivePackagePosture(deliveryPackage) !== "Blocked") {
      return false;
    }

    if (deliveryPackage.workflow_phase !== "intake") {
      return true;
    }

    const sourceSourceRef = intakeSourceRefForPackage(deliveryPackage);

    return !sourceSourceRef || !failedIntakeSourceRefs.has(sourceSourceRef);
  }).length;

  return failedIntakeSourceRefs.size + blockedPackageCount;
}

function effectivePackagePosture(deliveryPackage: DeliveryPackageSummary) {
  return getDeliveryEffectivePackagePosture(deliveryPackage);
}

function intakeSourceRefForPackage(deliveryPackage: DeliveryPackageSummary) {
  return deliveryPackage.source_ref.replace(/^Proposal\s+/, "");
}
