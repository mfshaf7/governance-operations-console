"use client";

import { useState } from "react";
import { TerasPrimarySideLayout, TerasSurfaceStatusPanel, TerasPanel, TerasPanelHeader, TerasActionButton, TerasDialog } from "@/teras";
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
  onOpenSurface: (surfaceId: OrchestrationHomeTargetSurface, recordId?: string) => void;
  readModel: OrchestrationWorkspaceReadModel;
}) {
  const viewModel = getOrchestrationHomeViewModel(readModel);
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <><TerasPrimarySideLayout
      data-orchestration-home="true"
      primaryMain={
        <OrchestrationHomeAttentionPanel
          onOpenSurface={onOpenSurface}
          viewModel={viewModel}
        />
      }
      primaryTop={
        <TerasPanel frame="padded" treatment="rail" tone={viewModel.workspaceStatus.tone} fit="content">
          <TerasPanelHeader kicker="Service status" title={viewModel.workspaceStatus.statusLabel === "Live" ? "Services connected" : viewModel.workspaceStatus.title}
            description={viewModel.workspaceStatus.statusLabel === "Live" ? "Review run status and approval checks before acting." : viewModel.workspaceStatus.summary}
            actions={<TerasActionButton emphasis="secondary" onClick={() => setStatusOpen(true)}>Service details</TerasActionButton>} actionsLayout="inline" />
        </TerasPanel>
      }
      sideFill={<OrchestrationHomeMaterialEventsPanel viewModel={viewModel} />}
      sideTop={
        <OrchestrationHomeInFlightPanel
          onOpenSurface={onOpenSurface}
          viewModel={viewModel}
        />
      }
    />
    <TerasDialog open={statusOpen} onClose={() => setStatusOpen(false)} title="Orchestration services" kicker="Service status" height="content" width="wide" contentOverflow="auto">
      <TerasSurfaceStatusPanel model={projectOperationSurfaceStatusModel(viewModel.workspaceStatus)} signalAttribute="data-orchestration-home-status" />
    </TerasDialog></>
  );
}
