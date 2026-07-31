"use client";

import { TerasPrimarySideLayout, TerasSurfaceStatusPanel } from "@/teras";
import { projectOperationSurfaceStatusModel } from "@/domain-workspaces/operation-projections";

import type { OrchestrationWorkspaceReadModel } from "../../../read-model/workspace/orchestration-workspace-read-model.ts";
import { OrchestrationHomeAttentionPanel } from "./orchestration-home-attention-panel.tsx";
import { OrchestrationHomeInFlightPanel } from "./orchestration-home-in-flight-panel.tsx";
import { OrchestrationHomeMaterialEventsPanel } from "./orchestration-home-material-events-panel.tsx";
import {
  getOrchestrationHomeViewModel,
  type OrchestrationHomeTargetSurface,
} from "./orchestration-home-view-model.ts";

export function OrchestrationHomeSurface({
  onOpenSurface,
  readModel,
}: {
  onOpenSurface: (surfaceId: OrchestrationHomeTargetSurface) => void;
  readModel: OrchestrationWorkspaceReadModel;
}) {
  const viewModel = getOrchestrationHomeViewModel(readModel);

  return (
    <TerasPrimarySideLayout
      data-orchestration-home="true"
      primaryMain={
        <OrchestrationHomeAttentionPanel
          onOpenSurface={onOpenSurface}
          viewModel={viewModel}
        />
      }
      primaryTop={
        <TerasSurfaceStatusPanel
          model={projectOperationSurfaceStatusModel(viewModel.workspaceStatus)}
          signalAttribute="data-orchestration-home-status"
        />
      }
      sideFill={<OrchestrationHomeMaterialEventsPanel viewModel={viewModel} />}
      sideTop={
        <OrchestrationHomeInFlightPanel
          onOpenSurface={onOpenSurface}
          viewModel={viewModel}
        />
      }
    />
  );
}
