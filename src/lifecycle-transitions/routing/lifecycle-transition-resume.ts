import type { ConsoleEntryIntent } from "../../console-architecture.ts";
import type { LifecycleTransitionRuntimePosture } from "../live-runtime/lifecycle-transition-live-types.ts";
import type { LifecycleTransitionProjection } from "../read-model/lifecycle-transition-projection-types.ts";

export type LifecycleTransitionResumeResolution =
  | Readonly<{ state: "inactive" }>
  | Readonly<{
      routeId: LifecycleTransitionProjection["route"]["routeId"];
      state: "ready";
      transitionId: string;
    }>
  | Readonly<{
      code:
        | "canonical-source-truncated"
        | "canonical-source-unavailable"
        | "conflicting-transition"
        | "stale-required-move"
        | "unknown-transition";
      message: string;
      state: "blocked";
    }>;

export function resolveLifecycleTransitionResume({
  entryIntent,
  runtimePosture,
  transitions,
}: {
  entryIntent: ConsoleEntryIntent | null | undefined;
  runtimePosture: LifecycleTransitionRuntimePosture | null;
  transitions: readonly LifecycleTransitionProjection[];
}): LifecycleTransitionResumeResolution {
  if (!entryIntent) return { state: "inactive" };

  if (
    !runtimePosture ||
    runtimePosture.mode !== "live" ||
    runtimePosture.status !== "current"
  ) {
    return {
      code: "canonical-source-unavailable",
      message:
        "Canonical Lifecycle Transition state is unavailable. Restore the OOS projection, then reopen this transition from Focus.",
      state: "blocked",
    };
  }

  if (runtimePosture.truncated) {
    return {
      code: "canonical-source-truncated",
      message:
        "The current Lifecycle Transition projection is truncated, so this exact transition cannot be proven. Narrow or refresh owner truth before continuing.",
      state: "blocked",
    };
  }

  const matches = transitions.filter(
    (transition) => transition.transitionId === entryIntent.subjectRef,
  );
  if (matches.length === 0) {
    return {
      code: "unknown-transition",
      message:
        "The requested transition is not present in current canonical owner truth. Reopen it from Focus instead of continuing from stale browser context.",
      state: "blocked",
    };
  }
  if (matches.length > 1) {
    return {
      code: "conflicting-transition",
      message:
        "Canonical owner truth returned conflicting records for this transition. No owner action is available until OOS resolves the duplicate identity.",
      state: "blocked",
    };
  }

  const transition = matches[0];
  const currentRequiredMoveRef = transition.nextAction
    ? `lifecycle-transition.${transition.nextAction.action}`
    : "lifecycle-transition.inspect";
  if (entryIntent.requiredMoveRef !== currentRequiredMoveRef) {
    return {
      code: "stale-required-move",
      message:
        "This transition changed after the navigation request was created. Review its current canonical state before taking another action.",
      state: "blocked",
    };
  }

  return {
    routeId: transition.route.routeId,
    state: "ready",
    transitionId: transition.transitionId,
  };
}
