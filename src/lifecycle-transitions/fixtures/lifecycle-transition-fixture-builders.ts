import type {
  LifecycleTransitionApplicationFailedArtifact,
  LifecycleTransitionApplicationStartedArtifact,
  LifecycleTransitionArtifact,
  LifecycleTransitionSourcePacketPreparedArtifact,
  LifecycleTransitionTargetAdmissionRecordedArtifact,
  LifecycleTransitionTargetApplicationRecordedArtifact,
  LifecycleTransitionValidationCompletedArtifact,
  LifecycleTransitionValidationStartedArtifact,
} from "../model/lifecycle-transition-artifacts.ts";
import { lifecycleTransitionRoute } from "../model/lifecycle-transition-routes.ts";
import {
  LIFECYCLE_TRANSITION_SCHEMA_VERSION,
  type LifecycleTransitionAuthority,
  type LifecycleTransitionAuthorityRequirement,
  type LifecycleTransitionGateSnapshot,
  type LifecycleTransitionRouteId,
} from "../model/lifecycle-transition-types.ts";

export type LifecycleTransitionFixtureContext = Readonly<{
  correlationId: string;
  reasonCode: string;
  reasonDetail: string;
  requiredAuthorityControls?: readonly LifecycleTransitionAuthorityRequirement[];
  routeId: LifecycleTransitionRouteId;
  sourceProjectionVersion: string;
  sourceRecordId: string;
  sourceVersion: string;
  startedAt: string;
  transitionId: string;
}>;

export function createLifecycleTransitionSourcePacketFixture(
  context: LifecycleTransitionFixtureContext,
): LifecycleTransitionSourcePacketPreparedArtifact {
  const route = lifecycleTransitionRoute(context.routeId);

  return {
    ...artifactBase(context, "source-packet-prepared", 0, {
      ownerRef: route.intentOwnerRef,
      role: "source-domain",
    }),
    idempotencyKey: `idempotency:${context.transitionId}`,
    packet: {
      digest: `sha256:fixture-${context.transitionId}`,
      packetRef: `packet://${context.transitionId}`,
      producerReceiptRef: `prototype-local://receipt/${context.transitionId}/prepared`,
      schemaRef: `lifecycle-transition://${context.routeId}/v1`,
    },
    reason: {
      code: context.reasonCode,
      detail: context.reasonDetail,
    },
    requiredAuthorityControls: context.requiredAuthorityControls ?? [],
    source: {
      domain: route.sourceDomain,
      ownerRef: route.intentOwnerRef,
      projectionVersion: context.sourceProjectionVersion,
      recordId: context.sourceRecordId,
      sourceVersion: context.sourceVersion,
    },
    supersedesTransitionId: null,
    target: route.target,
  };
}

export function createLifecycleTransitionValidationStartedFixture(
  context: LifecycleTransitionFixtureContext,
  sequence: number,
): LifecycleTransitionValidationStartedArtifact {
  const route = lifecycleTransitionRoute(context.routeId);

  return {
    ...artifactBase(context, "validation-started", sequence, {
      ownerRef: route.validationOwnerRef,
      role: "validation-authority",
    }),
    validationRunRef: `wgcf-run://${context.transitionId}`,
  };
}

export function createLifecycleTransitionValidationPassedFixture(
  context: LifecycleTransitionFixtureContext,
  sequence: number,
): LifecycleTransitionValidationCompletedArtifact {
  const route = lifecycleTransitionRoute(context.routeId);

  return {
    ...artifactBase(context, "validation-completed", sequence, {
      ownerRef: route.validationOwnerRef,
      role: "validation-authority",
    }),
    gates: passedValidationGates(context),
    outcome: "passed",
    receiptRef: `prototype-local://wgcf/${context.transitionId}/passed`,
    returnInstruction: null,
    validationRunRef: `wgcf-run://${context.transitionId}`,
  };
}

export function createLifecycleTransitionValidationReturnedFixture(
  context: LifecycleTransitionFixtureContext,
  sequence: number,
): LifecycleTransitionValidationCompletedArtifact {
  const route = lifecycleTransitionRoute(context.routeId);
  const sourceVersionGate: LifecycleTransitionGateSnapshot = {
    evidenceRef: null,
    gateId: "source-version-current",
    ownerRef: route.intentOwnerRef,
    requiredFix:
      "Refresh the Proposal projection and prepare a superseding packet from the current source version.",
    state: "blocked",
  };

  return {
    ...artifactBase(context, "validation-completed", sequence, {
      ownerRef: route.validationOwnerRef,
      role: "validation-authority",
    }),
    gates: [
      passedGate("route-allowed", route.validationOwnerRef),
      sourceVersionGate,
      passedGate("packet-schema-supported", route.validationOwnerRef),
    ],
    outcome: "returned",
    receiptRef: `prototype-local://wgcf/${context.transitionId}/returned`,
    returnInstruction: {
      ownerRef: route.intentOwnerRef,
      reasonCode: "source-version-stale",
      requiredFix: sourceVersionGate.requiredFix ?? "",
    },
    validationRunRef: `wgcf-run://${context.transitionId}`,
  };
}

