import type {
  DevIntegrationProfileHistoryEvent,
} from "@/environment-lifecycle";
import type {
  LifecycleTransitionArtifact,
  LifecycleTransitionProjection,
} from "@/lifecycle-transitions";
import {
  deliveryActivitySource,
} from "@/domain-workspaces/delivery";
import {
  orchestrationActivitySource,
} from "@/domain-workspaces/orchestration";
import {
  portfolioActivitySource,
} from "@/domain-workspaces/portfolio";
import {
  proposalActivitySource,
} from "@/domain-workspaces/proposal";
import {
  prototypeActivitySource,
} from "@/domain-workspaces/prototype";
import {
  repositoryActivitySource,
} from "@/domain-workspaces/repository";

import type {
  ConsoleActivityEvent,
  ConsoleActivityOutcome,
} from "../../console-integration/activity-contract";

export type ConsoleActivityRuntimeSnapshots = Readonly<{
  delivery: ReturnType<typeof deliveryActivitySource.getRuntimeSnapshot>;
  orchestration: ReturnType<
    typeof orchestrationActivitySource.getRuntimeSnapshot
  >;
  portfolio: ReturnType<typeof portfolioActivitySource.getRuntimeSnapshot>;
  proposal: ReturnType<typeof proposalActivitySource.getRuntimeSnapshot>;
  prototype: ReturnType<typeof prototypeActivitySource.getRuntimeSnapshot>;
  repository: ReturnType<typeof repositoryActivitySource.getRuntimeSnapshot>;
}>;

export function projectConsoleActivitySources({
  environmentHistory,
  lifecycleTransitions,
  runtime,
}: {
  environmentHistory: readonly DevIntegrationProfileHistoryEvent[];
  lifecycleTransitions: readonly LifecycleTransitionProjection[];
  runtime: ConsoleActivityRuntimeSnapshots;
}): ConsoleActivityEvent[] {
  return [
    ...deliverySourceEvents(runtime.delivery),
    ...proposalSourceEvents(runtime.proposal),
    ...repositorySourceEvents(runtime.repository),
    ...prototypeSourceEvents(runtime.prototype),
    ...portfolioSourceEvents(runtime.portfolio),
    ...orchestrationSourceEvents(runtime.orchestration),
    ...lifecycleTransitionSourceEvents(lifecycleTransitions),
    ...environmentSourceEvents(environmentHistory),
  ];
}

