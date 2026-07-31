"use client";

import { TerasModalShell } from "@/teras";
import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import {
  getOperationWorkbenchSurfaceAttributes,
  type OperationWorkbenchDomainContract,
} from "../../../../operation-workbench/operation-workbench-contract.ts";
import { PrototypeControlSurface } from "../surface/prototype-control-surface.tsx";

export type PrototypeWorkspaceProps = {
  contract: OperationWorkbenchDomainContract;
  entryIntent?: ConsoleSurfaceEntryIntent | null;
  onClose: () => void;
};

export function PrototypeWorkspace({
  contract,
  entryIntent = null,
  onClose,
}: PrototypeWorkspaceProps) {
  return (
    <TerasModalShell
      bodyLayout="fill"
      description="Focused prototype control for registry inspection, candidate promotion, preview proof, baseline promotion preparation, movement request preparation, and receipt history."
      kicker="Prototype Control"
      modalAttributes={getOperationWorkbenchSurfaceAttributes(contract)}
      onClose={onClose}
      height="fill"
      surfaceId="prototype-control"
      title="Prototype Control"
      width="large"
    >
      <PrototypeControlSurface entryIntent={entryIntent} />
    </TerasModalShell>
  );
}
