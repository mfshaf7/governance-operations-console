import type {
  LifecycleTransitionAuthority,
  LifecycleTransitionAuthorityRequirement,
  LifecycleTransitionCorrection,
  LifecycleTransitionGateSnapshot,
  LifecycleTransitionRouteId,
  LifecycleTransitionSchemaVersion,
  LifecycleTransitionSource,
  LifecycleTransitionTarget,
} from "./lifecycle-transition-types.ts";

type LifecycleTransitionArtifactBase<TKind extends string> = Readonly<{
  artifactId: string;
  artifactKind: TKind;
  authority: LifecycleTransitionAuthority;
  basisSourceVersion: string;
  causationId: string;
  correlationId: string;
  recordedAt: string;
  routeId: LifecycleTransitionRouteId;
  schemaVersion: LifecycleTransitionSchemaVersion;
  sequence: number;
  transitionId: string;
}>;

export type LifecycleTransitionSourcePacketPreparedArtifact =
  LifecycleTransitionArtifactBase<"source-packet-prepared"> &
    Readonly<{
      idempotencyKey: string;
      packet: Readonly<{
        digest: string;
        packetRef: string;
        producerReceiptRef: string;
        schemaRef: string;
      }>;
      reason: Readonly<{
        code: string;
        detail: string;
      }>;
      requiredAuthorityControls: readonly LifecycleTransitionAuthorityRequirement[];
      source: LifecycleTransitionSource;
      supersedesTransitionId: string | null;
      target: LifecycleTransitionTarget;
    }>;

export type LifecycleTransitionValidationStartedArtifact =
  LifecycleTransitionArtifactBase<"validation-started"> &
    Readonly<{
      validationRunRef: string;
    }>;

export type LifecycleTransitionValidationCompletedArtifact =
  LifecycleTransitionArtifactBase<"validation-completed"> &
    Readonly<{
      gates: readonly LifecycleTransitionGateSnapshot[];
      outcome: "blocked" | "passed" | "returned";
      receiptRef: string;
      returnInstruction: LifecycleTransitionCorrection | null;
      validationRunRef: string;
    }>;

export type LifecycleTransitionTargetAdmissionRecordedArtifact =
  LifecycleTransitionArtifactBase<"target-admission-recorded"> &
    Readonly<{
      reasonCode: string | null;
      reasonDetail: string | null;
      receiptRef: string;
      result: "admitted" | "rejected";
      targetRecordRef: string | null;
    }>;

export type LifecycleTransitionAuthorityDecisionRecordedArtifact =
  LifecycleTransitionArtifactBase<"authority-decision-recorded"> &
    Readonly<{
      controlId: string;
      decision: "approved" | "deferred";
      justification: string;
      receiptRef: string;
      reviewAt: string | null;
    }>;

export type LifecycleTransitionApplicationStartedArtifact =
  LifecycleTransitionArtifactBase<"application-started"> &
    Readonly<{
      adapterRef: string;
      runRef: string;
    }>;

export type LifecycleTransitionTargetApplicationRecordedArtifact =
  LifecycleTransitionArtifactBase<"target-application-recorded"> &
    Readonly<{
      receiptRef: string;
      resultingRefs: readonly string[];
      runRef: string;
      targetRecordRef: string;
    }>;

export type LifecycleTransitionApplicationFailedArtifact =
  LifecycleTransitionArtifactBase<"application-failed"> &
    Readonly<{
      adapterRef: string;
      failureCode: string;
      failureDetail: string;
      retryable: boolean;
      runRef: string;
    }>;

export type LifecycleTransitionGateBlockedArtifact =
  LifecycleTransitionArtifactBase<"gate-blocked"> &
    Readonly<{
      gate: LifecycleTransitionGateSnapshot & {
        state: "blocked";
      };
    }>;

export type LifecycleTransitionSourceCorrectionReturnedArtifact =
  LifecycleTransitionArtifactBase<"source-correction-returned"> &
    Readonly<{
      instruction: LifecycleTransitionCorrection;
      receiptRef: string;
    }>;

export type LifecycleTransitionDeferredArtifact =
  LifecycleTransitionArtifactBase<"transition-deferred"> &
    Readonly<{
      justification: string;
      reasonCode: string;
      reviewAt: string;
    }>;

export type LifecycleTransitionCancelledArtifact =
  LifecycleTransitionArtifactBase<"transition-cancelled"> &
    Readonly<{
      reasonCode: string;
      receiptRef: string;
    }>;

export type LifecycleTransitionSupersededArtifact =
  LifecycleTransitionArtifactBase<"transition-superseded"> &
    Readonly<{
      receiptRef: string;
      replacementTransitionId: string;
    }>;

export type LifecycleTransitionArtifact =
  | LifecycleTransitionApplicationFailedArtifact
  | LifecycleTransitionApplicationStartedArtifact
  | LifecycleTransitionAuthorityDecisionRecordedArtifact
  | LifecycleTransitionCancelledArtifact
  | LifecycleTransitionDeferredArtifact
  | LifecycleTransitionGateBlockedArtifact
  | LifecycleTransitionSourceCorrectionReturnedArtifact
  | LifecycleTransitionSourcePacketPreparedArtifact
  | LifecycleTransitionSupersededArtifact
  | LifecycleTransitionTargetAdmissionRecordedArtifact
  | LifecycleTransitionTargetApplicationRecordedArtifact
  | LifecycleTransitionValidationCompletedArtifact
  | LifecycleTransitionValidationStartedArtifact;
