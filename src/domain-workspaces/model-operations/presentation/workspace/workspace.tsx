"use client";

import { TerasModalShell } from "@/teras";
import {
  getOperationWorkbenchSurfaceAttributes,
  type OperationWorkbenchDomainContract,
} from "../../../../operation-workbench/operation-workbench-contract.ts";

import { ModelOperationsControlSurface } from "../surface/model-operations-control-surface.tsx";

export type ModelOperationsWorkspaceProps = {
  contract: OperationWorkbenchDomainContract;
  onClose: () => void;
};

export function ModelOperationsWorkspace({
  contract,
  onClose,
}: ModelOperationsWorkspaceProps) {
  return (
    <TerasModalShell
      bodyLayout="fill"
      description="Governed profile availability, caller eligibility, access readiness, and control evidence."
      kicker="Model Operations"
      modalAttributes={getOperationWorkbenchSurfaceAttributes(contract)}
      onClose={onClose}
      height="fill"
      surfaceId="model-operations-control"
      title="Model Operations Control"
      width="large"
    >
      <ModelOperationsControlSurface />
    </TerasModalShell>
  );
}
