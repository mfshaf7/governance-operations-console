import type {
  DeliveryPackagePosture,
  DeliveryPackageSummary,
  DeliveryReadModel,
  DeliveryTone,
} from "../../read-model/index.ts";
import {
  getDeliveryIntakeSourceCount,
  getDeliveryEffectivePackagePosture,
  getDeliveryPackagesByWorkflowPhase,
  getExecutionBoardPackages,
} from "../../read-model/index.ts";

import type { DeliveryWorkspaceSurfaceId } from "./workspace-types.ts";
import { deliveryOverviewStats } from "./workspace-count-model.ts";

export type DeliveryWorkspaceSummaryCard = {
  id: string;
  label: string;
  tone: DeliveryTone;
  value: string;
};

export type DeliveryWorkspaceSummaryDescription = {
  description: string;
  kicker: string;
};

export function deliveryWorkspaceSummaryTitle(
  surfaceId: DeliveryWorkspaceSurfaceId,
) {
  switch (surfaceId) {
    case "execution-board":
      return "Board State";
    case "intake":
      return "Intake State";
    case "catalog":
      return "Delivery Catalog";
    case "refinement":
      return "Refinement State";
    case "work-design":
      return "Work Design State";
    case "home":
    default:
      return "Delivery State";
  }
}

export function deliveryWorkspaceSummaryDescription(
  surfaceId: DeliveryWorkspaceSurfaceId,
): DeliveryWorkspaceSummaryDescription | null {
  if (surfaceId !== "catalog") {
    return null;
  }

  return {
    description:
      "Backend-owned Delivery metadata: Target PI and planning dates, initiative family, lineage role, and architecture anchors. Review current values here and prepare add, edit, or retire requests through the owning route.",
    kicker: "Delivery Catalog",
  };
}

export function deliveryWorkspaceSummaryStats({
  activeSurfaceId,
  executionCount,
  model,
}: {
  activeSurfaceId: DeliveryWorkspaceSurfaceId;
  executionCount: number;
  model: DeliveryReadModel;
}): DeliveryWorkspaceSummaryCard[] {
  switch (activeSurfaceId) {
    case "intake":
      return intakeWorkspaceSummaryStats(model);
    case "work-design":
      return workflowWorkspaceSummaryStats("work_design", model);
    case "refinement":
      return refinementWorkspaceSummaryStats(model);
    case "execution-board":
      return executionWorkspaceSummaryStats(model);
    case "catalog":
      return catalogWorkspaceSummaryStats();
    case "home":
    default:
      return deliveryOverviewStats(model, executionCount);
  }
}

function intakeWorkspaceSummaryStats(
  model: DeliveryReadModel,
): DeliveryWorkspaceSummaryCard[] {
  const acceptedCount = getDeliveryIntakeSourceCount("needs_consume", model);
  const failedCount = getDeliveryIntakeSourceCount("consume_failed", model);
  const consumedCount = getDeliveryIntakeSourceCount("consumed", model);
  const sourceCount = model.intake_sources.length;

  return [
    {
      id: "accepted",
      label: "Accepted",
      tone: acceptedCount > 0 ? "warn" : "muted",
      value: String(acceptedCount),
    },
    {
      id: "failed",
      label: "Failed",
      tone: failedCount > 0 ? "danger" : "muted",
      value: String(failedCount),
    },
    {
      id: "sources",
      label: "Sources",
      tone: sourceCount > 0 ? "info" : "muted",
      value: String(sourceCount),
    },
    {
      id: "consumed",
      label: "Consumed",
      tone: consumedCount > 0 ? "ok" : "muted",
      value: String(consumedCount),
    },
  ];
}