function deliverySourceEvents(
  runtime: ConsoleActivityRuntimeSnapshots["delivery"],
): ConsoleActivityEvent[] {
  const auditEvents = deliveryActivitySource.auditEvents.map((event) => ({
    action: {
      id: `delivery.${event.category}`,
      label: event.title,
    },
    actor: {
      kind: deliveryActorKind(event.actor),
      ref: event.actor || "unrecorded",
    },
    causationId: null,
    category: deliveryCategory(event.category),
    correlationId: null,
    durability: "source-projected" as const,
    eventId: event.event_id,
    evidenceRefs: [],
    occurredAt: event.occurred_at,
    outcome: outcomeFromTone(event.tone),
    receiptRef: event.receipt_id,
    source: {
      authority: "delivery-read-model",
      label: "Delivery",
      mode: "domain-projection" as const,
      owner: "delivery-operation",
      ref: `delivery://${event.delivery_package_id}/audit/${event.event_id}`,
    },
    subject: {
      kind: "delivery-package",
      label: `Delivery package ${event.delivery_package_id}`,
      ref: event.delivery_package_id,
    },
    summary: event.detail,
  }));
  const intakeEvents = Object.entries(runtime.consumedIntakeRecords).map(
    ([sourceId, record]) => ({
      action: {
        id: "delivery.intake.consume",
        label: "Intake source consumed",
      },
      actor: {
        kind: "operator" as const,
        ref: record.consumedBy,
      },
      causationId: null,
      category: "receipt" as const,
      correlationId: null,
      durability: "prototype-local" as const,
      eventId: `delivery-intake-consume:${sourceId}:${record.consumedAt}`,
      evidenceRefs: [],
      occurredAt: record.consumedAt,
      outcome: "succeeded" as const,
      receiptRef: null,
      source: {
        authority: "prototype-local",
        label: "Delivery",
        mode: "prototype-local" as const,
        owner: "delivery-workspace",
        ref: `delivery://intake/${sourceId}`,
      },
      subject: {
        kind: "intake-source",
        label: `Intake source ${sourceId}`,
        ref: sourceId,
      },
      summary: "The local Delivery projection recorded the intake consume.",
    }),
  );
  const workDesignEvents = Object.entries(runtime.workDesignApplyRecords).map(
    ([packageId, receipt]) => ({
      action: {
        id: "delivery.work-design.apply",
        label: "Work Design applied",
      },
      actor: {
        kind: "operator" as const,
        ref: receipt.appliedBy,
      },
      causationId: null,
      category: "receipt" as const,
      correlationId: null,
      durability: "prototype-local" as const,
      eventId: receipt.receiptId,
      evidenceRefs: [],
      occurredAt: receipt.appliedAt,
      outcome: "succeeded" as const,
      receiptRef: receipt.receiptId,
      source: {
        authority: "prototype-local",
        label: "Delivery",
        mode: "prototype-local" as const,
        owner: "delivery-workspace",
        ref: `delivery://${packageId}/work-design`,
      },
      subject: {
        kind: "delivery-package",
        label: `Delivery package ${packageId}`,
        ref: packageId,
      },
      summary: "The reviewed Work Design tree was applied to the local projection.",
    }),
  );
  const refinementEvents = Object.entries(runtime.refinementApplyReceipts).map(
    ([packageId, receipt]) => ({
      action: {
        id: receipt.command_name,
        label: "Refinement applied",
      },
      actor: {
        kind: "operator" as const,
        ref: "local-operator",
      },
      causationId: receipt.source_work_design_receipt_id,
      category: "receipt" as const,
      correlationId: receipt.applied_payload.packet_id,
      durability: "prototype-local" as const,
      eventId: receipt.receipt_id,
      evidenceRefs: [],
      occurredAt: receipt.applied_at,
      outcome:
        receipt.outcome === "accepted"
          ? ("succeeded" as const)
          : receipt.outcome === "failed"
            ? ("failed" as const)
            : ("blocked" as const),
      receiptRef: receipt.receipt_id,
      source: {
        authority: "prototype-local",
        label: "Delivery",
        mode: "prototype-local" as const,
        owner: "delivery-workspace",
        ref: `delivery://${packageId}/refinement`,
      },
      subject: {
        kind: "delivery-package",
        label: `Delivery package ${packageId}`,
        ref: packageId,
      },
      summary: `The local Refinement command finished with outcome ${receipt.outcome}.`,
    }),
  );
  const executionEvents = Object.entries(runtime.executionActionRecords).map(
    ([packageId, record]) => ({
      action: {
        id: `delivery.execution.${record.actionType}`,
        label: "Execution action recorded",
      },
      actor: {
        kind: "operator" as const,
        ref: "local-operator",
      },
      causationId: null,
      category: "receipt" as const,
      correlationId: record.sourceRevision,
      durability: "prototype-local" as const,
      eventId: record.receiptId,
      evidenceRefs: [],
      occurredAt: record.recordedAt,
      outcome: outcomeFromTone(record.tone),
      receiptRef: record.receiptId,
      source: {
        authority: "prototype-local",
        label: "Delivery",
        mode: "prototype-local" as const,
        owner: "delivery-workspace",
        ref: `delivery://${packageId}/execution`,
      },
      subject: {
        kind: "delivery-package",
        label: `Delivery package ${packageId}`,
        ref: packageId,
      },
      summary: record.summary,
    }),
  );

  return [
    ...auditEvents,
    ...intakeEvents,
    ...workDesignEvents,
    ...refinementEvents,
    ...executionEvents,
  ];
}

