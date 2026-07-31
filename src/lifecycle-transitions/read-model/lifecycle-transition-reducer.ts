import type {
  LifecycleTransitionArtifact,
  LifecycleTransitionAuthorityDecisionRecordedArtifact,
  LifecycleTransitionSourcePacketPreparedArtifact,
} from "../model/lifecycle-transition-artifacts.ts";
import type {
  LifecycleTransitionRouteDefinition,
} from "../model/lifecycle-transition-routes.ts";
import type {
  LifecycleTransitionState,
} from "../model/lifecycle-transition-types.ts";
import {
  assertLifecycleTransitionAdmissionArtifact,
  assertLifecycleTransitionCurrentRun,
  assertLifecycleTransitionValidationOutcome,
  invalidLifecycleTransitionSequence,
  requiredLifecycleTransitionValue,
  requireLifecycleTransitionState,
} from "./lifecycle-transition-invariants.ts";
import type {
  MutableLifecycleTransitionProjectionState,
} from "./lifecycle-transition-projection-types.ts";

const TERMINAL_STATES = new Set<LifecycleTransitionState>([
  "applied",
  "cancelled",
  "superseded",
]);

export function createInitialLifecycleTransitionProjectionState(
  packet: LifecycleTransitionSourcePacketPreparedArtifact,
  route: LifecycleTransitionRouteDefinition,
): MutableLifecycleTransitionProjectionState {
  return {
    admission: {
      reasonCode: null,
      receiptRef: null,
      recordedAt: null,
      state: "not-started",
      targetRecordRef: null,
    },
    application: {
      adapterRef: route.target.applicationOwnerRef,
      evidenceKind: null,
      failureCode: null,
      failureDetail: null,
      receiptRef: null,
      recordedAt: null,
      resultingRefs: [],
      retryable: null,
      runRef: null,
      state: "not-started",
      targetRecordRef: null,
    },
    authorityDecisions: packet.requiredAuthorityControls.map((requirement) => ({
      ...requirement,
      decision: "pending",
      justification: null,
      receiptRef: null,
      recordedAt: null,
      reviewAt: null,
    })),
    blockedGate: null,
    cancelledReasonCode: null,
    correction: null,
    deferred: null,
    rejection: null,
    state: "prepared",
    supersededByTransitionId: null,
    updatedAt: packet.recordedAt,
    validation: {
      gates: [],
      receiptRef: null,
      runRef: null,
      state: "not-started",
    },
  };
}

export function reduceLifecycleTransitionArtifact(
  projection: MutableLifecycleTransitionProjectionState,
  artifact: Exclude<
    LifecycleTransitionArtifact,
    LifecycleTransitionSourcePacketPreparedArtifact
  >,
  route: LifecycleTransitionRouteDefinition,
) {
  if (
    TERMINAL_STATES.has(projection.state) &&
    artifact.artifactKind !== "transition-superseded"
  ) {
    throw invalidLifecycleTransitionSequence(artifact, projection.state);
  }

  switch (artifact.artifactKind) {
    case "validation-started":
      startValidation(projection, artifact);
      return;
    case "validation-completed":
      completeValidation(projection, artifact);
      return;
    case "authority-decision-recorded":
      recordAuthorityDecision(projection, artifact);
      return;
    case "target-admission-recorded":
      recordTargetAdmission(projection, artifact, route);
      return;
    case "application-started":
      startApplication(projection, artifact, route);
      return;
    case "application-failed":
      failApplication(projection, artifact);
      return;
    case "target-application-recorded":
      recordTargetApplication(projection, artifact, route);
      return;
    case "gate-blocked":
      requireLifecycleTransitionState(artifact, projection.state, [
        "authorized",
        "awaiting-admission",
        "awaiting-authority",
        "prepared",
        "validating",
      ]);
      projection.blockedGate = artifact.gate;
      projection.state = "blocked";
      return;
    case "source-correction-returned":
      requireLifecycleTransitionState(artifact, projection.state, [
        "authorized",
        "awaiting-admission",
        "awaiting-authority",
        "blocked",
        "validating",
      ]);
      projection.correction = artifact.instruction;
      projection.state = "returned";
      return;
    case "transition-deferred":
      requireLifecycleTransitionState(artifact, projection.state, [
        "authorized",
        "awaiting-admission",
        "awaiting-authority",
        "blocked",
        "prepared",
        "validating",
      ]);
      projection.deferred = {
        justification: artifact.justification,
        reasonCode: artifact.reasonCode,
        reviewAt: artifact.reviewAt,
      };
      projection.state = "deferred";
      return;
    case "transition-cancelled":
      requireLifecycleTransitionState(artifact, projection.state, [
        "authorized",
        "awaiting-admission",
        "awaiting-authority",
        "blocked",
        "deferred",
        "failed",
        "prepared",
        "rejected",
        "returned",
        "validating",
      ]);
      projection.cancelledReasonCode = artifact.reasonCode;
      projection.state = "cancelled";
      return;
    case "transition-superseded":
      requireLifecycleTransitionState(artifact, projection.state, [
        "authorized",
        "awaiting-admission",
        "awaiting-authority",
        "blocked",
        "deferred",
        "failed",
        "prepared",
        "rejected",
        "returned",
        "validating",
      ]);
      projection.supersededByTransitionId = artifact.replacementTransitionId;
      projection.state = "superseded";
      return;
  }
}

