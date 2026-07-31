import type { OperationTone } from "../../../operation-projections/index.ts";
import type { OrchestrationWorkspaceReadModel } from "../../read-model/workspace/orchestration-workspace-read-model.ts";

export type OrchestrationWorkspaceSurfaceId = "home" | "definitions" | "runs";

export type OrchestrationWorkspaceSurface = {
  id: OrchestrationWorkspaceSurfaceId;
  kicker: string;
  title: string;
  tone: OperationTone;
};

export const orchestrationWorkspaceSurfaces: OrchestrationWorkspaceSurface[] = [
  {
    id: "home",
    kicker: "01",
    title: "Home",
    tone: "warn",
  },
  {
    id: "definitions",
    kicker: "02",
    title: "Definitions",
    tone: "info",
  },
  {
    id: "runs",
    kicker: "03",
    title: "Runs",
    tone: "info",
  },
];

export function orchestrationWorkspaceSummaryMetrics(
  readModel: OrchestrationWorkspaceReadModel,
  surfaceId: OrchestrationWorkspaceSurfaceId,
) {
  return readModel.summary[surfaceId];
}

export function orchestrationWorkspaceSummaryTitle(
  surfaceId: OrchestrationWorkspaceSurfaceId,
) {
  switch (surfaceId) {
    case "definitions":
      return "Definition State";
    case "runs":
      return "Run State";
    default:
      return "Orchestration State";
  }
}

export function orchestrationWorkspaceNavMeta(
  readModel: OrchestrationWorkspaceReadModel,
  surfaceId: OrchestrationWorkspaceSurfaceId,
) {
  switch (surfaceId) {
    case "definitions":
      return String(readModel.definitions.length);
    case "runs":
      return String(readModel.runs.length);
    default:
      return "Command";
  }
}
