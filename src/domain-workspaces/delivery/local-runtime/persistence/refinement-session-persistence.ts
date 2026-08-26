import { createBrowserOperationDraftStore } from "../../../operation-runtime/index.ts";

import type {
  DeliveryRefinementApplyPlan,
  DeliveryRefinementApplyReceipt,
  DeliveryTone,
} from "../../read-model/index.ts";

import type {
  DeliveryRefinementModalStep,
  RefinementMetadataFieldResolution,
  RefinementMetadataFieldResolutionMap,
  RefinementMetadataSelectionMode,
  RefinementPersistedSession,
  RefinementSessionMetadataDraft,
} from "../../work-model/refinement/refinement-types.ts";

const refinementDraftStore = createBrowserOperationDraftStore();

export function refinementSessionPersistenceKey(packageId: string) {
  return `delivery-refinement-session:${packageId}:v1`;
}

export function loadRefinementSessionDraft(
  packageId: string,
): RefinementPersistedSession | null {
  return refinementDraftStore.readJson(
    refinementSessionPersistenceKey(packageId),
    (value) => normalizeRefinementPersistedSession(value, packageId),
  );
}

export function saveRefinementSessionDraft(
  packageId: string,
  session: RefinementPersistedSession,
) {
  refinementDraftStore.writeJson(
    refinementSessionPersistenceKey(packageId),
    session,
  );
}

export function normalizeRefinementPersistedSession(
  value: unknown,
  packageId: string,
): RefinementPersistedSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<RefinementPersistedSession>;
  const activeStep = normalizeRefinementModalStep(candidate.activeStep);
  const receipt = normalizeRefinementApplyReceipt(candidate.apply?.receipt);
  const metadata = normalizeRefinementSessionMetadata(candidate.metadata);

  if (
    candidate.schemaVersion !== 1 ||
    candidate.packageId !== packageId ||
    !activeStep ||
    !metadata ||
    typeof candidate.lastSavedAt !== "string" ||
    typeof candidate.packetId !== "string" ||
    typeof candidate.refinementSessionId !== "string"
  ) {
    return null;
  }

  return {
    activeStep,
    apply: {
      receipt,
    },
    lastSavedAt: candidate.lastSavedAt,
    metadata,
    packageId,
    packetId: candidate.packetId,
    packetRevision:
      typeof candidate.packetRevision === "string"
        ? candidate.packetRevision
        : undefined,
    refinementSessionId: candidate.refinementSessionId,
    schemaVersion: 1,
  };
}

export function refinementSessionHasUnappliedChanges({
  draftValues,
  fieldResolutions,
  initialDraftValues,
  receipt,
}: {
  draftValues: Record<string, string>;
  fieldResolutions: RefinementMetadataFieldResolutionMap;
  initialDraftValues: Record<string, string>;
  receipt: DeliveryRefinementApplyReceipt | null;
}) {
  if (receipt) {
    return false;
  }

  const hasChangedDraft = Object.entries(draftValues).some(
    ([key, value]) => value !== initialDraftValues[key],
  );
  if (hasChangedDraft) {
    return true;
  }

  return Object.keys(fieldResolutions).length > 0;
}

function normalizeRefinementModalStep(
  value: unknown,
): DeliveryRefinementModalStep | null {
  if (
    value === "hub" ||
    value === "metadata_draft" ||
    value === "readiness_review" ||
    value === "apply_refinement" ||
    value === "receipt"
  ) {
    return value;
  }

  return null;
}

