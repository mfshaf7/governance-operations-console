"use client";

import { TerasModalShell } from "@/teras";
import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import {
  getOperationWorkbenchSurfaceAttributes,
  type OperationWorkbenchDomainContract,
} from "../../../../operation-workbench/operation-workbench-contract.ts";
import { RepositoryControlSurface } from "../surface/repository-control-surface.tsx";

export type RepositoryWorkspaceProps = {
  contract: OperationWorkbenchDomainContract;
  entryIntent?: ConsoleSurfaceEntryIntent | null;
  onClose: () => void;
};

export function RepositoryWorkspace({
  contract,
  entryIntent = null,
  onClose,
}: RepositoryWorkspaceProps) {
  return (
    <TerasModalShell
      bodyLayout="fill"
      description="Focused repository control for request, register inspection, admission readiness, and governed lifecycle actions."
      kicker="Repository Control"
      modalAttributes={getOperationWorkbenchSurfaceAttributes(contract)}
      onClose={onClose}
      height="fill"
      surfaceId="repository-control"
      title="Repository Control"
      width="large"
    >
      <RepositoryControlSurface entryIntent={entryIntent} />
    </TerasModalShell>
  );
}
