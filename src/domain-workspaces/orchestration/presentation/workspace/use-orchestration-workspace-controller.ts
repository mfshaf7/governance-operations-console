"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

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

  useEffect(() => {
    if (entryIntent?.subjectRef.startsWith("definition:")) {
      setActiveSurfaceId("definitions");
      return;
    }

    if (entryIntent?.subjectRef.startsWith("run:")) {
      setActiveSurfaceId("runs");
    }
  }, [entryIntent]);

  return {
    activeSurfaceId,
    readModel,
    setActiveSurfaceId,
    summaryMetrics: orchestrationWorkspaceSummaryMetrics(
      readModel,
      activeSurfaceId,
    ),
    summaryTitle: orchestrationWorkspaceSummaryTitle(activeSurfaceId),
  };
}
