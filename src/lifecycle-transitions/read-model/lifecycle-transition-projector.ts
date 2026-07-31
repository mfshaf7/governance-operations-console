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
    admission: projection.admission,
    application: projection.application,
    authorityDecisions: projection.authorityDecisions,
    blockedGate: projection.blockedGate,
    cancelledReasonCode: projection.cancelledReasonCode,
    correlationId: packet.correlationId,
    correction: projection.correction,
    deferred: projection.deferred,
    history,
    idempotencyKey: packet.idempotencyKey,
    nextAction: projectLifecycleTransitionNextAction(projection, route),
    packet: packet.packet,
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