function proposalSourceEvents(
  runtime: ConsoleActivityRuntimeSnapshots["proposal"],
): ConsoleActivityEvent[] {
  const captureEvents = runtime.capturedProposals.map((proposal) => ({
    action: {
      id: "proposal.capture",
      label: "Proposal captured",
    },
    actor: {
      kind: "operator" as const,
      ref: "local-operator",
    },
    causationId: null,
    category: "command" as const,
    correlationId: proposal.backendRecordId,
    durability: "prototype-local" as const,
    eventId: `proposal-capture:${proposal.id}:${proposal.recordVersion}`,
    evidenceRefs: proposal.evidence.map((evidence) => evidence.id),
    occurredAt: proposal.recordedAt,
    outcome: "succeeded" as const,
    receiptRef: null,
    source: {
      authority: "prototype-local",
      label: "Proposal",
      mode: "prototype-local" as const,
      owner: "proposal-operation",
      ref: `proposal://${proposal.id}`,
    },
    subject: {
      kind: "proposal",
      label: proposal.title,
      ref: proposal.id,
    },
    summary: proposal.lastEvent,
  }));
  const workflowEvents = Object.values(runtime.workflowReceipts)
    .flat()
    .map((receipt) => ({
      action: {
        id: receipt.commandName,
        label: `${capitalize(receipt.step)} applied`,
      },
      actor: {
        kind: "operator" as const,
        ref: "local-operator",
      },
      causationId: receipt.sourceRecordVersion,
      category: "receipt" as const,
      correlationId: receipt.sourceBackendRecordId,
      durability: "prototype-local" as const,
      eventId: receipt.receiptId,
      evidenceRefs: [],
      occurredAt: receipt.recordedAt,
      outcome: "succeeded" as const,
      receiptRef: receipt.receiptId,
      source: {
        authority: "prototype-local",
        label: "Proposal",
        mode: "prototype-local" as const,
        owner: "proposal-operation",
        ref: `proposal://${receipt.proposalId}`,
      },
      subject: {
        kind: "proposal",
        label: `Proposal ${receipt.proposalId}`,
        ref: receipt.proposalId,
      },
      summary: receipt.summary,
    }));

  return [...captureEvents, ...workflowEvents];
}

function repositorySourceEvents(
  runtime: ConsoleActivityRuntimeSnapshots["repository"],
): ConsoleActivityEvent[] {
  return Object.values(runtime.receiptsByRecord)
    .flat()
    .map((receipt) => ({
      action: {
        id: receipt.commandName,
        label: receipt.actionLabel,
      },
      actor: {
        kind: "operator" as const,
        ref: "local-operator",
      },
      causationId: receipt.sourceRecordVersion,
      category: "receipt" as const,
      correlationId:
        receipt.kind === "proposal-gate-resolution"
          ? receipt.proposalId
          : null,
      durability: "prototype-local" as const,
      eventId: receipt.receiptId,
      evidenceRefs: [],
      occurredAt: receipt.recordedAt,
      outcome: "succeeded" as const,
      receiptRef: receipt.receiptId,
      source: {
        authority: receipt.authority,
        label: "Repository",
        mode: "prototype-local" as const,
        owner: receipt.routeOwner,
        ref: `repository://${receipt.recordId}`,
      },
      subject: {
        kind: "repository-record",
        label: `Repository record ${receipt.recordId}`,
        ref: receipt.recordId,
      },
      summary: receipt.summary,
    }));
}

function prototypeSourceEvents(
  runtime: ConsoleActivityRuntimeSnapshots["prototype"],
): ConsoleActivityEvent[] {
  const recordNames = new Map(
    prototypeActivitySource.records.map((record) => [record.id, record.name]),
  );
  const projectedReceipts = prototypeActivitySource.records.flatMap((record) =>
    record.receipts.map((receipt) => ({
      action: {
        id: receipt.commandName,
        label: receipt.label,
      },
      actor: {
        kind: "unknown" as const,
        ref: "source-record",
      },
      causationId: receipt.commandId,
      category: "receipt" as const,
      correlationId: record.id,
      durability: "source-projected" as const,
      eventId: receipt.id,
      evidenceRefs: [],
      occurredAt: receipt.recordedAt,
      outcome: outcomeFromResultState(receipt.resultState),
      receiptRef: receipt.id,
      source: {
        authority: receipt.authority,
        label: "Prototype",
        mode: "source-projected" as const,
        owner: "prototype-operation",
        ref: `prototype://${record.id}`,
      },
      subject: {
        kind: "prototype",
        label: record.name,
        ref: record.id,
      },
      summary: receipt.summary,
    })),
  );
  const localReceipts = Object.values(runtime.receiptsByRecord)
    .flat()
    .map((receipt) => ({
      action: {
        id: receipt.commandName,
        label: receipt.actionLabel,
      },
      actor: {
        kind: "operator" as const,
        ref: "local-operator",
      },
      causationId: receipt.sourceVersion,
      category: "receipt" as const,
      correlationId: receipt.recordId,
      durability: "prototype-local" as const,
      eventId: receipt.receiptId,
      evidenceRefs: [],
      occurredAt: receipt.recordedAt,
      outcome: outcomeFromResultState(receipt.resultState),
      receiptRef: receipt.receiptId,
      source: {
        authority: receipt.authority,
        label: "Prototype",
        mode: "prototype-local" as const,
        owner: receipt.routeOwner,
        ref: `prototype://${receipt.recordId}`,
      },
      subject: {
        kind: "prototype",
        label:
          recordNames.get(receipt.recordId) ??
          receipt.appliedRecord.name ??
          `Prototype ${receipt.recordId}`,
        ref: receipt.recordId,
      },
      summary: receipt.summary,
    }));

  return [...projectedReceipts, ...localReceipts];
}

