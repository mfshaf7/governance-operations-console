import { createLocalOperationProjectionStore } from "../../../operation-runtime/local-operation-projection-store.ts";
import type {
  OrchestrationRunEffectPosture,
  OrchestrationRunLifecycle,
  OrchestrationRunRecord,
} from "../../domain/orchestration-run-types.ts";
import {
  createOrchestrationRunControlRequest,
  orchestrationRunControlResultState,
} from "../../work-model/run-control/run-control-model.ts";
import type {
  OrchestrationRunControlInput,
  OrchestrationRunControlReceipt,
} from "../../work-model/run-control/run-control-types.ts";
import {
  listOrchestrationRunControlReceipts,
  recordOrchestrationRunControlReceipt,
} from "./run-control-receipt-store.ts";

export type OrchestrationRunScenarioOverlay = {
  effectPosture: OrchestrationRunEffectPosture;
  lastReceiptId: string;
  runId: string;
  state: OrchestrationRunLifecycle;
  updatedAt: string;
};

type RunControlSimulationState = {
  overlays: Record<string, OrchestrationRunScenarioOverlay>;
};

const runControlSimulationStore = createLocalOperationProjectionStore({
  initialState: {
    overlays: {},
  } satisfies RunControlSimulationState,
  projectSnapshot: (state: RunControlSimulationState) => ({
    overlays: { ...state.overlays },
  }),
  runtimeSource: {
    authority: "prototype-local",
    mode: "local",
    sourceOwner: "orchestration.run-control-simulator",
  },
});

export function simulateOrchestrationRunControl({
  input,
  requestedAt,
  run,
}: {
  input: OrchestrationRunControlInput;
  requestedAt: string;
  run: OrchestrationRunRecord;
}) {
  const request = createOrchestrationRunControlRequest({
    input,
    requestedAt,
    run,
  });
  const existingReceipt = listOrchestrationRunControlReceipts(run.runId).find(
    (receipt) => receipt.idempotencyKey === request.idempotencyKey,
  );

  if (existingReceipt) {
    return {
      overlay:
        runControlSimulationStore.getSnapshot().overlays[run.runId] ?? null,
      receipt: existingReceipt,
      request,
    };
  }

  const resultingRunState = orchestrationRunControlResultState(input);
  const receipt: OrchestrationRunControlReceipt = {
    controlId: input.controlId,
    effectPosture: run.effectPosture,
    idempotencyKey: request.idempotencyKey,
    receiptId: `orchestration-run-control-${request.idempotencyKey.replace(
      "operation-",
      "",
    )}`,
    recordedAt: requestedAt,
    resultState: "recorded",
    resultingRunState,
    runId: run.runId,
    schemaVersion: 1,
    summary: `${input.controlId} recorded as a prototype-local simulation.`,
  };
  const recordedReceipt = recordOrchestrationRunControlReceipt(receipt);
  const overlay: OrchestrationRunScenarioOverlay = {
    effectPosture: run.effectPosture,
    lastReceiptId: recordedReceipt.receiptId,
    runId: run.runId,
    state: resultingRunState,
    updatedAt: requestedAt,
  };

  runControlSimulationStore.updateState((state) => ({
    overlays: {
      ...state.overlays,
      [run.runId]: overlay,
    },
  }));

  return {
    overlay,
    receipt: recordedReceipt,
    request,
  };
}

export function getOrchestrationRunScenarioOverlay(runId: string) {
  return runControlSimulationStore.getSnapshot().overlays[runId] ?? null;
}

export function getOrchestrationRunControlSimulationSnapshot() {
  return runControlSimulationStore.getSnapshot();
}

export function subscribeOrchestrationRunControlSimulation(
  listener: () => void,
) {
  return runControlSimulationStore.subscribe(listener);
}
