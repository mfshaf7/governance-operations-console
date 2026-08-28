import type { TerasMetadataItem } from "@/teras";

import type {
  DeliveryApplyIntent,
  DeliveryAvailableAction,
  DeliveryPackageSummary,
} from "../../../../read-model/index.ts";
import type {
  ExecutionActionContract,
  ExecutionActionReceipt,
} from "../../../../work-model/execution/execution-action-contracts.ts";

export function executionActionDraftMetadata({
  action,
  actionContract,
  applyIntent,
  packageSummary,
}: {
  action: DeliveryAvailableAction;
  actionContract: ExecutionActionContract;
  applyIntent: DeliveryApplyIntent;
  packageSummary: DeliveryPackageSummary;
}): TerasMetadataItem[] {
  return [
    {
      label: "Package",
      value: `${packageSummary.source_ref} / ${packageSummary.display_name}`,
    },
    { label: "Decision", value: action.reason },
    { label: "Scope", value: applyIntent.scope.replaceAll("_", " ") },
    {
      label: "Route",
      value: applyIntent.expected_backend_route ?? "Read-only inspection",
    },
    { label: "Target", value: applyIntent.target_display_name },
    {
      label: "Expected State",
      value: executionActionExpectedResult({ actionContract, applyIntent }),
    },
    { label: "Source Revision", value: applyIntent.source_revision },
  ];
}

export function executionActionApplyMetadata({
  actionContract,
  applyIntent,
}: {
  actionContract: ExecutionActionContract;
  applyIntent: DeliveryApplyIntent;
}): TerasMetadataItem[] {
  return [
    { label: "Target", value: applyIntent.target_display_name },
    {
      label: "Backend Route",
      value: applyIntent.expected_backend_route ?? "Not mutable",
    },
    {
      label: "Current State",
      value: `${applyIntent.current_package_posture} / ${applyIntent.current_backend_status}`,
    },
    { label: "Dirty State", value: applyIntent.dirty_state },
    {
      label: "Expected Result",
      value: executionActionExpectedResult({ actionContract, applyIntent }),
    },
    {
      label: "Payload Fields",
      value:
        applyIntent.required_payload_fields.length > 0
          ? applyIntent.required_payload_fields.join(", ")
          : "None",
    },
    {
      label: "Evidence Artifacts",
      value:
        applyIntent.artifacts.length > 0
          ? applyIntent.artifacts.join(", ")
          : "None",
    },
    {
      label: "Receipt Outcome",
      value: applyIntent.receipt_category ?? actionContract.receiptCategory,
    },
  ];
}

export function executionActionReceiptMetadata({
  action,
  actionContract,
  applyIntent,
  packageSummary,
  receipt,
}: {
  action: DeliveryAvailableAction;
  actionContract: ExecutionActionContract;
  applyIntent: DeliveryApplyIntent;
  packageSummary: DeliveryPackageSummary;
  receipt: ExecutionActionReceipt | null;
}): TerasMetadataItem[] {
  return [
    { label: "Receipt", value: receipt?.receiptId ?? "Not recorded" },
    {
      label: "Receipt Category",
      value: applyIntent.receipt_category ?? actionContract.receiptCategory,
    },
    { label: "Package", value: packageSummary.source_ref },
    { label: "Action", value: action.label },
    { label: "Authority", value: receipt?.authority ?? "Not recorded" },
    { label: "Recorded At", value: receipt?.recordedAt ?? "Not recorded" },
    {
      label: "Projection Result",
      value: receipt?.projectionResult ?? actionContract.receiptProjection,
    },
  ];
}

function executionActionExpectedResult({
  actionContract,
  applyIntent,
}: {
  actionContract: ExecutionActionContract;
  applyIntent: DeliveryApplyIntent;
}) {
  const payload = applyIntent.operator_payload;

  if (payload.status) {
    return payload.status;
  }

  if (payload.resume_status) {
    return payload.resume_status;
  }

  if (payload.park_decision) {
    return `park: ${payload.park_decision}`;
  }

  if (payload.target_status) {
    return payload.target_status;
  }

  return actionContract.receiptProjection;
}
