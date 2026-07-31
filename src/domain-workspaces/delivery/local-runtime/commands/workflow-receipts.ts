import type {
  DeliveryPackageSummary,
  DeliveryRefinementApplyPlan,
  DeliveryRefinementApplyReceipt,
  DeliveryRefinementMetadataResolution,
} from "../../read-model/index.ts";
import type {
  LocalConsumedIntakeRecord,
  LocalWorkDesignNode,
} from "../transitions/transition-record.ts";
import type {
  WorkDesignApplyReceipt,
  WorkDesignBlockerDisposition,
  WorkDesignBlockerDispositionReceipt,
  WorkDesignBlockerIssue,
  WorkDesignBlockerRecoveryActionId,
} from "../../work-model/work-design/work-design-types.ts";
import { createLocalOperationProjectionVersion } from "../../../operation-runtime/operation-runtime-invariants.ts";

type LocalDeliveryBlockerRecoveryAction = {
  clearsBlocker: boolean;
  disposition: WorkDesignBlockerDisposition;
  evidenceLines: string[];
  id: WorkDesignBlockerRecoveryActionId;
  outcome: NonNullable<WorkDesignBlockerDispositionReceipt["outcome"]>;
  recoveryAction: string;
};

const blockerDispositionReceipts = new Map<
  string,
  WorkDesignBlockerDispositionReceipt
>();
const refinementApplyReceipts = new Map<
  string,
  DeliveryRefinementApplyReceipt
>();

export function createLocalDeliveryBlockerDispositionReceipt({
  action,
  activeBlockerIssue,
  deliveryPackage,
  fallbackJustification,
  justification,
  recordedAt = new Date().toISOString(),
}: {
  action: LocalDeliveryBlockerRecoveryAction;
  activeBlockerIssue: WorkDesignBlockerIssue;
  deliveryPackage: Pick<
    DeliveryPackageSummary,
    "delivery_package_id" | "source_ref"
  >;
  fallbackJustification: string;
  justification: string;
  recordedAt?: string;
}): WorkDesignBlockerDispositionReceipt {
  const recordedJustification = justification || fallbackJustification;
  const receiptId = createLocalOperationProjectionVersion({
    projection: {
      disposition: action.disposition,
      issueId: activeBlockerIssue.id,
      justification: recordedJustification,
      packageId: deliveryPackage.delivery_package_id,
      recoveryActionId: action.id,
      sourceRef: deliveryPackage.source_ref,
    },
    sourceOwner: "delivery-work-design-blocker",
  });
  const existingReceipt = blockerDispositionReceipts.get(receiptId);

  if (existingReceipt) {
    return existingReceipt;
  }

  const receipt: WorkDesignBlockerDispositionReceipt = {
    clearsBlocker: action.clearsBlocker,
    disposition: action.disposition,
    evidenceLines: action.evidenceLines,
    issueId: activeBlockerIssue.id,
    issueKind: activeBlockerIssue.kind,
    justification: recordedJustification,
    outcome: action.outcome,
    packageId: deliveryPackage.delivery_package_id,
    recordedAt,
    receiptId,
    recoveryAction: action.recoveryAction,
    recoveryActionId: action.id,
    sourceRef: deliveryPackage.source_ref,
  };

  blockerDispositionReceipts.set(receiptId, receipt);
  return receipt;
}

export function createLocalRefinementApplyReceipt({
  applyPlan,
  appliedAt = new Date().toISOString(),
  metadataDraftValues,
  metadataFieldResolutions,
  packetId,
  sourceWorkDesignReceiptId,
}: {
  applyPlan: DeliveryRefinementApplyPlan;
  appliedAt?: string;
  metadataDraftValues: Record<string, string>;
  metadataFieldResolutions: Record<
    string,
    DeliveryRefinementMetadataResolution
  >;
  packetId: string;
  sourceWorkDesignReceiptId: string;
}): DeliveryRefinementApplyReceipt {
  const receiptId = `${packetId}-local-receipt`;
  const existingReceipt = refinementApplyReceipts.get(receiptId);

  if (existingReceipt) {
    return existingReceipt;
  }

  const receipt: DeliveryRefinementApplyReceipt = {
    applied_payload: {
      apply_plan: {
        expected_routes: [...applyPlan.expected_routes],
        operations: applyPlan.operations.map((operation) => ({ ...operation })),
        summary: applyPlan.summary,
      },
      metadata_resolutions: { ...metadataFieldResolutions },
      metadata_values: { ...metadataDraftValues },
      packet_id: packetId,
    },
    applied_at: appliedAt,
    command_name: "delivery.refinement.apply",
    lines: [
      "Mock OOS governance update accepted.",
      "Mock plan apply reconciled the Work Design handoff tree.",
      "Mock item-scoped metadata change set accepted.",
      "No blocker fields were set or cleared by Refinement.",
    ],
    outcome: "accepted",
    receipt_id: receiptId,
    result_state: "recorded",
    schema_version: 1,
    source_work_design_receipt_id: sourceWorkDesignReceiptId,
    tone: "ok",
  };

  refinementApplyReceipts.set(receiptId, receipt);
  return receipt;
}

export function createLocalConsumedIntakeRecord({
  consumedAt = new Date().toISOString(),
  consumedBy = "Workspace delivery operator via local preview",
  sourceRecordVersion,
}: {
  consumedAt?: string;
  consumedBy?: string;
  sourceRecordVersion: string;
}): LocalConsumedIntakeRecord {
  return {
    consumedAt,
    consumedBy,
    sourceRecordVersion,
  };
}

export function createLocalWorkDesignApplyReceipt({
  appliedAt = new Date().toISOString(),
  appliedBy = "Workspace delivery operator via local preview",
  deliveryPackage,
  targetTree,
}: {
  appliedAt?: string;
  appliedBy?: string;
  deliveryPackage: Pick<DeliveryPackageSummary, "legacy_epic_id">;
  targetTree: LocalWorkDesignNode;
}): WorkDesignApplyReceipt {
  return {
    appliedAt,
    appliedBy,
    receiptId: `WDS-APPLY-${deliveryPackage.legacy_epic_id}-local`,
    targetTree,
  };
}
