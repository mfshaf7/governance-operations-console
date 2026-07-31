"use client";

import { TerasModalShell } from "@/teras";
import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import {
  getOperationWorkbenchSurfaceAttributes,
  type OperationWorkbenchDomainContract,
} from "../../../../operation-workbench/operation-workbench-contract.ts";
import { ProposalControlSurface } from "../surface/proposal-control-surface.tsx";

export type ProposalWorkspaceProps = {
  contract: OperationWorkbenchDomainContract;
  entryIntent?: ConsoleSurfaceEntryIntent | null;
  onClose: () => void;
  onOpenRepositorySurface?: (proposalId: string) => void;
};

export function ProposalWorkspace({
  contract,
  entryIntent = null,
  onClose,
  onOpenRepositorySurface,
}: ProposalWorkspaceProps) {
  return (
    <TerasModalShell
      bodyLayout="fill"
      description="Focused proposal workflow control for proposal records and console capture."
      kicker="Proposal Control"
      modalAttributes={getOperationWorkbenchSurfaceAttributes(contract)}
      onClose={onClose}
      height="fill"
      surfaceId="proposal-control"
      title="Proposal Control"
      width="large"
    >
      <ProposalControlSurface
        entryIntent={entryIntent}
        onOpenRepositorySurface={onOpenRepositorySurface}
      />
    </TerasModalShell>
  );
}
