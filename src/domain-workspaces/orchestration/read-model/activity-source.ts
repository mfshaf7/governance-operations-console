import {
  getOrchestrationWorkspaceProjectionSnapshot,
  subscribeOrchestrationWorkspaceProjection,
} from "../local-runtime/orchestration-workspace-runtime.ts";

export const orchestrationActivitySource = {
  getRuntimeSnapshot: getOrchestrationWorkspaceProjectionSnapshot,
  subscribeRuntime: subscribeOrchestrationWorkspaceProjection,
} as const;
