import type { ConsoleActivityEvent } from "../console-integration/activity-contract.ts";

export type GovernanceActivityMode = "disconnected-preview" | "live";
export type GovernanceActivityStatus = "current" | "offline" | "partial";
export type GovernanceActivitySourceState = "current" | "stale" | "unavailable";

export type GovernanceActivitySource = Readonly<{
  authority: string;
  errorCode: string | null;
  eventCount: number;
  label: string;
  observedAt: string;
  owner: string;
  sourceId: string;
  state: GovernanceActivitySourceState;
  truncated: boolean;
}>;

export type GovernanceActivitySnapshot = Readonly<{
  error: string | null;
  events: readonly ConsoleActivityEvent[];
  mode: GovernanceActivityMode;
  observedAt: string;
  sources: readonly GovernanceActivitySource[];
  status: GovernanceActivityStatus;
  truncated: boolean;
}>;
