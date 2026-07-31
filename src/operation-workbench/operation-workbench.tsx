import type { ReactNode } from "react";
import type {
  OperationWorkbenchDomainContract,
} from "./operation-workbench-contract";
import { getOperationWorkbenchSurfaceAttributes } from "./operation-workbench-contract";

export type OperationWorkbenchProps = {
  contract: OperationWorkbenchDomainContract;
  children: ReactNode;
};

export function OperationWorkbench({ contract, children }: OperationWorkbenchProps) {
  return (
    <section {...getOperationWorkbenchSurfaceAttributes(contract)}>
      {children}
    </section>
  );
}
