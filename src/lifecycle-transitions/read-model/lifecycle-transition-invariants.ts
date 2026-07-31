import type {
  LifecycleTransitionArtifact,
  LifecycleTransitionSourcePacketPreparedArtifact,
} from "../model/lifecycle-transition-artifacts.ts";
import type {
  LifecycleTransitionRouteDefinition,
} from "../model/lifecycle-transition-routes.ts";
import {
  LIFECYCLE_TRANSITION_SCHEMA_VERSION,
  type LifecycleTransitionState,
} from "../model/lifecycle-transition-types.ts";

export function normalizeLifecycleTransitionArtifactHistory(
  artifacts: readonly LifecycleTransitionArtifact[],
) {
  if (artifacts.length === 0) {
    throw new Error("A lifecycle transition requires at least one artifact.");
  }

  const history = [...artifacts].sort(
    (left, right) =>
      left.sequence - right.sequence ||
      left.recordedAt.localeCompare(right.recordedAt),
  );
  const artifactIds = new Set<string>();
  const sequences = new Set<number>();

  for (const artifact of history) {
    if (!Number.isInteger(artifact.sequence) || artifact.sequence < 0) {
      throw new Error(`${artifact.artifactId} has an invalid sequence.`);
    }

    if (artifactIds.has(artifact.artifactId)) {
      throw new Error(`Duplicate lifecycle artifact id ${artifact.artifactId}.`);
    }

    if (sequences.has(artifact.sequence)) {
      throw new Error(
        `Duplicate lifecycle artifact sequence ${artifact.sequence}.`,
      );
    }

    artifactIds.add(artifact.artifactId);
    sequences.add(artifact.sequence);
  }

  const packetCount = history.filter(
    (artifact) => artifact.artifactKind === "source-packet-prepared",
  ).length;

  if (packetCount !== 1) {
    throw new Error(
      `A lifecycle transition requires exactly one source packet; found ${packetCount}.`,
    );
  }

  return history;
}

export function assertLifecycleTransitionSourcePacket(
  packet: LifecycleTransitionSourcePacketPreparedArtifact,
  route: LifecycleTransitionRouteDefinition,
) {
  if (packet.schemaVersion !== LIFECYCLE_TRANSITION_SCHEMA_VERSION) {
    throw new Error(
      `${packet.transitionId} uses unsupported lifecycle schema ${packet.schemaVersion}.`,
    );
  }

  if (
    packet.authority.role !== "source-domain" ||
    packet.authority.ownerRef !== route.intentOwnerRef
  ) {
    throw new Error(`${packet.transitionId} has an invalid intent owner.`);
  }

  if (
    packet.source.domain !== route.sourceDomain ||
    packet.source.ownerRef !== route.intentOwnerRef ||
    packet.source.sourceVersion !== packet.basisSourceVersion
  ) {
    throw new Error(`${packet.transitionId} has an invalid source boundary.`);
  }

  if (
    packet.target.domain !== route.target.domain ||
    packet.target.homeRef !== route.target.homeRef ||
    packet.target.ingressRef !== route.target.ingressRef ||
    packet.target.laneRef !== route.target.laneRef ||
    packet.target.admissionOwnerRef !== route.target.admissionOwnerRef ||
    packet.target.applicationOwnerRef !== route.target.applicationOwnerRef
  ) {
    throw new Error(
      `${packet.transitionId} does not match the locked ${route.routeId} target.`,
    );
  }

  if (!packet.idempotencyKey.trim()) {
    throw new Error(`${packet.transitionId} has no idempotency key.`);
  }

  const controlIds = packet.requiredAuthorityControls.map(
    (requirement) => requirement.controlId,
  );

  if (new Set(controlIds).size !== controlIds.length) {
    throw new Error(
      `${packet.transitionId} repeats an authority-control requirement.`,
    );
  }
}

export function assertLifecycleTransitionArtifactCorrelation(
  history: readonly LifecycleTransitionArtifact[],
  packet: LifecycleTransitionSourcePacketPreparedArtifact,
) {
  for (const artifact of history) {
    if (
      artifact.transitionId !== packet.transitionId ||
      artifact.correlationId !== packet.correlationId ||
      artifact.routeId !== packet.routeId ||
      artifact.basisSourceVersion !== packet.basisSourceVersion
    ) {
      throw new Error(
        `${artifact.artifactId} does not correlate to ${packet.transitionId}.`,
      );
    }

    if (artifact.schemaVersion !== LIFECYCLE_TRANSITION_SCHEMA_VERSION) {
      throw new Error(
        `${artifact.artifactId} uses unsupported lifecycle schema ${artifact.schemaVersion}.`,
      );
    }
  }
}

