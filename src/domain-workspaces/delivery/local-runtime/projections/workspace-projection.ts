import { createLocalOperationProjectionStore } from "../../../operation-runtime/index.ts";

import type {
  DeliveryIntakeSource,
  DeliveryPackageSummary,
  DeliveryRefinementApplyReceipt,
} from "../../read-model/index.ts";
import type { DeliveryCloseoutReceipt } from "../../work-model/closeout/delivery-closeout-contracts.ts";
import type { WorkDesignApplyReceipt } from "../../work-model/work-design/work-design-types.ts";
import { createLocalConsumedIntakeRecord } from "../commands/workflow-receipts.ts";
import {
  getDeliveryIngressProjectionSnapshot,
  subscribeDeliveryIngressProjection,
  type DeliveryIngressProjectionSnapshot,
} from "../ingress/delivery-ingress-runtime.ts";
import type {
  LocalConsumedIntakeRecord,
  LocalDeliveryCloseoutRecord,
  LocalExecutionActionRecord,
  LocalRefinementApplyRecord,
  LocalWorkDesignApplyRecord,
} from "../transitions/transition-record.ts";
import {
  deliveryIntakeSourceVersion,
  deliveryPackageSourceVersion,
} from "../transitions/transition-record.ts";

type DeliveryWorkspaceLocalProjectionState = {
  closeoutRecords: Record<string, LocalDeliveryCloseoutRecord>;
  consumedIntakeRecords: Record<string, LocalConsumedIntakeRecord>;
  executionActionRecords: Record<string, LocalExecutionActionRecord>;
  refinementApplyReceipts: Record<string, LocalRefinementApplyRecord>;
  workDesignApplyRecords: Record<string, LocalWorkDesignApplyRecord>;
};

export type DeliveryWorkspaceProjectionSnapshot =
  DeliveryWorkspaceLocalProjectionState & {
    ingress: DeliveryIngressProjectionSnapshot;
  };

const deliveryWorkspaceProjectionStore = createLocalOperationProjectionStore<
  DeliveryWorkspaceLocalProjectionState,
  DeliveryWorkspaceLocalProjectionState
>({
  initialState: {
    closeoutRecords: {},
    consumedIntakeRecords: {},
    executionActionRecords: {},
    refinementApplyReceipts: {},
    workDesignApplyRecords: {},
  },
  projectSnapshot: (state) => state,
  runtimeSource: {
    authority: "prototype-local",
    mode: "local",
    sourceOwner: "delivery-workspace",
  },
});

let cachedLocalProjection = deliveryWorkspaceProjectionStore.getSnapshot();
let cachedIngressProjection = getDeliveryIngressProjectionSnapshot();
let cachedWorkspaceProjection: DeliveryWorkspaceProjectionSnapshot = {
  ...cachedLocalProjection,
  ingress: cachedIngressProjection,
};

export function subscribeDeliveryWorkspaceProjection(listener: () => void) {
  const unsubscribeLocal = deliveryWorkspaceProjectionStore.subscribe(listener);
  const unsubscribeIngress = subscribeDeliveryIngressProjection(listener);

  return () => {
    unsubscribeIngress();
    unsubscribeLocal();
  };
}

export function getDeliveryWorkspaceProjectionSnapshot() {
  const localProjection = deliveryWorkspaceProjectionStore.getSnapshot();
  const ingressProjection = getDeliveryIngressProjectionSnapshot();

  if (
    localProjection !== cachedLocalProjection ||
    ingressProjection !== cachedIngressProjection
  ) {
    cachedLocalProjection = localProjection;
    cachedIngressProjection = ingressProjection;
    cachedWorkspaceProjection = {
      ...localProjection,
      ingress: ingressProjection,
    };
  }

  return cachedWorkspaceProjection;
}

export function recordLocalDeliveryIntakeConsume(source: DeliveryIntakeSource) {
  const consumedRecord = createLocalConsumedIntakeRecord({
    sourceRecordVersion: deliveryIntakeSourceVersion(source),
  });

  deliveryWorkspaceProjectionStore.updateState((currentState) => ({
    ...currentState,
    consumedIntakeRecords: {
      ...currentState.consumedIntakeRecords,
      [source.accepted_source_id]: consumedRecord,
    },
  }));

  return consumedRecord;
}

export function recordLocalDeliveryWorkDesignApply({
  deliveryPackage,
  record,
}: {
  deliveryPackage: DeliveryPackageSummary;
  record: WorkDesignApplyReceipt;
}) {
  const localRecord: LocalWorkDesignApplyRecord = {
    ...record,
    sourceRecordVersion: deliveryPackageSourceVersion(deliveryPackage),
  };

  deliveryWorkspaceProjectionStore.updateState((currentState) => ({
    ...currentState,
    workDesignApplyRecords: {
      ...currentState.workDesignApplyRecords,
      [deliveryPackage.delivery_package_id]: localRecord,
    },
  }));

  return localRecord;
}

export function recordLocalDeliveryRefinementApply({
  deliveryPackage,
  receipt,
}: {
  deliveryPackage: DeliveryPackageSummary;
  receipt: DeliveryRefinementApplyReceipt;
}) {
  const localReceipt: LocalRefinementApplyRecord = {
    ...receipt,
    sourceRecordVersion: deliveryPackageSourceVersion(deliveryPackage),
  };

  deliveryWorkspaceProjectionStore.updateState((currentState) => ({
    ...currentState,
    refinementApplyReceipts: {
      ...currentState.refinementApplyReceipts,
      [deliveryPackage.delivery_package_id]: localReceipt,
    },
  }));

  return localReceipt;
}

export function recordLocalDeliveryExecutionAction({
  deliveryPackage,
  record,
}: {
  deliveryPackage: DeliveryPackageSummary;
  record: Omit<LocalExecutionActionRecord, "sourceRecordVersion">;
}) {
  const localRecord: LocalExecutionActionRecord = {
    ...record,
    sourceRecordVersion: deliveryPackageSourceVersion(deliveryPackage),
  };

  deliveryWorkspaceProjectionStore.updateState((currentState) => ({
    ...currentState,
    executionActionRecords: {
      ...currentState.executionActionRecords,
      [deliveryPackage.delivery_package_id]: localRecord,
    },
  }));

  return localRecord;
}

export function recordLocalDeliveryCloseout({
  deliveryPackage,
  receipt,
}: {
  deliveryPackage: DeliveryPackageSummary;
  receipt: DeliveryCloseoutReceipt;
}) {
  const localRecord: LocalDeliveryCloseoutRecord = {
    ...receipt.outcome,
    sourceRecordVersion: deliveryPackageSourceVersion(deliveryPackage),
  };

  deliveryWorkspaceProjectionStore.updateState((currentState) => ({
    ...currentState,
    closeoutRecords: {
      ...currentState.closeoutRecords,
      [deliveryPackage.delivery_package_id]: localRecord,
    },
  }));

  return localRecord;
}
