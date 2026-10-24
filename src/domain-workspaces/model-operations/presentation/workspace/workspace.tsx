"use client";

import { useState } from "react";
import { TerasDraftCloseGuardDialog, TerasModalShell } from "@/teras";
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
  const [dirty, setDirty] = useState(false), [closeGuard, setCloseGuard] = useState(false);
  return (
    <>
    <TerasModalShell
      bodyLayout="fill"
      description="Model registration, workflow routing, native effort, explicit fallback and governed purpose profiles."
      kicker="Model Operations"
      modalAttributes={getOperationWorkbenchSurfaceAttributes(contract)}
      onClose={() => dirty ? setCloseGuard(true) : onClose()}
      height="fill"
      surfaceId="model-operations-control"
      title="Model Operations Control"
      width="large"
    >
      <ModelOperationsControlSurface onDirtyChange={setDirty} />
    </TerasModalShell>
    <TerasDraftCloseGuardDialog kicker="Routing draft" title="Discard unsaved routing changes?" description="Submitted operations remain recoverable from their owner records."
      open={closeGuard} keepEditingLabel="Keep editing" leaveLabel="Discard draft and close" onKeepEditing={() => setCloseGuard(false)} onLeave={onClose} />
    </>
  );
}
