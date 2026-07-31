import { createLocalOperationProjectionVersion } from "../../../operation-runtime/operation-runtime-invariants.ts";
import type {
  DeliveryActionType,
  DeliveryIntakeSource,
  DeliveryPackagePosture,
  DeliveryPackageSummary,
  DeliveryRefinementApplyReceipt,
  DeliveryTone,
} from "../../read-model/index.ts";
import type {
  WorkDesignApplyReceipt,
  WorkDesignNode,
} from "../../work-model/work-design/work-design-types.ts";
import type { DeliveryCloseoutReceipt } from "../../work-model/closeout/delivery-closeout-contracts.ts";

export type LocalWorkDesignNodeKind = WorkDesignNode["kind"];
export type LocalWorkDesignNode = WorkDesignNode;

export type LocalConsumedIntakeRecord = {
  consumedAt: string;
  consumedBy: string;
  sourceRecordVersion: string;
};

export type LocalWorkDesignApplyRecord = WorkDesignApplyReceipt & {
  sourceRecordVersion: string;
};

export type LocalRefinementApplyRecord = DeliveryRefinementApplyReceipt & {
  sourceRecordVersion: string;
};

export type LocalExecutionActionRecord = {
  actionType: DeliveryActionType;
  receiptId: string;
  recordedAt: string;
  sourceRecordVersion: string;
  sourceRevision: string;
  statusLabel: DeliveryPackagePosture;
  summary: string;
  tone: DeliveryTone;
};

export type LocalDeliveryCloseoutRecord =
  DeliveryCloseoutReceipt["outcome"] & {
    sourceRecordVersion: string;
  };

export function deliveryIntakeSourceVersion(source: DeliveryIntakeSource) {
  return createLocalOperationProjectionVersion({
    projection: source,
    sourceOwner: "delivery-intake-source",
  });
}

export function deliveryPackageSourceVersion(
  deliveryPackage: DeliveryPackageSummary,
) {
  const { local_workflow_projection: _localProjection, ...sourceRecord } =
    deliveryPackage;

  return createLocalOperationProjectionVersion({
    projection: sourceRecord,
    sourceOwner: "delivery-package",
  });
}
