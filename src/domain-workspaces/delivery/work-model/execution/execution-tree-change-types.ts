import type { DeliveryChangeOperation } from "../../live-runtime/delivery-change-live-types.ts";

export type ExecutionTreeChangeDraftNode = {
  children: ExecutionTreeChangeDraftNode[];
  draftBody: string;
  id: string;
  kind: string;
  legacyWorkPackageId: number | null;
  targetPi?: string;
  iteration?: string;
  dependsOnIds?: string[];
  remark: string;
  title: string;
};

export type ExecutionTreeChangePlanItem = {
  buildOperation: (resolvedNodeIds: ReadonlyMap<string, string>) => DeliveryChangeOperation;
  id: string;
  label: string;
  localNodeId: string | null;
};