function portfolioSourceEvents(
  runtime: ConsoleActivityRuntimeSnapshots["portfolio"],
): ConsoleActivityEvent[] {
  const captureEvents = runtime.captureReceipts.map((receipt) => ({
    action: {
      id: receipt.commandName,
      label: "Product publication captured",
    },
    actor: {
      kind: "operator" as const,
      ref: receipt.capturedByRef,
    },
    causationId: receipt.publicationReceiptRef,
    category: "command" as const,
    correlationId: receipt.packetId,
    durability: "prototype-local" as const,
    eventId: receipt.receiptId,
    evidenceRefs: receipt.sourceVersions.map((source) => source.ref),
    occurredAt: receipt.recordedAt,
    outcome: "succeeded" as const,
    receiptRef: receipt.receiptId,
    source: {
      authority: "prototype-local",
      label: "Product Portfolio",
      mode: "prototype-local" as const,
      owner: "product-portfolio-operation",
      ref: `portfolio://publication/${receipt.sourceId}`,
    },
    subject: {
      kind: "product-publication",
      label: `Product ${receipt.productId}`,
      ref: receipt.productId,
    },
    summary: receipt.summary,
  }));
  const publicationEvents = runtime.publicationReceipts.map((receipt) => ({
    action: {
      id: receipt.commandName,
      label:
        receipt.resultState === "published"
          ? "Product published"
          : "Product publication rejected",
    },
    actor: {
      kind: "operator" as const,
      ref: receipt.decision.decidedByRef,
    },
    causationId: receipt.publicationReceiptRef,
    category: "receipt" as const,
    correlationId: receipt.packetId,
    durability: "prototype-local" as const,
    eventId: receipt.receiptId,
    evidenceRefs: receipt.sourceVersions.map((source) => source.ref),
    occurredAt: receipt.recordedAt,
    outcome:
      receipt.resultState === "published"
        ? ("succeeded" as const)
        : ("failed" as const),
    receiptRef: receipt.receiptId,
    source: {
      authority: "prototype-local",
      label: "Product Portfolio",
      mode: "prototype-local" as const,
      owner: "product-portfolio-operation",
      ref: `portfolio://${receipt.productId}`,
    },
    subject: {
      kind: "product",
      label: `Product ${receipt.productId}`,
      ref: receipt.productId,
    },
    summary: receipt.summary,
  }));
  const listingEvents = runtime.listingApplications.map(({ receipt }) => ({
    action: {
      id: receipt.commandName,
      label: "Product listing updated",
    },
    actor: {
      kind: "operator" as const,
      ref: receipt.submittedByRef,
    },
    causationId: receipt.idempotencyKey,
    category: "receipt" as const,
    correlationId: receipt.productId,
    durability: "prototype-local" as const,
    eventId: receipt.receiptId,
    evidenceRefs: [],
    occurredAt: receipt.recordedAt,
    outcome: "succeeded" as const,
    receiptRef: receipt.receiptId,
    source: {
      authority: "prototype-local",
      label: "Product Portfolio",
      mode: "prototype-local" as const,
      owner: "product-portfolio-operation",
      ref: `portfolio://${receipt.productId}`,
    },
    subject: {
      kind: "product",
      label: `Product ${receipt.productId}`,
      ref: receipt.productId,
    },
    summary: receipt.summary,
  }));

  return [...captureEvents, ...publicationEvents, ...listingEvents];
}

