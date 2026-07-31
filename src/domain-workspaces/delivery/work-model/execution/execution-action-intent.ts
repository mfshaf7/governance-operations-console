import type {
  DeliveryApplyIntent,
  DeliveryArtNode,
  DeliveryAvailableAction,
  DeliveryPackageSummary,
} from "../../domain/delivery-types.ts";
import { getDeliveryEffectivePackagePosture } from "../../domain/delivery-package-posture.ts";

import type { ExecutionActionContract } from "./execution-action-contracts.ts";

export type ExecutionActionOperatorFieldSpec = {
  id: string;
  kind: "date" | "note" | "select";
  label: string;
  options?: Array<{ label: string; value: string }>;
  placeholder: string;
};

export function executionBoardApplyIntent({
  action,
  actionContract,
  model,
  packageSummary,
  packageTree,
  sourceRevision,
}: {
  action: DeliveryAvailableAction;
  actionContract: ExecutionActionContract;
  model: { apply_intents: DeliveryApplyIntent[] };
  packageSummary: DeliveryPackageSummary;
  packageTree: DeliveryArtNode | null;
  sourceRevision: string;
}): DeliveryApplyIntent {
  return (
    model.apply_intents.find(
      (intent) =>
        intent.action_type === action.action_type &&
        intent.delivery_package_id === packageSummary.delivery_package_id,
    ) ??
    buildFallbackActionIntent({
      action,
      actionContract,
      packageSummary,
      packageTree,
      sourceRevision,
    })
  );
}

export function executionActionOperatorFieldSpecs(
  action: DeliveryAvailableAction,
): ExecutionActionOperatorFieldSpec[] {
  switch (action.action_type) {
    case "continue-remaining-work":
    case "start-work":
      return [
        {
          id: "work_note",
          kind: "note",
          label: "Work note",
          placeholder: "Record why this work should move into progress.",
        },
      ];
    case "defer":
      return [
        {
          id: "park_reason",
          kind: "note",
          label: "Parking reason",
          placeholder: "Explain why this work should leave active focus.",
        },
        {
          id: "park_review_date",
          kind: "date",
          label: "Review date",
          placeholder: "Select a review date.",
        },
        {
          id: "work_note",
          kind: "note",
          label: "Work note",
          placeholder: "Record the retained context and expected resume path.",
        },
      ];
    case "clear-blocker":
      return [
        {
          id: "resume_status",
          kind: "select",
          label: "Resume posture",
          options: [
            { label: "Select resume posture", value: "" },
            { label: "Ready", value: "ready" },
            { label: "In progress", value: "in-progress" },
          ],
          placeholder: "Select resume posture.",
        },
      ];
    case "resume":
      return [
        {
          id: "resume_status",
          kind: "select",
          label: "Resume posture",
          options: [
            { label: "Select resume posture", value: "" },
            { label: "Ready", value: "ready" },
            { label: "In progress", value: "in-progress" },
          ],
          placeholder: "Select resume posture.",
        },
        {
          id: "work_note",
          kind: "note",
          label: "Resume note",
          placeholder: "Record why this work should return to active focus.",
        },
      ];
    default:
      return [];
  }
}

export function executionActionInitialOperatorPayload({
  action,
  applyIntent,
}: {
  action: DeliveryAvailableAction;
  applyIntent: DeliveryApplyIntent;
}) {
  const operatorPayload = { ...applyIntent.operator_payload };

  for (const field of executionActionOperatorFieldSpecs(action)) {
    operatorPayload[field.id] = "";
  }

  switch (action.action_type) {
    case "clear-blocker":
      operatorPayload.action = "clear";
      break;
    case "continue-remaining-work":
    case "start-work":
      operatorPayload.status = "in-progress";
      break;
    case "defer":
      operatorPayload.action = "park";
      operatorPayload.park_decision = "defer";
      break;
    case "resume":
      operatorPayload.action = "resume";
      break;
    default:
      break;
  }

  return operatorPayload;
}

