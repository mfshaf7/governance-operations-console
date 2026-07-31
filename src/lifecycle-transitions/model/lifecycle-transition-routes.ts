import type {
  LifecycleTransitionAdmissionMode,
  LifecycleTransitionCompletionEvidence,
  LifecycleTransitionDomain,
  LifecycleTransitionRouteId,
  LifecycleTransitionTarget,
} from "./lifecycle-transition-types.ts";

export type LifecycleTransitionRouteDefinition = Readonly<{
  admissionMode: LifecycleTransitionAdmissionMode;
  completionEvidence: LifecycleTransitionCompletionEvidence;
  executionOwnerRef: string;
  intentOwnerRef: string;
  routeId: LifecycleTransitionRouteId;
  sourceDomain: LifecycleTransitionDomain;
  target: LifecycleTransitionTarget;
  validationOwnerRef: string;
}>;

export const LIFECYCLE_TRANSITION_ROUTES = {
  "proposal-to-delivery": {
    admissionMode: "automatic",
    completionEvidence: "target-admission-receipt",
    executionOwnerRef: "operator-orchestration-service",
    intentOwnerRef: "proposal",
    routeId: "proposal-to-delivery",
    sourceDomain: "proposal",
    target: {
      admissionOwnerRef: "delivery-ingress-policy",
      applicationOwnerRef: "delivery-ingress-adapter",
      domain: "delivery",
      homeRef: "workspace-delivery-art",
      ingressRef: "delivery-intake",
      laneRef: "delivery-intake",
    },
    validationOwnerRef: "workspace-governance-control-fabric",
  },
  "proposal-to-prototype": {
    admissionMode: "automatic",
    completionEvidence: "target-application-receipt",
    executionOwnerRef: "operator-orchestration-service",
    intentOwnerRef: "proposal",
    routeId: "proposal-to-prototype",
    sourceDomain: "proposal",
    target: {
      admissionOwnerRef: "prototype-ingress-policy",
      applicationOwnerRef: "prototype-ingress-adapter",
      domain: "prototype",
      homeRef: "workspace-prototype-studio",
      ingressRef: "prototype-ingress",
      laneRef: "prototype-landing",
    },
    validationOwnerRef: "workspace-governance-control-fabric",
  },
  "prototype-to-delivery": {
    admissionMode: "automatic",
    completionEvidence: "target-application-receipt",
    executionOwnerRef: "operator-orchestration-service",
    intentOwnerRef: "prototype",
    routeId: "prototype-to-delivery",
    sourceDomain: "prototype",
    target: {
      admissionOwnerRef: "delivery-ingress-policy",
      applicationOwnerRef: "delivery-intake-consume",
      domain: "delivery",
      homeRef: "workspace-delivery-art",
      ingressRef: "delivery-intake",
      laneRef: "delivery-intake",
    },
    validationOwnerRef: "workspace-governance-control-fabric",
  },
} as const satisfies Record<
  LifecycleTransitionRouteId,
  LifecycleTransitionRouteDefinition
>;

export function lifecycleTransitionRoute(
  routeId: LifecycleTransitionRouteId,
): LifecycleTransitionRouteDefinition {
  return LIFECYCLE_TRANSITION_ROUTES[routeId];
}
