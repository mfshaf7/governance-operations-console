import { createLocalOperationProjectionStore } from "../../operation-runtime/local-operation-projection-store.ts";

import type { RepositoryWorkspaceRecord } from "../read-model/repository-workspace-read-model.ts";
import type {
  RepositoryRuntimeReceipt,
  RepositoryRuntimeProjectionSnapshot,
  RepositoryRuntimeProjectionState,
} from "./repository-runtime-model.ts";
import { repositoryRuntimeSource } from "./repository-runtime-model.ts";

const repositoryRuntimeStore = createLocalOperationProjectionStore<
  RepositoryRuntimeProjectionState,
  RepositoryRuntimeProjectionSnapshot
>({
  initialState: {
    localRequestRecords: [],
    receiptsByRecord: {},
  },
  projectSnapshot: (state) => state,
  runtimeSource: repositoryRuntimeSource,
});

export function subscribeRepositoryRuntimeProjection(listener: () => void) {
  return repositoryRuntimeStore.subscribe(listener);
}

export function getRepositoryRuntimeProjectionSnapshot() {
  return repositoryRuntimeStore.getSnapshot();
}

export function getRepositoryLocalRequestRecordCount() {
  return repositoryRuntimeStore.getState().localRequestRecords.length;
}

export function recordRepositoryLocalRequestRecord(
  localRecord: RepositoryWorkspaceRecord,
) {
  repositoryRuntimeStore.updateState((currentState) => {
    if (
      currentState.localRequestRecords.some(
        (record) => record.id === localRecord.id,
      )
    ) {
      return currentState;
    }

    return {
      ...currentState,
      localRequestRecords: [localRecord, ...currentState.localRequestRecords],
    };
  });
}

export function recordRepositoryRuntimeReceipt(
  receipt: RepositoryRuntimeReceipt,
) {
  repositoryRuntimeStore.updateState((currentState) => {
    const currentReceipts =
      currentState.receiptsByRecord[receipt.recordId] ?? [];

    if (
      currentReceipts.some(
        (currentReceipt) => currentReceipt.receiptId === receipt.receiptId,
      )
    ) {
      return currentState;
    }

    return {
      ...currentState,
      receiptsByRecord: {
        ...currentState.receiptsByRecord,
        [receipt.recordId]: [...currentReceipts, receipt],
      },
    };
  });
}
