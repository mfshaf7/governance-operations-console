import type {
  OrchestrationRunNodeState,
  OrchestrationRunRecord,
} from "../domain/orchestration-run-types.ts";
import type { OrchestrationWorkspaceReadModel } from "../read-model/workspace/orchestration-workspace-types.ts";
import {
  orchestrationAttentionQueue,
  orchestrationInFlightRuns,
  orchestrationMaterialEvents,
  orchestrationWorkspaceSummary,
} from "../read-model/workspace/orchestration-workspace-selectors.ts";
import type { OrchestrationRunControlReceipt } from "../work-model/run-control/run-control-types.ts";
import type { OrchestrationRunScenarioOverlay } from "./run-control/run-control-simulator.ts";

export function projectOrchestrationEffectiveWorkspaceReadModel({
  overlays,
  receipts,
  source,
}: {
  overlays: Readonly<Record<string, OrchestrationRunScenarioOverlay>>;
  receipts: readonly OrchestrationRunControlReceipt[];
  source: OrchestrationWorkspaceReadModel;
}): OrchestrationWorkspaceReadModel {
  const receiptsByRun = receipts.reduce((grouped, receipt) => {
    const current = grouped.get(receipt.runId) ?? [];
    grouped.set(receipt.runId, [...current, receipt]);
    return grouped;
  }, new Map<string, OrchestrationRunControlReceipt[]>());
  const runs = source.runs.map((run) =>
    projectOrchestrationEffectiveRun(
      run,
      overlays[run.runId] ?? null,
      receiptsByRun.get(run.runId) ?? [],
    ),
  );
  const projectedAt = latestRunTimestamp(runs);

  return {
    ...source,
    attention: orchestrationAttentionQueue({
      definitions: source.definitions,
      now: projectedAt,
      runs,
    }),
    inFlightRuns: orchestrationInFlightRuns(runs, projectedAt),
    materialEvents: orchestrationMaterialEvents(runs),
    runs,
    summary: orchestrationWorkspaceSummary({
      definitions: source.definitions,
      runs,
    }),
  };
}

export function projectOrchestrationEffectiveRun(
  run: OrchestrationRunRecord,
  overlay: OrchestrationRunScenarioOverlay | null,
  receipts: readonly OrchestrationRunControlReceipt[],
): OrchestrationRunRecord {
  if (!overlay) {
    return run;
  }

  const currentNodeState = orchestrationNodeStateFromRunState(overlay.state);
  const localEvents = receipts.map((receipt, index) => ({
    eventId: `local-control:${receipt.receiptId}`,
    material: true,
    nodeId: run.currentNodeId,
    occurredAt: receipt.recordedAt,
    sequence: run.events.length + index + 1,
    state: receipt.resultingRunState,
    summary: receipt.summary,
  }));

  return {
    ...run,
    blocker: overlay.state === "blocked" ? run.blocker : null,
    controls: run.controls.map((control) => ({
      ...control,
      available: false,
      disabledReason:
        "A prototype-local control result is recorded. Refresh source truth before another control.",
    })),
    effectPosture: overlay.effectPosture,
    events: [...run.events, ...localEvents],
    failure: overlay.state === "failed" ? run.failure : null,
    nodes: run.nodes.map((node) =>
      node.id === run.currentNodeId && currentNodeState
        ? { ...node, state: currentNodeState }
        : node,
    ),
    retry:
      overlay.state === "failed"
        ? run.retry
        : { ...run.retry, available: false, nextEligibleAt: null },
    source: {
      ...run.source,
      mode: "prototype-local",
      observedAt: overlay.updatedAt,
      sourceVersion: `${run.source.sourceVersion}+${overlay.lastReceiptId}`,
    },
    state: overlay.state,
    updatedAt: overlay.updatedAt,
    wait: overlay.state === "waiting" ? run.wait : null,
  };
}

function orchestrationNodeStateFromRunState(
  state: OrchestrationRunRecord["state"],
): OrchestrationRunNodeState | null {
  switch (state) {
    case "blocked":
    case "cancelled":
    case "failed":
    case "queued":
    case "running":
    case "waiting":
      return state;
    case "completed":
      return "completed";
  }
}

function latestRunTimestamp(runs: readonly OrchestrationRunRecord[]) {
  return (
    runs
      .map((run) => run.updatedAt)
      .sort((left, right) => left.localeCompare(right))
      .at(-1) ?? "1970-01-01T00:00:00.000Z"
  );
}
