import { createLocalOperationProjectionStore } from "../../operation-runtime/local-operation-projection-store.ts";

import type { PrototypeRecord } from "../read-model/prototype-workspace-read-model.ts";
import {
  prototypeRuntimeSource,
  type PrototypeLocalReceipt,
  type PrototypeRuntimeProjectionSnapshot,
  type PrototypeRuntimeProjectionState,
} from "./prototype-runtime-model.ts";

const prototypeRuntimeStore = createLocalOperationProjectionStore<
  PrototypeRuntimeProjectionState,
  PrototypeRuntimeProjectionSnapshot
>({
  initialState: {
    localRequestRecords: [],
    receiptsByRecord: {},
  },
  projectSnapshot: (state) => state,
  runtimeSource: prototypeRuntimeSource,
});

export function subscribePrototypeRuntimeProjection(listener: () => void) {
  return prototypeRuntimeStore.subscribe(listener);
}

export function getPrototypeRuntimeProjectionSnapshot() {
  return prototypeRuntimeStore.getSnapshot();
}

export function getPrototypeLocalRequestRecordCount() {
  return prototypeRuntimeStore.getState().localRequestRecords.length;
}

export function recordPrototypeLocalRequestRecord(
  record: PrototypeRecord,
  receipt: PrototypeLocalReceipt,
) {
  prototypeRuntimeStore.updateState((currentState) => {
    const recordExists = currentState.localRequestRecords.some(
      (currentRecord) => currentRecord.id === record.id,
    );
    const receiptsByRecord = prototypeReceiptsByRecordWith(
      currentState.receiptsByRecord,
      receipt,
    );

    if (recordExists && receiptsByRecord === currentState.receiptsByRecord) {
      return currentState;
    }

    return {
      ...currentState,
      localRequestRecords: recordExists
        ? currentState.localRequestRecords
        : [record, ...currentState.localRequestRecords],
      receiptsByRecord,
    };
  });
}

export function recordPrototypeLocalReceipt(receipt: PrototypeLocalReceipt) {
  prototypeRuntimeStore.updateState((currentState) => {
    const receiptsByRecord = prototypeReceiptsByRecordWith(
      currentState.receiptsByRecord,
      receipt,
    );

    return receiptsByRecord === currentState.receiptsByRecord
      ? currentState
      : {
          ...currentState,
          receiptsByRecord,
        };
  });
}

function prototypeReceiptsByRecordWith(
  receiptsByRecord: Record<string, PrototypeLocalReceipt[]>,
  receipt: PrototypeLocalReceipt,
) {
  const currentReceipts = receiptsByRecord[receipt.recordId] ?? [];

  if (
    currentReceipts.some(
      (currentReceipt) => currentReceipt.receiptId === receipt.receiptId,
    )
  ) {
    return receiptsByRecord;
  }

  return {
    ...receiptsByRecord,
    [receipt.recordId]: [...currentReceipts, receipt],
  };
}