function orchestrationSourceEvents(
  runtime: ConsoleActivityRuntimeSnapshots["orchestration"],
): ConsoleActivityEvent[] {
  const runsById = new Map(
    runtime.runs.map((run) => [run.runId, run]),
  );

  return runtime.materialEvents.map((event) => {
    const run = runsById.get(event.runId);
    const terminal =
      event.state === "cancelled" ||
      event.state === "completed" ||
      event.state === "failed";

    return {
      action: {
        id: `orchestration.run.${event.state}`,
        label: `Run ${event.state}`,
      },
      actor: {
        kind: "system" as const,
        ref: run?.source.authority ?? "orchestration-runtime",
      },
      causationId: run?.causationRef ?? null,
      category:
        event.state === "blocked"
          ? ("blocker" as const)
          : event.state === "waiting"
            ? ("state-change" as const)
            : ("command" as const),
      correlationId: run?.correlationRef ?? null,
      durability: "synthetic" as const,
      eventId: event.eventId,
      evidenceRefs: run?.evidenceRefs ?? [],
      occurredAt: event.occurredAt,
      outcome: orchestrationOutcome(event.state),
      receiptRef: terminal ? (run?.receipt?.ref ?? null) : null,
      source: {
        authority: run?.source.authority ?? "workspace-prototype-studio",
        label: "Orchestration",
        mode: "synthetic-scenario" as const,
        owner: "orchestration-operation",
        ref: run?.source.ref ?? `orchestration://${event.runId}`,
      },
      subject: {
        kind: "orchestration-run",
        label: run?.businessState.label ?? `Run ${event.runId}`,
        ref: event.runId,
      },
      summary: event.summary,
    };
  });
}

function lifecycleTransitionSourceEvents(
  transitions: readonly LifecycleTransitionProjection[],
): ConsoleActivityEvent[] {
  return transitions.flatMap((transition) =>
    transition.history.map((artifact) =>
      lifecycleArtifactEvent(transition, artifact),
    ),
  );
}

function lifecycleArtifactEvent(
  transition: LifecycleTransitionProjection,
  artifact: LifecycleTransitionArtifact,
): ConsoleActivityEvent {
  return {
    action: {
      id: `lifecycle-transition.${artifact.artifactKind}`,
      label: lifecycleArtifactLabel(artifact),
    },
    actor: {
      kind: "system",
      ref: artifact.authority.ownerRef,
    },
    causationId: artifact.causationId,
    category: lifecycleArtifactCategory(artifact),
    correlationId: artifact.correlationId,
    durability: "prototype-local",
    eventId: artifact.artifactId,
    evidenceRefs: lifecycleArtifactEvidence(artifact),
    occurredAt: artifact.recordedAt,
    outcome: lifecycleArtifactOutcome(artifact),
    receiptRef: lifecycleArtifactReceipt(artifact),
    source: {
      authority: artifact.authority.ownerRef,
      label: "Lifecycle Transitions",
      mode: "prototype-local",
      owner: "lifecycle-transitions",
      ref: `transition://${artifact.transitionId}/${artifact.artifactId}`,
    },
    subject: {
      kind: "lifecycle-transition",
      label: `${transition.route.sourceDomain} to ${transition.route.target.domain}`,
      ref: artifact.transitionId,
    },
    summary: lifecycleArtifactSummary(transition, artifact),
  };
}

function environmentSourceEvents(
  events: readonly DevIntegrationProfileHistoryEvent[],
): ConsoleActivityEvent[] {
  return events.map((event) => ({
    action: {
      id: `environment-lifecycle.${event.kind}`,
      label: event.label,
    },
    actor: {
      kind: "system",
      ref: "environment-lifecycle",
    },
    causationId: null,
    category:
      event.kind === "runtime"
        ? "runtime"
        : event.kind === "handoff"
          ? "receipt"
          : "state-change",
    correlationId: event.profileId,
    durability:
      event.provenance === "prototype-local"
        ? "prototype-local"
        : event.provenance === "synthetic-scenario"
          ? "synthetic"
          : "source-projected",
    eventId: event.eventId,
    evidenceRefs: [event.sourceRef],
    occurredAt: event.occurredAt,
    outcome:
      event.kind === "runtime"
        ? "informational"
        : event.kind === "handoff"
          ? "succeeded"
          : "succeeded",
    receiptRef: null,
    source: {
      authority: event.provenance,
      label: "Dev Integration",
      mode: event.provenance,
      owner: "environment-lifecycle",
      ref: event.sourceRef,
    },
    subject: {
      kind: "dev-integration-profile",
      label: `Profile ${event.profileId}`,
      ref: event.profileId,
    },
    summary: event.detail,
  }));
}

function deliveryActorKind(actor: string) {
  if (actor === "operator") {
    return "operator" as const;
  }
  if (actor === "advisor") {
    return "agent" as const;
  }
  if (actor === "system") {
    return "system" as const;
  }
  return "unknown" as const;
}

function deliveryCategory(category: string) {
  if (category === "receipt" || category === "apply") {
    return "receipt" as const;
  }
  if (category === "action") {
    return "command" as const;
  }
  return "state-change" as const;
}