export function createLifecycleTransitionTargetAdmissionFixture(
  context: LifecycleTransitionFixtureContext,
  sequence: number,
  targetRecordRef: string | null,
): LifecycleTransitionTargetAdmissionRecordedArtifact {
  const route = lifecycleTransitionRoute(context.routeId);

  return {
    ...artifactBase(context, "target-admission-recorded", sequence, {
      ownerRef: route.target.admissionOwnerRef,
      role: "target-domain",
    }),
    reasonCode: null,
    reasonDetail: null,
    receiptRef: `prototype-local://admission/${context.transitionId}`,
    result: "admitted",
    targetRecordRef,
  };
}

export function createLifecycleTransitionApplicationStartedFixture(
  context: LifecycleTransitionFixtureContext,
  sequence: number,
  runRef: string,
): LifecycleTransitionApplicationStartedArtifact {
  const route = lifecycleTransitionRoute(context.routeId);

  return {
    ...artifactBase(context, "application-started", sequence, {
      ownerRef: route.executionOwnerRef,
      role: "orchestration",
    }),
    adapterRef: route.target.applicationOwnerRef,
    runRef,
  };
}

export function createLifecycleTransitionTargetApplicationFixture(
  context: LifecycleTransitionFixtureContext,
  sequence: number,
  runRef: string,
  targetRecordRef: string,
): LifecycleTransitionTargetApplicationRecordedArtifact {
  const route = lifecycleTransitionRoute(context.routeId);

  return {
    ...artifactBase(context, "target-application-recorded", sequence, {
      ownerRef: route.target.applicationOwnerRef,
      role: "target-adapter",
    }),
    receiptRef: `prototype-local://application/${context.transitionId}`,
    resultingRefs: [targetRecordRef],
    runRef,
    targetRecordRef,
  };
}

export function createLifecycleTransitionApplicationFailedFixture(
  context: LifecycleTransitionFixtureContext,
  sequence: number,
  runRef: string,
): LifecycleTransitionApplicationFailedArtifact {
  const route = lifecycleTransitionRoute(context.routeId);

  return {
    ...artifactBase(context, "application-failed", sequence, {
      ownerRef: route.executionOwnerRef,
      role: "orchestration",
    }),
    adapterRef: route.target.applicationOwnerRef,
    failureCode: "target-adapter-timeout",
    failureDetail:
      "The target adapter timed out before a target application receipt was recorded.",
    retryable: true,
    runRef,
  };
}

function passedValidationGates(
  context: LifecycleTransitionFixtureContext,
): LifecycleTransitionGateSnapshot[] {
  const route = lifecycleTransitionRoute(context.routeId);

  return [
    passedGate("route-allowed", route.validationOwnerRef),
    passedGate("source-version-current", route.intentOwnerRef),
    passedGate("packet-schema-supported", route.validationOwnerRef),
    passedGate("source-custody-resolved", route.intentOwnerRef),
    passedGate("equivalent-transition-absent", route.validationOwnerRef),
    passedGate("target-adapter-available", route.target.admissionOwnerRef),
  ];
}

function passedGate(
  gateId: string,
  ownerRef: string,
): LifecycleTransitionGateSnapshot {
  return {
    evidenceRef: `fixture-evidence://${gateId}`,
    gateId,
    ownerRef,
    requiredFix: null,
    state: "passed",
  };
}

function artifactBase<TKind extends LifecycleTransitionArtifact["artifactKind"]>(
  context: LifecycleTransitionFixtureContext,
  artifactKind: TKind,
  sequence: number,
  authority: LifecycleTransitionAuthority,
) {
  return {
    artifactId: `${context.transitionId}:${sequence}:${artifactKind}`,
    artifactKind,
    authority,
    basisSourceVersion: context.sourceVersion,
    causationId:
      sequence === 0
        ? `source-action://${context.sourceRecordId}`
        : `${context.transitionId}:${sequence - 1}`,
    correlationId: context.correlationId,
    recordedAt: fixtureRecordedAt(context.startedAt, sequence),
    routeId: context.routeId,
    schemaVersion: LIFECYCLE_TRANSITION_SCHEMA_VERSION,
    sequence,
    transitionId: context.transitionId,
  } as const;
}

function fixtureRecordedAt(startedAt: string, sequence: number) {
  return new Date(Date.parse(startedAt) + sequence * 60_000).toISOString();
}