export function lifecycleTransitionHasPendingAuthority(
  projection: MutableLifecycleTransitionProjectionState,
) {
  return projection.authorityDecisions.some(
    (decision) => decision.decision !== "approved",
  );
}

function startValidation(
  projection: MutableLifecycleTransitionProjectionState,
  artifact: Extract<
    LifecycleTransitionArtifact,
    { artifactKind: "validation-started" }
  >,
) {
  requireLifecycleTransitionState(artifact, projection.state, ["prepared"]);
  projection.validation = {
    ...projection.validation,
    runRef: artifact.validationRunRef,
    state: "running",
  };
  projection.state = "validating";
}

function completeValidation(
  projection: MutableLifecycleTransitionProjectionState,
  artifact: Extract<
    LifecycleTransitionArtifact,
    { artifactKind: "validation-completed" }
  >,
) {
  requireLifecycleTransitionState(artifact, projection.state, ["validating"]);
  assertLifecycleTransitionValidationOutcome(artifact);
  projection.validation = {
    gates: artifact.gates,
    receiptRef: artifact.receiptRef,
    runRef: artifact.validationRunRef,
    state: artifact.outcome,
  };

  if (artifact.outcome === "blocked") {
    projection.blockedGate =
      artifact.gates.find((gate) => gate.state === "blocked") ?? null;
    projection.state = "blocked";
    return;
  }

  if (artifact.outcome === "returned") {
    projection.correction = artifact.returnInstruction;
    projection.state = "returned";
    return;
  }

  projection.state = lifecycleTransitionHasPendingAuthority(projection)
    ? "awaiting-authority"
    : "awaiting-admission";
}

function recordAuthorityDecision(
  projection: MutableLifecycleTransitionProjectionState,
  artifact: LifecycleTransitionAuthorityDecisionRecordedArtifact,
) {
  requireLifecycleTransitionState(artifact, projection.state, [
    "awaiting-authority",
    "deferred",
  ]);
  const index = projection.authorityDecisions.findIndex(
    (decision) => decision.controlId === artifact.controlId,
  );

  if (index < 0) {
    throw new Error(
      `${artifact.artifactId} does not match a required authority control.`,
    );
  }

  projection.authorityDecisions[index] = {
    ...projection.authorityDecisions[index],
    decision: artifact.decision,
    justification: artifact.justification,
    receiptRef: artifact.receiptRef,
    recordedAt: artifact.recordedAt,
    reviewAt: artifact.reviewAt,
  };

  if (artifact.decision === "deferred") {
    projection.deferred = {
      justification: artifact.justification,
      reasonCode: `authority-deferred:${artifact.controlId}`,
      reviewAt: requiredLifecycleTransitionValue(
        artifact.reviewAt,
        `${artifact.artifactId} must provide reviewAt when deferred.`,
      ),
    };
    projection.state = "deferred";
    return;
  }

  projection.deferred = null;
  projection.state = lifecycleTransitionHasPendingAuthority(projection)
    ? "awaiting-authority"
    : "awaiting-admission";
}