export function executionActionIntentWithOperatorPayload({
  applyIntent,
  operatorPayload,
}: {
  applyIntent: DeliveryApplyIntent;
  operatorPayload: Record<string, string>;
}): DeliveryApplyIntent {
  return {
    ...applyIntent,
    operator_payload: { ...operatorPayload },
  };
}

function buildFallbackActionIntent({
  action,
  actionContract,
  packageSummary,
  packageTree,
  sourceRevision,
}: {
  action: DeliveryAvailableAction;
  actionContract: ExecutionActionContract;
  packageSummary: DeliveryPackageSummary;
  packageTree: DeliveryArtNode | null;
  sourceRevision: string;
}): DeliveryApplyIntent {
  return {
    action_type: action.action_type,
    artifacts: [],
    advisor_reason:
      "No package-scoped action intent fixture is projected yet; this fallback keeps the route, target, and gate contract visible.",
    current_backend_status: packageSummary.backend_status,
    current_package_posture: getDeliveryEffectivePackagePosture(packageSummary),
    delivery_package_id: packageSummary.delivery_package_id,
    dirty_state: packageSummary.tone === "stale" ? "stale" : "clean",
    expected_backend_route: action.expected_backend_route,
    gate_checks: [
      {
        label: "Action target explicit",
        passed: Boolean(
          packageTree || action.scope === "package_with_children",
        ),
        tone:
          packageTree || action.scope === "package_with_children"
            ? "ok"
            : "warn",
      },
      {
        label: "Source revision checked",
        passed: packageSummary.tone !== "stale",
        tone: packageSummary.tone === "stale" ? "stale" : "ok",
      },
      {
        label: "Operator review required",
        passed: true,
        tone: actionContract.family === "blocker" ? "warn" : "ok",
      },
    ],
    intent_id: `intent-fallback-${packageSummary.delivery_package_id}-${action.action_type}`,
    operator_payload: executionFallbackOperatorPayload(action),
    receipt_category: actionContract.receiptCategory,
    required_payload_fields: executionFallbackRequiredPayloadFields(action),
    scope: action.scope,
    source_epic_id: packageSummary.legacy_epic_id,
    source_revision: sourceRevision,
    target_display_name:
      action.scope === "execution_target" && packageTree
        ? `${packageTree.component_type} #${packageTree.legacy_work_package_id ?? packageSummary.legacy_epic_id} - ${packageTree.title}`
        : `${packageSummary.source_ref} / ${packageSummary.display_name}`,
    target_id:
      action.scope === "execution_target" && packageTree
        ? packageTree.id
        : packageSummary.delivery_package_id,
    target_type:
      action.scope === "execution_target" && packageTree
        ? packageTree.component_type
        : "Epic",
  };
}

function executionFallbackOperatorPayload(
  action: DeliveryAvailableAction,
): Record<string, string> {
  switch (action.action_type) {
    case "clear-blocker":
      return {
        action: "clear",
        resume_status: "",
      };
    case "continue-remaining-work":
    case "start-work":
      return {
        status: "in-progress",
        work_note: "",
      };
    case "defer":
      return {
        action: "park",
        park_decision: "defer",
        park_reason: "",
        park_review_date: "",
        work_note: "",
      };
    case "resume":
      return {
        action: "resume",
        resume_status: "",
        work_note: "",
      };
    default:
      return {};
  }
}

function executionFallbackRequiredPayloadFields(
  action: DeliveryAvailableAction,
) {
  if (!action.expected_backend_route) {
    return [];
  }

  switch (action.action_type) {
    case "clear-blocker":
      return ["action", "resume_status"];
    case "continue-remaining-work":
    case "start-work":
      return ["status", "work_note"];
    case "defer":
      return [
        "action",
        "park_decision",
        "park_reason",
        "park_review_date",
        "work_note",
      ];
    case "resume":
      return ["action", "resume_status", "work_note"];
    default:
      return [];
  }
}