export function assertLifecycleTransitionArtifactAuthority(
  artifact: Exclude<
    LifecycleTransitionArtifact,
    LifecycleTransitionSourcePacketPreparedArtifact
  >,
  packet: LifecycleTransitionSourcePacketPreparedArtifact,
  route: LifecycleTransitionRouteDefinition,
) {
  const authority = artifact.authority;

  switch (artifact.artifactKind) {
    case "validation-started":
    case "validation-completed":
      assertAuthority(
        artifact,
        "validation-authority",
        route.validationOwnerRef,
      );
      return;
    case "target-admission-recorded":
      assertAuthority(artifact, "target-domain", route.target.admissionOwnerRef);
      return;
    case "authority-decision-recorded": {
      const requirement = packet.requiredAuthorityControls.find(
        (candidate) => candidate.controlId === artifact.controlId,
      );

      if (!requirement) {
        throw new Error(
          `${artifact.artifactId} records an authority decision that was not required.`,
        );
      }

      assertAuthority(
        artifact,
        "decision-authority",
        requirement.authorityOwnerRef,
      );
      return;
    }
    case "application-started":
    case "application-failed":
      assertAuthority(artifact, "orchestration", route.executionOwnerRef);
      return;
    case "target-application-recorded":
      assertAuthority(
        artifact,
        "target-adapter",
        route.target.applicationOwnerRef,
      );
      return;
    case "gate-blocked":
      if (
        authority.ownerRef !== artifact.gate.ownerRef ||
        ![
          "decision-authority",
          "target-domain",
          "validation-authority",
        ].includes(authority.role)
      ) {
        throw new Error(`${artifact.artifactId} has an invalid gate owner.`);
      }
      return;
    case "source-correction-returned":
      if (
        !["target-domain", "validation-authority"].includes(authority.role)
      ) {
        throw new Error(`${artifact.artifactId} has an invalid return owner.`);
      }
      return;
    case "transition-deferred":
      if (authority.role !== "decision-authority") {
        throw new Error(`${artifact.artifactId} has an invalid defer owner.`);
      }
      return;
    case "transition-cancelled":
    case "transition-superseded":
      assertAuthority(artifact, "source-domain", route.intentOwnerRef);
      return;
  }
}

export function assertLifecycleTransitionValidationOutcome(
  artifact: Extract<
    LifecycleTransitionArtifact,
    { artifactKind: "validation-completed" }
  >,
) {
  const blockedGates = artifact.gates.filter(
    (gate) => gate.state === "blocked",
  );

  if (artifact.outcome === "passed" && blockedGates.length > 0) {
    throw new Error(
      `${artifact.artifactId} cannot pass with blocked validation gates.`,
    );
  }

  if (artifact.outcome === "blocked" && blockedGates.length === 0) {
    throw new Error(
      `${artifact.artifactId} must identify the gate that blocked validation.`,
    );
  }

  if (artifact.outcome === "returned" && artifact.returnInstruction === null) {
    throw new Error(
      `${artifact.artifactId} must identify the source correction.`,
    );
  }

  if (artifact.outcome !== "returned" && artifact.returnInstruction !== null) {
    throw new Error(
      `${artifact.artifactId} cannot include a return instruction for ${artifact.outcome}.`,
    );
  }
}

export function assertLifecycleTransitionAdmissionArtifact(
  artifact: Extract<
    LifecycleTransitionArtifact,
    { artifactKind: "target-admission-recorded" }
  >,
) {
  if (
    artifact.result === "admitted" &&
    (artifact.reasonCode !== null || artifact.reasonDetail !== null)
  ) {
    throw new Error(
      `${artifact.artifactId} cannot attach rejection detail to admission.`,
    );
  }

  if (
    artifact.result === "rejected" &&
    (artifact.reasonCode === null ||
      artifact.reasonDetail === null ||
      artifact.targetRecordRef !== null)
  ) {
    throw new Error(
      `${artifact.artifactId} must provide a reason and no target record when rejected.`,
    );
  }
}

export function assertLifecycleTransitionCurrentRun(
  artifactRunRef: string,
  currentRunRef: string | null,
  artifact: LifecycleTransitionArtifact,
) {
  if (artifactRunRef !== currentRunRef) {
    throw new Error(
      `${artifact.artifactId} does not match the active application run.`,
    );
  }
}

export function requireLifecycleTransitionState(
  artifact: LifecycleTransitionArtifact,
  state: LifecycleTransitionState,
  allowed: readonly LifecycleTransitionState[],
) {
  if (!allowed.includes(state)) {
    throw invalidLifecycleTransitionSequence(artifact, state);
  }
}

export function invalidLifecycleTransitionSequence(
  artifact: LifecycleTransitionArtifact,
  state: LifecycleTransitionState,
) {
  return new Error(
    `${artifact.artifactKind} is invalid while ${artifact.transitionId} is ${state}.`,
  );
}

export function requiredLifecycleTransitionValue<TValue>(
  value: TValue | null | undefined,
  message = "Required lifecycle transition value is missing.",
): TValue {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}

function assertAuthority(
  artifact: LifecycleTransitionArtifact,
  expectedRole: LifecycleTransitionArtifact["authority"]["role"],
  expectedOwnerRef: string,
) {
  if (
    artifact.authority.role !== expectedRole ||
    artifact.authority.ownerRef !== expectedOwnerRef
  ) {
    throw new Error(
      `${artifact.artifactId} must be recorded by ${expectedOwnerRef} as ${expectedRole}.`,
    );
  }
}