function recordTargetAdmission(
  projection: MutableLifecycleTransitionProjectionState,
  artifact: Extract<
    LifecycleTransitionArtifact,
    { artifactKind: "target-admission-recorded" }
  >,
  route: LifecycleTransitionRouteDefinition,
) {
  requireLifecycleTransitionState(artifact, projection.state, [
    "awaiting-admission",
  ]);
  assertLifecycleTransitionAdmissionArtifact(artifact);
  projection.admission = {
    reasonCode: artifact.reasonCode,
    receiptRef: artifact.receiptRef,
    recordedAt: artifact.recordedAt,
    state: artifact.result,
    targetRecordRef: artifact.targetRecordRef,
  };

  if (artifact.result === "rejected") {
    projection.rejection = {
      reasonCode: requiredLifecycleTransitionValue(
        artifact.reasonCode,
        `${artifact.artifactId} must provide a rejection reason code.`,
      ),
      reasonDetail: requiredLifecycleTransitionValue(
        artifact.reasonDetail,
        `${artifact.artifactId} must provide rejection detail.`,
      ),
    };
    projection.state = "rejected";
    return;
  }

  if (route.completionEvidence === "target-admission-receipt") {
    projection.application = {
      ...projection.application,
      evidenceKind: "target-admission-receipt",
      receiptRef: artifact.receiptRef,
      recordedAt: artifact.recordedAt,
      resultingRefs: [
        requiredLifecycleTransitionValue(artifact.targetRecordRef),
      ],
      state: "applied",
      targetRecordRef: artifact.targetRecordRef,
    };
    projection.state = "applied";
    return;
  }

  projection.state = "authorized";
}

function startApplication(
  projection: MutableLifecycleTransitionProjectionState,
  artifact: Extract<
    LifecycleTransitionArtifact,
    { artifactKind: "application-started" }
  >,
  route: LifecycleTransitionRouteDefinition,
) {
  requireLifecycleTransitionState(artifact, projection.state, [
    "authorized",
    "failed",
  ]);

  if (route.completionEvidence !== "target-application-receipt") {
    throw new Error(
      `${route.routeId} completes from target admission and cannot start a separate application.`,
    );
  }

  if (
    projection.state === "failed" &&
    projection.application.retryable !== true
  ) {
    throw new Error(
      `${artifact.transitionId} cannot retry a non-retryable application failure.`,
    );
  }

  projection.application = {
    ...projection.application,
    adapterRef: artifact.adapterRef,
    failureCode: null,
    failureDetail: null,
    retryable: null,
    runRef: artifact.runRef,
    state: "running",
  };
  projection.state = "applying";
}

function failApplication(
  projection: MutableLifecycleTransitionProjectionState,
  artifact: Extract<
    LifecycleTransitionArtifact,
    { artifactKind: "application-failed" }
  >,
) {
  requireLifecycleTransitionState(artifact, projection.state, ["applying"]);
  assertLifecycleTransitionCurrentRun(
    artifact.runRef,
    projection.application.runRef,
    artifact,
  );
  projection.application = {
    ...projection.application,
    adapterRef: artifact.adapterRef,
    failureCode: artifact.failureCode,
    failureDetail: artifact.failureDetail,
    retryable: artifact.retryable,
    state: "failed",
  };
  projection.state = "failed";
}

function recordTargetApplication(
  projection: MutableLifecycleTransitionProjectionState,
  artifact: Extract<
    LifecycleTransitionArtifact,
    { artifactKind: "target-application-recorded" }
  >,
  route: LifecycleTransitionRouteDefinition,
) {
  requireLifecycleTransitionState(artifact, projection.state, ["applying"]);
  assertLifecycleTransitionCurrentRun(
    artifact.runRef,
    projection.application.runRef,
    artifact,
  );

  if (route.completionEvidence !== "target-application-receipt") {
    throw new Error(
      `${route.routeId} does not accept target-application completion evidence.`,
    );
  }

  projection.application = {
    ...projection.application,
    evidenceKind: "target-application-receipt",
    receiptRef: artifact.receiptRef,
    recordedAt: artifact.recordedAt,
    resultingRefs: artifact.resultingRefs,
    retryable: null,
    state: "applied",
    targetRecordRef: artifact.targetRecordRef,
  };
  projection.state = "applied";
}
