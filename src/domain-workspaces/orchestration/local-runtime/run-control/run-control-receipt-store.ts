import { createLocalOperationProjectionStore } from "../../../operation-runtime/local-operation-projection-store.ts";
import type { OrchestrationRunControlReceipt } from "../../work-model/run-control/run-control-types.ts";

type RunControlReceiptState = {
  receipts: OrchestrationRunControlReceipt[];
};

const runControlReceiptStore = createLocalOperationProjectionStore<
  RunControlReceiptState,
  RunControlReceiptState
>({
  initialState: {
    receipts: [],
  } satisfies RunControlReceiptState,
  projectSnapshot: (state) => ({
    receipts: [...state.receipts],
  }),
  runtimeSource: {
    authority: "prototype-local",
    mode: "local",
    sourceOwner: "orchestration.run-control",
  },
});

export function recordOrchestrationRunControlReceipt(
  receipt: OrchestrationRunControlReceipt,
) {
  const existing = runControlReceiptStore
    .getState()
    .receipts.find(
      (candidate) => candidate.idempotencyKey === receipt.idempotencyKey,
    );

  if (existing) {
    return existing;
  }

  runControlReceiptStore.updateState((state) => ({
    receipts: [...state.receipts, receipt],
  }));

  return receipt;
}

export function listOrchestrationRunControlReceipts(runId?: string) {
  const receipts = runControlReceiptStore.getSnapshot().receipts;
  return runId
    ? receipts.filter((receipt) => receipt.runId === runId)
    : receipts;
}

export function getOrchestrationRunControlReceiptSnapshot() {
  return runControlReceiptStore.getSnapshot();
}

export function subscribeOrchestrationRunControlReceipts(listener: () => void) {
  return runControlReceiptStore.subscribe(listener);
}
