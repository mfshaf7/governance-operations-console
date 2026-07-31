import type {
  LifecycleTransitionArtifact,
  LifecycleTransitionSourcePacketPreparedArtifact,
} from "../model/lifecycle-transition-artifacts.ts";
import type {
  LifecycleTransitionRouteDefinition,
} from "../model/lifecycle-transition-routes.ts";
import type {
  LifecycleTransitionAuthorityRequirement,
  LifecycleTransitionCorrection,
  LifecycleTransitionGateSnapshot,
  LifecycleTransitionNextAction,
  LifecycleTransitionState,
} from "../model/lifecycle-transition-types.ts";

export type LifecycleTransitionValidationProjection = Readonly<{
  gates: readonly LifecycleTransitionGateSnapshot[];
  receiptRef: string | null;
  runRef: string | null;
  state: "blocked" | "not-started" | "passed" | "returned" | "running";
}>;

export type LifecycleTransitionAdmissionProjection = Readonly<{
  reasonCode: string | null;
  receiptRef: string | null;
  recordedAt: string | null;
  state: "admitted" | "not-started" | "rejected";
  targetRecordRef: string | null;
}>;

export type LifecycleTransitionAuthorityDecisionProjection =
  LifecycleTransitionAuthorityRequirement &
    Readonly<{
      decision: "approved" | "deferred" | "pending";
      justification: string | null;
      receiptRef: string | null;
      recordedAt: string | null;
      reviewAt: string | null;
    }>;

export type LifecycleTransitionApplicationProjection = Readonly<{
  adapterRef: string;
  evidenceKind:
    | LifecycleTransitionRouteDefinition["completionEvidence"]
    | null;
  failureCode: string | null;
  failureDetail: string | null;
  receiptRef: string | null;
  recordedAt: string | null;
  resultingRefs: readonly string[];
  retryable: boolean | null;
  runRef: string | null;
  state: "applied" | "failed" | "not-started" | "running";
  targetRecordRef: string | null;
}>;

export type LifecycleTransitionProjection = Readonly<{
  admission: LifecycleTransitionAdmissionProjection;
  application: LifecycleTransitionApplicationProjection;
  authorityDecisions: readonly LifecycleTransitionAuthorityDecisionProjection[];
  blockedGate: LifecycleTransitionGateSnapshot | null;
  cancelledReasonCode: string | null;
  correlationId: string;
  correction: LifecycleTransitionCorrection | null;
  deferred: Readonly<{
    justification: string;
    reasonCode: string;
    reviewAt: string;
  }> | null;
  history: readonly LifecycleTransitionArtifact[];
  idempotencyKey: string;
  nextAction: LifecycleTransitionNextAction | null;
  packet: LifecycleTransitionSourcePacketPreparedArtifact["packet"];
  reason: LifecycleTransitionSourcePacketPreparedArtifact["reason"];
  rejection: Readonly<{
    reasonCode: string;
    reasonDetail: string;
  }> | null;
  route: LifecycleTransitionRouteDefinition;
  source: LifecycleTransitionSourcePacketPreparedArtifact["source"];
  state: LifecycleTransitionState;
  supersededByTransitionId: string | null;
  supersedesTransitionId: string | null;
  target: LifecycleTransitionSourcePacketPreparedArtifact["target"];
  transitionId: string;
  updatedAt: string;
  validation: LifecycleTransitionValidationProjection;
}>;

export type MutableLifecycleTransitionProjectionState = {
  admission: LifecycleTransitionAdmissionProjection;
  application: LifecycleTransitionApplicationProjection;
  authorityDecisions: LifecycleTransitionAuthorityDecisionProjection[];
  blockedGate: LifecycleTransitionGateSnapshot | null;
  cancelledReasonCode: string | null;
  correction: LifecycleTransitionCorrection | null;
  deferred: LifecycleTransitionProjection["deferred"];
  rejection: LifecycleTransitionProjection["rejection"];
  state: LifecycleTransitionState;
  supersededByTransitionId: string | null;
  updatedAt: string;
  validation: LifecycleTransitionValidationProjection;
};
