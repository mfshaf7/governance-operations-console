"use client";

import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import type { OperationWorkbenchDomainContract } from "../../../../operation-workbench/operation-workbench-contract.ts";
import { DeliveryWorkspaceController } from "./workspace-controller.tsx";

export type DeliveryWorkspaceProps = {
  contract: OperationWorkbenchDomainContract;
  entryIntent?: ConsoleSurfaceEntryIntent | null;
  onClose: () => void;
};

export function DeliveryWorkspace({
  contract,
  entryIntent = null,
  onClose,
}: DeliveryWorkspaceProps) {
  return (
    <DeliveryWorkspaceController
      contract={contract}
      entryIntent={entryIntent}
      onClose={onClose}
    />
  );
}
