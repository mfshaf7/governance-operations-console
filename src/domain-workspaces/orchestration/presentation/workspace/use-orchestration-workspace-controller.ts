"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import {
  getOrchestrationWorkspaceProjectionSnapshot,
  subscribeOrchestrationWorkspaceProjection,
} from "../../local-runtime/orchestration-workspace-runtime.ts";
import {
  orchestrationWorkspaceSummaryMetrics,
  orchestrationWorkspaceSummaryTitle,
  type OrchestrationWorkspaceSurfaceId,
} from "./orchestration-workspace-view-model.ts";
import { useOrchestrationLiveRuntime } from "../../live-runtime/use-orchestration-live-runtime.ts";
import { simulateOrchestrationRunControl } from "../../local-runtime/run-control/run-control-simulator.ts";
import type { OrchestrationRunControlInput } from "../../work-model/run-control/run-control-types.ts";

export function useOrchestrationWorkspaceController({
  entryIntent = null,
}: {
  entryIntent?: ConsoleSurfaceEntryIntent | null;
} = {}) {
  const [activeSurfaceId, setActiveSurfaceId] =
    useState<OrchestrationWorkspaceSurfaceId>("home");
  const readModel = useSyncExternalStore(
    subscribeOrchestrationWorkspaceProjection,
    getOrchestrationWorkspaceProjectionSnapshot,
    getOrchestrationWorkspaceProjectionSnapshot,
  );
  const liveRuntime = useOrchestrationLiveRuntime();
  const effectiveReadModel =
    liveRuntime.snapshot.mode === "disconnected-preview"
      ? readModel
      : liveRuntime.snapshot.readModel ?? readModel;
  const controlRun = useCallback(
    async (runId: string, input: OrchestrationRunControlInput) => {
      if (liveRuntime.snapshot.mode !== "disconnected-preview") {
        return liveRuntime.control(runId, input);
      }
      const run = readModel.runs.find((candidate) => candidate.runId === runId);
      if (!run) throw new Error("The disconnected-preview run is unavailable.");
      return simulateOrchestrationRunControl({ input, requestedAt: new Date().toISOString(), run }).receipt;
    },
    [liveRuntime, readModel],
  );

  useEffect(() => {
    if (entryIntent?.subjectRef.startsWith("definition:")) {
      setActiveSurfaceId("definitions");
      return;
    }

    if (
      entryIntent?.subjectRef.startsWith("run:") ||
      entryIntent?.requiredMoveRef.startsWith("orchestration.runs.")
    ) {
      setActiveSurfaceId("runs");
    }
  }, [entryIntent]);

  return {
    activeSurfaceId,
    controlRun,
    refreshOwnerTruth: liveRuntime.load,
    sourceMode: liveRuntime.snapshot.mode,
    readModel: effectiveReadModel,
    setActiveSurfaceId,
    summaryMetrics: orchestrationWorkspaceSummaryMetrics(
      effectiveReadModel,
      activeSurfaceId,
    ),
    summaryTitle: orchestrationWorkspaceSummaryTitle(activeSurfaceId),
  };
}
