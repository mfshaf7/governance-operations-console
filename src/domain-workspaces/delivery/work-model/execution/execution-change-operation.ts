import type {
  DeliveryApplyIntent,
  DeliveryAvailableAction,
} from "../../domain/delivery-types.ts";
import type {
  DeliveryChangeOperation,
  DeliveryChangeResult,
} from "../../live-runtime/delivery-change-live-types.ts";
import type {
  ExecutionActionContract,
  ExecutionActionReceipt,
} from "./execution-action-contracts.ts";

export function deliveryChangeOperationForExecutionAction({
  action,
  applyIntent,
}: {
  action: DeliveryAvailableAction;
  applyIntent: DeliveryApplyIntent;
}): DeliveryChangeOperation | null {
  const workItemId = `work-item-${
    applyIntent.target_work_item_id ?? applyIntent.source_epic_id
  }`;
  const payload = applyIntent.operator_payload;

  switch (action.action_type) {
    case "clear-blocker":
      return {
        payload: {
          action: "clear",
          resume_status: payload.resume_status || null,
          work_item_id: workItemId,
        },
        type: "manage_blocker",
      };
    case "defer":
      return {
        payload: {
          action: "park",
          park_decision: payload.park_decision || "defer",
          park_reason: payload.park_reason || null,
          park_review_date: payload.park_review_date || null,
          work_item_id: workItemId,
          ...(payload.work_note ? { work_note: payload.work_note } : {}),
        },
        type: "manage_parking",
      };
    case "resume":
      return {
        payload: {
          action: "resume",
          resume_status: payload.resume_status || null,
          work_item_id: workItemId,
          ...(payload.work_note ? { work_note: payload.work_note } : {}),
        },
        type: "manage_parking",
      };
    case "continue-remaining-work":
      return {
        payload: {
          changes: { status: payload.status || "in-progress" },
          work_item_id: workItemId,
          ...(payload.work_note ? { work_note: payload.work_note } : {}),
        },
        type: "revise_work_item",
      };
    case "retire":
      return {
        payload: {
          retirement_reason:
            payload.retirement_reason || payload.work_note || "Retired after operator review.",
          work_item_id: workItemId,
          ...(payload.work_note ? { work_note: payload.work_note } : {}),
        },
        type: "remove_work_item",
      };
    default:
      return null;
  }
}

export function deliveryChangeAcceptanceNote(
  action: DeliveryAvailableAction,
  applyIntent: DeliveryApplyIntent,
) {
  return (
    applyIntent.operator_payload.work_note ||
    `${action.label} accepted from the Governance Operations Console.`
  );
}

export function executionActionReceiptFromDeliveryChange({
  action,
  actionContract,
  applyIntent,
  packageId,
  result,
}: {
  action: DeliveryAvailableAction;
  actionContract: ExecutionActionContract;
  applyIntent: DeliveryApplyIntent;
  packageId: string;
  result: DeliveryChangeResult;
}): ExecutionActionReceipt {
  return {
    actionLabel: action.label,
    actionType: action.action_type,
    appliedIntent: applyIntent,
    authority: "operator-orchestration-service",
    category: actionContract.receiptCategory,
    commandName: `delivery.execution.${action.action_type}`,
    packageId,
    projectionResult: result.next_action.label,
    recordedAt:
      typeof result.event.occurred_at === "string"
        ? result.event.occurred_at
        : new Date().toISOString(),
    receiptId: result.receipt.ref,
    resultState: "recorded",
    schemaVersion: 1,
    sourceRevision: result.after.source_revision,
    summary: `${action.label} ${result.status}; ${result.next_action.label}.`,
  };
}