function normalizeRefinementApplyReceipt(
  value: unknown,
): DeliveryRefinementApplyReceipt | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DeliveryRefinementApplyReceipt>;
  const tone = normalizeRefinementTone(candidate.tone);
  const appliedPayload = candidate.applied_payload;
  const applyPlan = normalizeRefinementApplyPlan(appliedPayload?.apply_plan);
  const metadataResolutions = normalizeRefinementFieldResolutionMap(
    appliedPayload?.metadata_resolutions,
  );
  if (
    candidate.schema_version !== 1 ||
    candidate.command_name !== "delivery.refinement.apply" ||
    candidate.result_state !== "recorded" ||
    !appliedPayload ||
    typeof appliedPayload.packet_id !== "string" ||
    !applyPlan ||
    !metadataResolutions ||
    !appliedPayload.metadata_values ||
    typeof appliedPayload.metadata_values !== "object" ||
    typeof candidate.applied_at !== "string" ||
    !Array.isArray(candidate.lines) ||
    !candidate.lines.every((line) => typeof line === "string") ||
    (candidate.outcome !== "accepted" &&
      candidate.outcome !== "failed" &&
      candidate.outcome !== "partial") ||
    typeof candidate.receipt_id !== "string" ||
    typeof candidate.source_work_design_receipt_id !== "string" ||
    !tone
  ) {
    return null;
  }

  return {
    applied_payload: {
      apply_plan: applyPlan,
      metadata_resolutions: metadataResolutions,
      metadata_values: normalizeStringRecord(appliedPayload.metadata_values),
      packet_id: appliedPayload.packet_id,
    },
    applied_at: candidate.applied_at,
    command_name: "delivery.refinement.apply",
    lines: candidate.lines,
    outcome: candidate.outcome,
    receipt_id: candidate.receipt_id,
    result_state: "recorded",
    schema_version: 1,
    source_work_design_receipt_id: candidate.source_work_design_receipt_id,
    tone,
  };
}

function normalizeRefinementApplyPlan(
  value: unknown,
): DeliveryRefinementApplyPlan | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DeliveryRefinementApplyPlan>;
  if (
    typeof candidate.summary !== "string" ||
    !Array.isArray(candidate.expected_routes) ||
    !candidate.expected_routes.every((route) => typeof route === "string") ||
    !Array.isArray(candidate.operations) ||
    !candidate.operations.every(isRefinementApplyOperation)
  ) {
    return null;
  }

  return {
    expected_routes: [...candidate.expected_routes],
    operations: candidate.operations.map((operation) => ({ ...operation })),
    summary: candidate.summary,
  };
}

function isRefinementApplyOperation(
  value: unknown,
): value is DeliveryRefinementApplyPlan["operations"][number] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const operation = value as Record<string, unknown>;
  return (
    typeof operation.detail === "string" &&
    typeof operation.kind === "string" &&
    typeof operation.label === "string" &&
    typeof operation.operation_id === "string" &&
    typeof operation.oos_route === "string" &&
    (operation.status === "planned" || operation.status === "skipped") &&
    typeof operation.target === "string"
  );
}

function normalizeRefinementSessionMetadata(
  value: unknown,
): RefinementSessionMetadataDraft | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<RefinementSessionMetadataDraft>;
  const fieldResolutions = normalizeRefinementFieldResolutionMap(
    candidate.fieldResolutions,
  );

  if (
    !fieldResolutions ||
    (candidate.selectionMode !== "single" &&
      candidate.selectionMode !== "shared") ||
    !candidate.draftValues ||
    typeof candidate.draftValues !== "object" ||
    !Array.isArray(candidate.selectedBulkNodeIds) ||
    typeof candidate.selectedFieldKey !== "string"
  ) {
    return null;
  }

  return {
    draftValues: normalizeStringRecord(candidate.draftValues),
    fieldResolutions,
    selectedBulkNodeIds: candidate.selectedBulkNodeIds.filter(
      (value): value is string => typeof value === "string",
    ),
    selectedFieldKey: candidate.selectedFieldKey,
    selectionMode: candidate.selectionMode as RefinementMetadataSelectionMode,
  };
}

function normalizeStringRecord(value: object): Record<string, string> {
  return Object.entries(value).reduce<Record<string, string>>(
    (result, [key, item]) => {
      if (typeof item === "string") {
        result[key] = item;
      }
      return result;
    },
    {},
  );
}

function normalizeRefinementFieldResolutionMap(
  value: unknown,
): RefinementMetadataFieldResolutionMap | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const result: RefinementMetadataFieldResolutionMap = {};
  for (const [key, item] of Object.entries(value)) {
    const resolution = normalizeRefinementFieldResolution(item);
    if (resolution) {
      result[key] = resolution;
    }
  }

  return result;
}

function normalizeRefinementFieldResolution(
  value: unknown,
): RefinementMetadataFieldResolution | null {
  if (value === "accepted" || value === "ai_drafted" || value === "repaired") {
    return value;
  }

  return null;
}

function normalizeRefinementTone(value: unknown): DeliveryTone | null {
  if (
    value === "info" ||
    value === "ok" ||
    value === "warn" ||
    value === "danger" ||
    value === "muted" ||
    value === "stale"
  ) {
    return value;
  }

  return null;
}
