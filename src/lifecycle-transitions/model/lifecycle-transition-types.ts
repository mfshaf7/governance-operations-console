export const LIFECYCLE_TRANSITION_SCHEMA_VERSION = "1" as const;

export type LifecycleTransitionSchemaVersion =
  typeof LIFECYCLE_TRANSITION_SCHEMA_VERSION;

export type LifecycleTransitionDomain =
  | "delivery"
  | "proposal"
  | "prototype";

export type LifecycleTransitionRouteId =
  | "proposal-to-delivery"
  | "proposal-to-prototype"
  | "prototype-to-delivery";

export type LifecycleTransitionAdmissionMode =
  | "automatic"
  | "authority-review"
  | "target-review";

export type LifecycleTransitionCompletionEvidence =
  | "target-admission-receipt"
  | "target-application-receipt";

export type LifecycleTransitionState =
  | "applied"
  | "applying"
  | "authorized"
  | "awaiting-admission"
  | "awaiting-authority"
  | "blocked"
  | "cancelled"
  | "deferred"
  | "failed"
  | "prepared"
  | "rejected"
  | "returned"
  | "superseded"
  | "validating";

export type LifecycleTransitionAuthorityRole =
  | "decision-authority"
  | "orchestration"
  | "source-domain"
  | "target-adapter"
  | "target-domain"
  | "validation-authority";

export type LifecycleTransitionAuthority = Readonly<{
  ownerRef: string;
  role: LifecycleTransitionAuthorityRole;
}>;

export type LifecycleTransitionSource = Readonly<{
  domain: LifecycleTransitionDomain;
  ownerRef: string;
  projectionVersion: string;
  recordId: string;
  sourceVersion: string;
}>;

export type LifecycleTransitionTarget = Readonly<{
  admissionOwnerRef: string;
  applicationOwnerRef: string;
  domain: LifecycleTransitionDomain;
  homeRef: string;
  ingressRef: string;
  laneRef: string;
}>;

export type LifecycleTransitionAuthorityRequirement = Readonly<{
  authorityOwnerRef: string;
  controlId: string;
  evidenceType: string;
}>;

export type LifecycleTransitionGateState =
  | "blocked"
  | "not-required"
  | "passed";

export type LifecycleTransitionGateSnapshot = Readonly<{
  evidenceRef: string | null;
  gateId: string;
  ownerRef: string;
  requiredFix: string | null;
  state: LifecycleTransitionGateState;
}>;

export type LifecycleTransitionCorrection = Readonly<{
  ownerRef: string;
  reasonCode: string;
  requiredFix: string;
}>;

export type LifecycleTransitionNextActionCode =
  | "complete-application"
  | "complete-validation"
  | "correct-source"
  | "record-admission"
  | "record-authority-decision"
  | "resolve-gate"
  | "retry-application"
  | "review-deferred-transition"
  | "review-rejection"
  | "start-application"
  | "start-validation";

export type LifecycleTransitionNextAction = Readonly<{
  action: LifecycleTransitionNextActionCode;
  ownerRef: string;
  reviewAt: string | null;
}>;