function outcomeFromTone(tone: string): ConsoleActivityOutcome {
  switch (tone) {
    case "danger":
      return "failed";
    case "ok":
      return "succeeded";
    case "stale":
      return "stale";
    case "warn":
      return "waiting";
    default:
      return "informational";
  }
}

function outcomeFromResultState(
  state: "blocked" | "recorded" | "review-only",
): ConsoleActivityOutcome {
  switch (state) {
    case "blocked":
      return "blocked";
    case "recorded":
      return "succeeded";
    case "review-only":
      return "informational";
  }
}

function orchestrationOutcome(state: string): ConsoleActivityOutcome {
  switch (state) {
    case "blocked":
      return "blocked";
    case "failed":
      return "failed";
    case "queued":
    case "running":
      return "started";
    case "waiting":
      return "waiting";
    case "completed":
      return "succeeded";
    default:
      return "informational";
  }
}

function lifecycleArtifactLabel(artifact: LifecycleTransitionArtifact) {
  switch (artifact.artifactKind) {
    case "source-packet-prepared":
      return "Transition packet prepared";
    case "validation-started":
      return "Validation started";
    case "validation-completed":
      return "Validation completed";
    case "target-admission-recorded":
      return "Target admission recorded";
    case "authority-decision-recorded":
      return "Authority decision recorded";
    case "application-started":
      return "Target application started";
    case "target-application-recorded":
      return "Target application recorded";
    case "application-failed":
      return "Target application failed";
    case "gate-blocked":
      return "Transition gate blocked";
    case "source-correction-returned":
      return "Source correction returned";
    case "transition-deferred":
      return "Transition deferred";
    case "transition-cancelled":
      return "Transition cancelled";
    case "transition-superseded":
      return "Transition superseded";
  }
}

function lifecycleArtifactCategory(
  artifact: LifecycleTransitionArtifact,
): ConsoleActivityEvent["category"] {
  switch (artifact.artifactKind) {
    case "gate-blocked":
    case "source-correction-returned":
      return "blocker";
    case "target-admission-recorded":
    case "authority-decision-recorded":
    case "target-application-recorded":
    case "validation-completed":
      return "receipt";
    default:
      return "transition";
  }
}

function lifecycleArtifactOutcome(
  artifact: LifecycleTransitionArtifact,
): ConsoleActivityOutcome {
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

function lifecycleArtifactReceipt(
  artifact: LifecycleTransitionArtifact,
): string | null {
  switch (artifact.artifactKind) {
    case "validation-completed":
    case "target-admission-recorded":
    case "authority-decision-recorded":
    case "target-application-recorded":
    case "source-correction-returned":
    case "transition-cancelled":
    case "transition-superseded":
      return artifact.receiptRef;
    case "source-packet-prepared":
      return artifact.packet.producerReceiptRef;
    default:
      return null;
  }
}

function lifecycleArtifactEvidence(
  artifact: LifecycleTransitionArtifact,
): string[] {
  switch (artifact.artifactKind) {
    case "validation-completed":
      return artifact.gates.flatMap((gate) =>
        gate.evidenceRef ? [gate.evidenceRef] : [],
      );
    case "target-application-recorded":
      return [...artifact.resultingRefs];
    case "gate-blocked":
      return artifact.gate.evidenceRef ? [artifact.gate.evidenceRef] : [];
    default:
      return [];
  }
}

function lifecycleArtifactSummary(
  transition: LifecycleTransitionProjection,
  artifact: LifecycleTransitionArtifact,
) {
  const route = `${transition.route.sourceDomain} to ${transition.route.target.domain}`;

  switch (artifact.artifactKind) {
    case "validation-completed":
      return `${route} validation recorded outcome ${artifact.outcome}.`;
    case "target-admission-recorded":
      return `${route} target admission recorded result ${artifact.result}.`;
    case "authority-decision-recorded":
      return `${route} authority recorded decision ${artifact.decision}.`;
    case "application-failed":
      return `${route} application failed with code ${artifact.failureCode}.`;
    case "gate-blocked":
      return `${route} stopped at gate ${artifact.gate.gateId}.`;
    case "source-correction-returned":
      return `${route} returned correction ${artifact.instruction.reasonCode}.`;
    case "transition-deferred":
      return `${route} deferred until ${artifact.reviewAt}.`;
    default:
      return `${route} recorded ${artifact.artifactKind}.`;
  }
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
