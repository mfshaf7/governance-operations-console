"use client";

import { TerasSurfaceStatusPanel } from "@/teras";
import { projectOperationSurfaceStatusModel } from "@/domain-workspaces/operation-projections";

import type { DeliveryHomeWorkspaceStatus } from "./home-view-model.ts";

export function DeliveryHomeWorkspaceStatusPanel({
  workspaceStatus,
}: {
  workspaceStatus: DeliveryHomeWorkspaceStatus;
}) {
  return (
    <TerasSurfaceStatusPanel
      model={projectOperationSurfaceStatusModel(workspaceStatus)}
      signalAttribute="data-delivery-home-status"
    />
  );
}
