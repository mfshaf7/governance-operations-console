import type { LifecycleTransitionProjection } from "../read-model/lifecycle-transition-projection-types.ts";

export type LifecycleTransitionLiveMode = "disconnected-preview" | "live";

export type LifecycleTransitionLiveSnapshot = Readonly<{
  error: string | null;
  mode: LifecycleTransitionLiveMode;
  observedAt: string;
  status: "current" | "offline";
  transitions: readonly LifecycleTransitionProjection[];
  truncated: boolean;
}>;

export type LifecycleTransitionRuntimePosture = Pick<
  LifecycleTransitionLiveSnapshot,
  "error" | "mode" | "observedAt" | "status" | "truncated"
>;

export type LifecycleTransitionLiveApiError = Readonly<{
  code: string;
  error: string;
  mode: "live";
  status: "offline";
}>;