function workflowWorkspaceSummaryStats(
  workflowPhase: "work_design",
  model: DeliveryReadModel,
): DeliveryWorkspaceSummaryCard[] {
  const packages = getDeliveryPackagesByWorkflowPhase(workflowPhase, model);
  const readyCount = countPackagesByEffectivePosture(packages, "Ready");
  const linkedCount = packages.filter(
    (deliveryPackage) =>
      deliveryPackage.backend_status === "done" &&
      deliveryPackage.package_posture === "Done" &&
      deliveryPackage.work_design_context_session?.decision === "attach",
  ).length;
  const doneCount = packages.filter(
    (deliveryPackage) =>
      effectivePackagePosture(deliveryPackage) === "Done" &&
      deliveryPackage.work_design_context_session?.decision !== "attach",
  ).length;
  const blockedCount = countPackagesByEffectivePosture(packages, "Blocked");
  const retiredCount = countPackagesByEffectivePosture(packages, "Retired");

  return [
    {
      id: "ready",
      label: "Ready",
      tone: readyCount > 0 ? "info" : "muted",
      value: String(readyCount),
    },
    {
      id: "done",
      label: "Done",
      tone: doneCount > 0 ? "ok" : "muted",
      value: String(doneCount),
    },
    {
      id: "linked",
      label: "Linked",
      tone: "muted",
      value: String(linkedCount),
    },
    {
      id: "blocked",
      label: "Blocked",
      tone: blockedCount > 0 ? "danger" : "muted",
      value: String(blockedCount),
    },
    {
      id: "retired",
      label: "Retired",
      tone: retiredCount > 0 ? "muted" : "muted",
      value: String(retiredCount),
    },
  ];
}

function refinementWorkspaceSummaryStats(
  model: DeliveryReadModel,
): DeliveryWorkspaceSummaryCard[] {
  const packages = getDeliveryPackagesByWorkflowPhase("refinement", model);
  const doneCount = countPackagesByEffectivePosture(packages, "Done");
  const readyCount = countPackagesByEffectivePosture(packages, "Ready");
  const blockedCount = countPackagesByEffectivePosture(packages, "Blocked");
  const deferredCount = countPackagesByEffectivePosture(packages, "Deferred");
  const retiredCount = countPackagesByEffectivePosture(packages, "Retired");

  const stats: DeliveryWorkspaceSummaryCard[] = [
    {
      id: "ready",
      label: "Ready",
      tone: readyCount > 0 ? "warn" : "muted",
      value: String(readyCount),
    },
    {
      id: "done",
      label: "Done",
      tone: doneCount > 0 ? "ok" : "muted",
      value: String(doneCount),
    },
    {
      id: "blocked",
      label: "Blocked",
      tone: blockedCount > 0 ? "danger" : "muted",
      value: String(blockedCount),
    },
  ];

  if (deferredCount > 0) {
    stats.push({
      id: "deferred",
      label: "Deferred",
      tone: "muted",
      value: String(deferredCount),
    });
  }

  if (retiredCount > 0) {
    stats.push({
      id: "retired",
      label: "Retired",
      tone: "muted",
      value: String(retiredCount),
    });
  }

  return stats;
}

function executionWorkspaceSummaryStats(
  model: DeliveryReadModel,
): DeliveryWorkspaceSummaryCard[] {
  const packages = getExecutionBoardPackages(model);
  const readyCount = countPackagesByEffectivePosture(packages, "Ready");
  const inProgressCount = countPackagesByEffectivePosture(
    packages,
    "In Progress",
  );
  const blockedCount = countPackagesByEffectivePosture(packages, "Blocked");
  const closeoutCount = countPackagesByEffectivePosture(
    packages,
    "Closeout Pending",
  );
  const doneCount = countPackagesByEffectivePosture(packages, "Done");

  return [
    {
      id: "ready",
      label: "Ready",
      tone: readyCount > 0 ? "info" : "muted",
      value: String(readyCount),
    },
    {
      id: "in-progress",
      label: "In Progress",
      tone: inProgressCount > 0 ? "ok" : "muted",
      value: String(inProgressCount),
    },
    {
      id: "blocked",
      label: "Blocked",
      tone: blockedCount > 0 ? "danger" : "muted",
      value: String(blockedCount),
    },
    {
      id: "closeout",
      label: "Closeout",
      tone: closeoutCount > 0 ? "warn" : "muted",
      value: String(closeoutCount),
    },
    {
      id: "done",
      label: "Done",
      tone: doneCount > 0 ? "ok" : "muted",
      value: String(doneCount),
    },
  ];
}

function catalogWorkspaceSummaryStats(): DeliveryWorkspaceSummaryCard[] {
  return [];
}

function countPackagesByEffectivePosture(
  packages: DeliveryPackageSummary[],
  posture: DeliveryPackagePosture,
) {
  return packages.filter(
    (deliveryPackage) => effectivePackagePosture(deliveryPackage) === posture,
  ).length;
}

function effectivePackagePosture(
  deliveryPackage: DeliveryPackageSummary,
): DeliveryPackagePosture {
  return getDeliveryEffectivePackagePosture(deliveryPackage);
}
