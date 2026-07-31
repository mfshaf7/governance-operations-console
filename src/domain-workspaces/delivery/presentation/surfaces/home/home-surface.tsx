"use client";

import type { DeliveryReadModel } from "../../../read-model/index.ts";

import { TerasPrimarySideLayout } from "@/teras";

import type { DeliveryWorkspaceSurfaceId } from "../../workspace/workspace-types.ts";
import {
  getDeliveryHomeViewModel,
  type DeliveryHomeTarget,
} from "./home-view-model.ts";
import { DeliveryHomeAgentConsole } from "./home-agent-console.tsx";
import { DeliveryHomeAttentionQueuePanel } from "./home-attention-queue-panel.tsx";
import { DeliveryHomeRecentActivityPanel } from "./home-recent-activity-panel.tsx";
import { DeliveryHomeWorkspaceStatusPanel } from "./home-workspace-status-panel.tsx";

export function DeliveryHomeSurface({
  model,
  onActiveSurfaceChange,
  onOpenPackageAction,
}: {
  model: DeliveryReadModel;
  onActiveSurfaceChange: (surfaceId: DeliveryWorkspaceSurfaceId) => void;
  onOpenPackageAction: (target: DeliveryHomeTarget) => void;
}) {
  const viewModel = getDeliveryHomeViewModel(model);

  function routeToTarget(
    target: DeliveryHomeTarget | { surfaceId: "catalog" } | null,
  ) {
    if (!target) {
      return;
    }

    if (
      ("packageId" in target && target.packageId) ||
      ("sourceId" in target && target.sourceId)
    ) {
      onOpenPackageAction(target);
      return;
    }

    onActiveSurfaceChange(target.surfaceId);
  }

  return (
    <TerasPrimarySideLayout
      data-delivery-home="home"
      primaryTop={
        <DeliveryHomeWorkspaceStatusPanel
          workspaceStatus={viewModel.workspaceStatus}
        />
      }
      primaryMain={
        <DeliveryHomeAttentionQueuePanel
          attentionQueue={viewModel.attentionQueue}
          onRouteToTarget={routeToTarget}
        />
      }
      sideTop={
        <DeliveryHomeRecentActivityPanel
          recentActivity={viewModel.recentActivity}
        />
      }
      sideFill={<DeliveryHomeAgentConsole viewModel={viewModel} />}
      sideFillProps={{ "data-delivery-home-agent-console": "true" }}
    />
  );
}
