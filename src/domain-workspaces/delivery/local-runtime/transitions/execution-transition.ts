import type {
  DeliveryActionType,
  DeliveryPackagePosture,
  DeliveryReadModel,
  DeliveryTone,
} from "../../read-model/index.ts";
import type { LocalExecutionActionRecord } from "./transition-record.ts";
import { deliveryPackageSourceVersion } from "./transition-record.ts";

export function applyLocalExecutionActions(
  model: DeliveryReadModel,
  recordsByPackage: Record<string, LocalExecutionActionRecord>,
): DeliveryReadModel {
  if (Object.keys(recordsByPackage).length === 0) {
    return model;
  }

  return {
    ...model,
    packages: model.packages.map((deliveryPackage) => {
      const record = recordsByPackage[deliveryPackage.delivery_package_id];

      if (
        !record ||
        deliveryPackage.workflow_phase !== "execution" ||
        record.sourceRecordVersion !==
          deliveryPackageSourceVersion(deliveryPackage)
      ) {
        return deliveryPackage;
      }

      return {
        ...deliveryPackage,
        local_workflow_projection: {
          authority: "prototype-local",
          receipt_id: record.receiptId,
          recorded_at: record.recordedAt,
          status_label: record.statusLabel,
          summary: record.summary,
          tone: record.tone,
          workflow_phase: "execution",
        },
      };
    }),
  };
}

export function deliveryExecutionActionPosture(
  actionType: DeliveryActionType,
  currentPosture: DeliveryPackagePosture,
): { statusLabel: DeliveryPackagePosture; tone: DeliveryTone } {
  switch (actionType) {
    case "block":
      return { statusLabel: "Blocked", tone: "danger" };
    case "defer":
      return { statusLabel: "Deferred", tone: "warn" };
    case "open-closeout":
      return { statusLabel: "Closeout Pending", tone: "warn" };
    case "retire":
      return { statusLabel: "Retired", tone: "muted" };
    case "clear-blocker":
    case "continue-remaining-work":
    case "edit-work-tree":
    case "resume":
    case "start-work":
    case "sync-owner-repo":
      return { statusLabel: "In Progress", tone: "info" };
    case "ask-advisor":
    case "open-audit-trail":
    case "open-details":
    case "view-art-tree":
      return {
        statusLabel: currentPosture,
        tone: toneForPosture(currentPosture),
      };
  }
}

function toneForPosture(posture: DeliveryPackagePosture): DeliveryTone {
  switch (posture) {
    case "Blocked":
      return "danger";
    case "Closeout Pending":
    case "Deferred":
      return "warn";
    case "Done":
      return "ok";
    case "In Progress":
    case "Ready":
      return "info";
    case "Retired":
      return "muted";
  }
}
