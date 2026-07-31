import type { OperationTone } from "./operation-state.ts";

export type OperationSurfaceStatusSignalId =
  "backend" | "oos" | "projection" | "write-path";

export type OperationSurfaceStatusState =
  | "blocked"
  | "current"
  | "degraded"
  | "denied"
  | "failed"
  | "local"
  | "offline"
  | "online"
  | "ready"
  | "stale"
  | "syncing";

export type OperationSurfaceStatusFact = {
  label: string;
  value: string;
};

export type OperationSurfaceStatusItem = {
  detail: string;
  facts: OperationSurfaceStatusFact[];
  id: OperationSurfaceStatusSignalId | string;
  label: string;
  state: OperationSurfaceStatusState;
  tone?: OperationTone;
};

export type OperationSurfaceStatusModel = {
  ariaLabel: string;
  detailDataAttribute?: string;
  items: OperationSurfaceStatusItem[];
  kicker: string;
  statusLabel: string;
  summary: string;
  title: string;
  tone: OperationTone;
};
