"use client";

import { TerasModalShell, TerasSegmentedControl } from "@/teras";
import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import {
  getOperationWorkbenchSurfaceAttributes,
  type OperationWorkbenchDomainContract,
} from "../../../../operation-workbench/operation-workbench-contract.ts";
import { RepositoryRequestsSurface } from "../surface/repository-requests-surface.tsx";
import { RepositoryControlDialogStack } from "../surface/repository-control-dialog-stack.tsx";
import { RepositoryControlSurface } from "../surface/repository-control-surface.tsx";
import { useRepositoryControlController } from "../surface/use-repository-control-controller.ts";

export type RepositoryWorkspaceProps = {
  contract: OperationWorkbenchDomainContract;
  entryIntent?: ConsoleSurfaceEntryIntent | null;
  onClose: () => void;
  onOpenDeliveryCatalog?: (repositoryId: string) => void;
  onOpenProposalSurface?: (proposalId: string) => void;
};

export function RepositoryWorkspace({
  contract,
  entryIntent = null,
  onClose,
  onOpenDeliveryCatalog,
  onOpenProposalSurface,
}: RepositoryWorkspaceProps) {
  const controller = useRepositoryControlController({ entryIntent, onOpenDeliveryCatalog });
  return (
    <TerasModalShell
      bodyLayout="fill"
      description="Inspect repositories, review workspace registration and manage repository requests."
      headerActions={<TerasSegmentedControl ariaLabel="Repository views" value={controller.navigation.view}
        onValueChange={controller.navigation.setView} options={[
          {value: "requests", label: <span>Requests <span data-repository-request-count="true"
            aria-label={controller.repositoryRequests.attentionCount === null ? "Attention count unavailable" : `${controller.repositoryRequests.attentionCount} requests need attention`}
            title="Requests needing attention">({controller.repositoryRequests.attentionCount ?? "—"})</span></span>},
          {value: "repositories", label: "Repositories"},
        ]} />}
      kicker="Repository Control"
      modalAttributes={getOperationWorkbenchSurfaceAttributes(contract)}
      onClose={onClose}
      height="fill"
      surfaceId="repository-control"
      title="Repository Control"
      width="large"
    >
      {controller.navigation.view === "requests" ? <RepositoryRequestsSurface controller={controller}
        onOpenProposal={onOpenProposalSurface} /> : <RepositoryControlSurface entryIntent={entryIntent} controller={controller} />}
      <RepositoryControlDialogStack controller={controller} />
    </TerasModalShell>
  );
}
