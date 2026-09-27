import type {
  LifecycleTransitionArtifact,
} from "../model/lifecycle-transition-artifacts.ts";
import {
  lifecycleTransitionRoute,
} from "../model/lifecycle-transition-routes.ts";
import {
  assertLifecycleTransitionArtifactAuthority,
  assertLifecycleTransitionArtifactCorrelation,
  assertLifecycleTransitionSourcePacket,
  normalizeLifecycleTransitionArtifactHistory,
} from "./lifecycle-transition-invariants.ts";
import {
  projectLifecycleTransitionNextAction,
} from "./lifecycle-transition-next-action.ts";
import type {
  LifecycleTransitionHistoryProjection,
  LifecycleTransitionProjection,
} from "./lifecycle-transition-projection-types.ts";
import {
  createInitialLifecycleTransitionProjectionState,
  reduceLifecycleTransitionArtifact,
} from "./lifecycle-transition-reducer.ts";

export type {
  LifecycleTransitionProjection,
} from "./lifecycle-transition-projection-types.ts";

export function projectLifecycleTransition(
  artifacts: readonly LifecycleTransitionArtifact[],
): LifecycleTransitionProjection {
  const history = normalizeLifecycleTransitionArtifactHistory(artifacts);
  const packet = history[0];

  if (packet?.artifactKind !== "source-packet-prepared") {
    throw new Error(
      "A lifecycle transition must start with one source-packet-prepared artifact.",
    );
  }

  const route = lifecycleTransitionRoute(packet.routeId);
  assertLifecycleTransitionSourcePacket(packet, route);
  assertLifecycleTransitionArtifactCorrelation(history, packet);

  const projection = createInitialLifecycleTransitionProjectionState(
    packet,
    route,
  );

  for (const artifact of history.slice(1)) {
    if (artifact.artifactKind === "source-packet-prepared") {
      throw new Error(
        `${artifact.transitionId} cannot prepare a second source packet.`,
      );
    }

    assertLifecycleTransitionArtifactAuthority(artifact, packet, route);
    reduceLifecycleTransitionArtifact(projection, artifact, route);
    projection.updatedAt = artifact.recordedAt;
  }

  return {
    activityArtifacts: history,
    admission: projection.admission,
    application: projection.application,
    authorityDecisions: projection.authorityDecisions,
    blockedGate: projection.blockedGate,
    cancelledReasonCode: projection.cancelledReasonCode,
    correlationId: packet.correlationId,
    correction: projection.correction,
    deferred: projection.deferred,
    history: history.map((artifact) => ({
      artifactId: artifact.artifactId,
      artifactKind: artifact.artifactKind,
      authority: artifact.authority,
      evidenceRefs: lifecycleTransitionArtifactEvidenceRefs(artifact),
      outcome: lifecycleTransitionArtifactOutcome(artifact),
      recordedAt: artifact.recordedAt,
      sequence: artifact.sequence,
    })),
    idempotencyKey: packet.idempotencyKey,
    nextAction: projectLifecycleTransitionNextAction(projection, route),
    reason: packet.reason,
    rejection: projection.rejection,
    route,
    source: packet.source,
    state: projection.state,
    supersededByTransitionId: projection.supersededByTransitionId,
    supersedesTransitionId: packet.supersedesTransitionId,
    target: packet.target,
    transitionId: packet.transitionId,
    updatedAt: projection.updatedAt,
    validation: projection.validation,
  };
}

function lifecycleTransitionArtifactEvidenceRefs(
  artifact: LifecycleTransitionArtifact,
): readonly string[] {
  switch (artifact.artifactKind) {
    case "application-failed":
    case "application-started":
      return [artifact.runRef];
    case "authority-decision-recorded":
    case "source-correction-returned":
    case "target-admission-recorded":
    case "target-application-recorded":
    case "transition-cancelled":
    case "transition-superseded":
      return [artifact.receiptRef];
    case "gate-blocked":
      return artifact.gate.evidenceRef ? [artifact.gate.evidenceRef] : [];
    case "source-packet-prepared":
      return [artifact.packet.packetRef, artifact.packet.producerReceiptRef];
    case "transition-deferred":
      return [];
    case "validation-completed":
      return [artifact.receiptRef];
    case "validation-started":
      return [artifact.validationRunRef];
  }
}

function lifecycleTransitionArtifactOutcome(
  artifact: LifecycleTransitionArtifact,
): LifecycleTransitionHistoryProjection["outcome"] {
  switch (artifact.artifactKind) {
    case "source-packet-prepared":
    case "validation-started":
    case "application-started":
      return "started";
    case "gate-blocked":
    case "source-correction-returned":
      return "blocked";
    case "application-failed":
      return "failed";
    case "transition-deferred":
      return "waiting";
    case "transition-cancelled":
    case "transition-superseded":
      return "informational";
    case "validation-completed":
      return artifact.outcome === "passed"
        ? "succeeded"
        : artifact.outcome === "blocked"
          ? "blocked"
          : "waiting";
    case "target-admission-recorded":
      return artifact.result === "admitted" ? "succeeded" : "failed";
    case "authority-decision-recorded":
      return artifact.decision === "approved" ? "succeeded" : "waiting";
    case "target-application-recorded":
      return "succeeded";
  }
}

export function projectLifecycleTransitions(
  artifacts: readonly LifecycleTransitionArtifact[],
): LifecycleTransitionProjection[] {
  const grouped = new Map<string, LifecycleTransitionArtifact[]>();

  for (const artifact of artifacts) {
    const transitionArtifacts = grouped.get(artifact.transitionId) ?? [];
    transitionArtifacts.push(artifact);
    grouped.set(artifact.transitionId, transitionArtifacts);
  }

  return [...grouped.values()]
    .map(projectLifecycleTransition)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
