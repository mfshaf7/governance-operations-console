import type {
  LifecycleTransitionProjection,
} from "./lifecycle-transition-projector.ts";
import type {
  LifecycleTransitionState,
} from "../model/lifecycle-transition-types.ts";

const LIFECYCLE_TRANSITION_STATES = [
  "prepared",
  "validating",
  "awaiting-admission",
  "awaiting-authority",
  "authorized",
  "applying",
  "applied",
  "blocked",
  "returned",
  "deferred",
  "rejected",
  "failed",
  "cancelled",
  "superseded",
] as const satisfies readonly LifecycleTransitionState[];

export function selectLifecycleTransitionById(
  transitions: readonly LifecycleTransitionProjection[],
  transitionId: string,
) {
  return (
    transitions.find(
      (transition) => transition.transitionId === transitionId,
    ) ?? null
  );
}

export function selectLifecycleTransitionsByState(
  transitions: readonly LifecycleTransitionProjection[],
  state: LifecycleTransitionState,
) {
  return transitions.filter((transition) => transition.state === state);
}

export function selectLifecycleTransitionsRequiringAction(
  transitions: readonly LifecycleTransitionProjection[],
) {
  return transitions.filter((transition) => transition.nextAction !== null);
}

export function summarizeLifecycleTransitionStates(
  transitions: readonly LifecycleTransitionProjection[],
): Record<LifecycleTransitionState, number> {
  const summary = Object.fromEntries(
    LIFECYCLE_TRANSITION_STATES.map((state) => [state, 0]),
  ) as Record<LifecycleTransitionState, number>;

  for (const transition of transitions) {
    summary[transition.state] += 1;
  }

  return summary;
}
