import { orchestrationWorkspaceReadModel } from "../read-model/workspace/orchestration-workspace-read-model.ts";
import {
  getOrchestrationRunControlReceiptSnapshot,
  subscribeOrchestrationRunControlReceipts,
} from "./run-control/run-control-receipt-store.ts";
import {
  getOrchestrationRunControlSimulationSnapshot,
  subscribeOrchestrationRunControlSimulation,
} from "./run-control/run-control-simulator.ts";
import { projectOrchestrationEffectiveWorkspaceReadModel } from "./orchestration-effective-projection.ts";

let cachedReceiptSnapshot = getOrchestrationRunControlReceiptSnapshot();
let cachedSimulationSnapshot = getOrchestrationRunControlSimulationSnapshot();
let cachedWorkspaceSnapshot = projectSnapshot();

export function getOrchestrationWorkspaceProjectionSnapshot() {
  const receiptSnapshot = getOrchestrationRunControlReceiptSnapshot();
  const simulationSnapshot = getOrchestrationRunControlSimulationSnapshot();

  if (
    receiptSnapshot !== cachedReceiptSnapshot ||
    simulationSnapshot !== cachedSimulationSnapshot
  ) {
    cachedReceiptSnapshot = receiptSnapshot;
    cachedSimulationSnapshot = simulationSnapshot;
    cachedWorkspaceSnapshot = projectSnapshot();
  }

  return cachedWorkspaceSnapshot;
}

export function subscribeOrchestrationWorkspaceProjection(
  listener: () => void,
) {
  const unsubscribeReceipts =
    subscribeOrchestrationRunControlReceipts(listener);
  const unsubscribeSimulation =
    subscribeOrchestrationRunControlSimulation(listener);

  return () => {
    unsubscribeReceipts();
    unsubscribeSimulation();
  };
}

function projectSnapshot() {
  return projectOrchestrationEffectiveWorkspaceReadModel({
    overlays: cachedSimulationSnapshot.overlays,
    receipts: cachedReceiptSnapshot.receipts,
    source: orchestrationWorkspaceReadModel,
  });
}
