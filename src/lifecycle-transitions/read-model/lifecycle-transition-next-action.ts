import type {
  LifecycleTransitionRouteDefinition,
} from "../model/lifecycle-transition-routes.ts";
import type {
  LifecycleTransitionNextAction,
} from "../model/lifecycle-transition-types.ts";
import type {
  MutableLifecycleTransitionProjectionState,
} from "./lifecycle-transition-projection-types.ts";

export function projectLifecycleTransitionNextAction(
  projection: MutableLifecycleTransitionProjectionState,
  route: LifecycleTransitionRouteDefinition,
): LifecycleTransitionNextAction | null {
  switch (projection.state) {
    case "prepared":
      return nextAction("start-validation", route.validationOwnerRef);
    case "validating":
      return nextAction("complete-validation", route.validationOwnerRef);
    case "awaiting-authority": {
      const pending = projection.authorityDecisions.find(
        (decision) => decision.decision !== "approved",
      );
      return nextAction(
        "record-authority-decision",
        pending?.authorityOwnerRef ?? route.validationOwnerRef,
        pending?.reviewAt ?? null,
      );
    }
    case "awaiting-admission":
      return nextAction("record-admission", route.target.admissionOwnerRef);
    case "authorized":
      return nextAction("start-application", route.executionOwnerRef);
    case "applying":
      return nextAction("complete-application", route.executionOwnerRef);
    case "blocked":
      return nextAction(
        "resolve-gate",
        projection.blockedGate?.ownerRef ?? route.validationOwnerRef,
      );
    case "returned":
      return nextAction(
        "correct-source",
        projection.correction?.ownerRef ?? route.intentOwnerRef,
      );
    case "deferred":
      return nextAction(
        "review-deferred-transition",
        projection.authorityDecisions.find(
          (decision) => decision.decision === "deferred",
        )?.authorityOwnerRef ?? route.intentOwnerRef,
        projection.deferred?.reviewAt ?? null,
      );
    case "rejected":
      return nextAction("review-rejection", route.intentOwnerRef);
    case "failed":
      return nextAction("retry-application", route.executionOwnerRef);
    case "applied":
    case "cancelled":
    case "superseded":
      return null;
  }
}

function nextAction(
  action: LifecycleTransitionNextAction["action"],
  ownerRef: string,
  reviewAt: string | null = null,
): LifecycleTransitionNextAction {
  return {
    action,
    ownerRef,
    reviewAt,
  };
}
