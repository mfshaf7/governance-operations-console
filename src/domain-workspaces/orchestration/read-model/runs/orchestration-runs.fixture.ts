import type {
  OrchestrationRunControl,
  OrchestrationRunEvent,
  OrchestrationRunLifecycle,
  OrchestrationRunNode,
  OrchestrationRunNodeState,
  OrchestrationRunRecord,
} from "../../domain/orchestration-run-types.ts";

const observedAt = "2026-07-16T00:00:00.000Z";

const syntheticRunSource = {
  authority: "workspace-prototype-studio",
  freshness: "current",
  mode: "synthetic-scenario",
  observedAt,
  ref: "scenario://orchestration/runs",
  schemaVersion: "1",
  sourceVersion: "orchestration-run-scenarios-v1",
} as const;

export const orchestrationRunRecords: OrchestrationRunRecord[] = [
  createRun({
    businessState: {
      label: "Landing requested",
      sourceDomain: "prototype",
    },
    controls: controls({
      cancel: true,
    }),
    currentNodeId: null,
    effectPosture: "none",
    events: [
      event(
        "scenario-run-queued-event-1",
        1,
        "queued",
        "Synthetic request accepted and queued without effects.",
        "2026-07-16T08:00:00.000Z",
      ),
    ],
    id: "orchestration-run-scenario-queued",
    nodes: landingNodes({
      locks: "queued",
      preview: "queued",
      scaffold: "queued",
      support: "queued",
      verify: "queued",
    }),
    requestId: "scenario-request-queued",
    runId: "scenario-run-queued",
    scenarioKind: "queued-no-effects",
    state: "queued",
    updatedAt: "2026-07-16T08:00:00.000Z",
  }),
  createRun({
    businessState: {
      label: "Landing in progress",
      sourceDomain: "prototype",
    },
    controls: controls({
      cancel: true,
      defer: true,
    }),
    currentNodeId: "scaffold",
    effectPosture: "possible",
    events: [
      event(
        "scenario-run-running-event-1",
        1,
        "queued",
        "Synthetic request accepted.",
        "2026-07-16T08:10:00.000Z",
      ),
      event(
        "scenario-run-running-event-2",
        2,
        "running",
        "Project scaffold activity started.",
        "2026-07-16T08:11:00.000Z",
        "scaffold",
      ),
    ],
    id: "orchestration-run-scenario-running",
    nodes: landingNodes({
      locks: "completed",
      preview: "queued",
      scaffold: "running",
      support: "queued",
      verify: "queued",
    }),
    requestId: "scenario-request-running",
    runId: "scenario-run-running",
    scenarioKind: "running-possible-effects",
    state: "running",
    updatedAt: "2026-07-16T08:11:00.000Z",
  }),
  createRun({
    businessState: {
      label: "Landing in progress",
      sourceDomain: "prototype",
    },
    controls: controls({
      cancel: true,
      "provide-signal": true,
    }),
    currentNodeId: "support",
    effectPosture: "possible",
    events: [
      event(
        "scenario-run-waiting-event-1",
        1,
        "running",
        "Synthetic support configuration started.",
        "2026-07-16T08:20:00.000Z",
        "support",
      ),
      event(
        "scenario-run-waiting-event-2",
        2,
        "waiting",
        "Run entered a healthy dependency wait.",
        "2026-07-16T08:22:00.000Z",
        "support",
      ),
    ],
    id: "orchestration-run-scenario-waiting",
    nodes: landingNodes({
      locks: "completed",
      preview: "queued",
      scaffold: "completed",
      support: "waiting",
      verify: "queued",
    }),
    requestId: "scenario-request-waiting",
    runId: "scenario-run-waiting",
    scenarioKind: "healthy-wait",
    state: "waiting",
    updatedAt: "2026-07-16T08:22:00.000Z",
    wait: {
      deadline: "2026-07-18T08:22:00.000Z",
      enteredAt: "2026-07-16T08:22:00.000Z",
      expectedRef: "dependency://scenario/toolchain-inventory",
      id: "scenario-wait-toolchain",
      kind: "dependency",
      owner: "Synthetic prototype adapter",
      reason: "Waiting for the selected toolchain inventory projection.",
      requiresOperatorAction: false,
      timeoutBehavior:
        "Record a blocked condition if the dependency remains absent at the deadline.",
    },
  }),
  createRun({
    blocker: {
      detail:
        "The synthetic support setup retained a partial configuration but canonical verification could not complete.",
      evidenceRefs: ["scenario-evidence://blocked/support-partial"],
      id: "scenario-blocker-support-verification",
      owner: "Synthetic prototype adapter",
      remediation:
        "Repair the support inventory and request resume from the retained checkpoint.",
      supportedDispositions: ["remove", "workaround", "defer"],
    },
    businessState: {
      label: "Landing blocked",
      sourceDomain: "prototype",
    },
    controls: controls({
      cancel: true,
      resume: false,
    }),
    currentNodeId: "support",
    effectPosture: "partial",
    events: [
      event(
        "scenario-run-blocked-event-1",
        1,
        "running",
        "Synthetic support configuration wrote partial state.",
        "2026-07-16T08:30:00.000Z",
        "support",
      ),
      event(
        "scenario-run-blocked-event-2",
        2,
        "blocked",
        "Verification blocker recorded with retained effects.",
        "2026-07-16T08:33:00.000Z",
        "support",
      ),
    ],
    id: "orchestration-run-scenario-blocked",
    nodes: landingNodes({
      locks: "completed",
      preview: "queued",
      scaffold: "completed",
      support: "blocked",
      verify: "queued",
    }),
    requestId: "scenario-request-blocked",
    runId: "scenario-run-blocked",
    scenarioKind: "blocked-partial-effects",
    state: "blocked",
    updatedAt: "2026-07-16T08:33:00.000Z",
  }),
  createRun({
    businessState: {
      label: "Landing failed",
      sourceDomain: "prototype",
    },
    controls: controls({
      retry: true,
    }),
    currentNodeId: "preview",
    effectPosture: "partial",
    events: [
      event(
        "scenario-run-failed-event-1",
        1,
        "running",
        "Synthetic preview preparation started.",
        "2026-07-16T08:40:00.000Z",
        "preview",
      ),
      event(
        "scenario-run-failed-event-2",
        2,
        "failed",
        "Preview preparation failed; retry remains available.",
        "2026-07-16T08:42:00.000Z",
        "preview",
      ),
    ],
    failure: {
      detail:
        "The synthetic preview adapter returned a retryable startup failure.",
      failedNodeId: "preview",
      id: "scenario-failure-preview-start",
      owner: "Synthetic host adapter",
      retryExhausted: false,
      retryable: true,
    },
    id: "orchestration-run-scenario-failed",
    nodes: landingNodes({
      locks: "completed",
      preview: "failed",
      scaffold: "completed",
      support: "completed",
      verify: "queued",
    }),
    requestId: "scenario-request-failed",
    retry: {
      attempts: 1,
      available: true,
      backoff: "30 seconds",
      maxAttempts: 3,
      nextEligibleAt: "2026-07-16T08:42:30.000Z",
    },
    runId: "scenario-run-failed",
    scenarioKind: "failed-retry-available",
    state: "failed",
    updatedAt: "2026-07-16T08:42:00.000Z",
  }),
  createRun({
    businessState: {
      label: "Landing complete",
      sourceDomain: "prototype",
    },
    completedAt: "2026-07-16T08:55:00.000Z",
    controls: controls({}),
    currentNodeId: "verify",
    effectPosture: "verified",
    events: [
      event(
        "scenario-run-completed-event-1",
        1,
        "running",
        "Synthetic landing verification started.",
        "2026-07-16T08:53:00.000Z",
        "verify",
      ),
      event(
        "scenario-run-completed-event-2",
        2,
        "completed",
        "Synthetic landing outputs verified and final receipt recorded.",
        "2026-07-16T08:55:00.000Z",
        "verify",
      ),
    ],
    id: "orchestration-run-scenario-completed",
    nodes: landingNodes({
      locks: "completed",
      preview: "completed",
      scaffold: "completed",
      support: "completed",
      verify: "completed",
    }),
    receipt: {
      outcome: "completed",
      receiptId: "scenario-receipt-completed",
      recordedAt: "2026-07-16T08:55:00.000Z",
      ref: "scenario-receipt://prototype-landing/completed",
      verified: true,
    },
    requestId: "scenario-request-completed",
    runId: "scenario-run-completed",
    scenarioKind: "completed-verified-effects",
    state: "completed",
    updatedAt: "2026-07-16T08:55:00.000Z",
  }),
  createRun({
    businessState: {
      label: "Landing cancelled",
      sourceDomain: "prototype",
    },
    completedAt: "2026-07-16T09:05:00.000Z",
    controls: controls({}),
    currentNodeId: "support",
    effectPosture: "partial",
    events: [
      event(
        "scenario-run-cancelled-event-1",
        1,
        "running",
        "Synthetic support setup started after scaffold completion.",
        "2026-07-16T09:02:00.000Z",
        "support",
      ),
      event(
        "scenario-run-cancelled-event-2",
        2,
        "cancelled",
        "Synthetic run cancelled with retained scaffold effects.",
        "2026-07-16T09:05:00.000Z",
        "support",
      ),
    ],
    id: "orchestration-run-scenario-cancelled",
    nodes: landingNodes({
      locks: "completed",
      preview: "cancelled",
      scaffold: "completed",
      support: "cancelled",
      verify: "cancelled",
    }),
    receipt: {
      outcome: "cancelled_with_effects",
      receiptId: "scenario-receipt-cancelled",
      recordedAt: "2026-07-16T09:05:00.000Z",
      ref: "scenario-receipt://prototype-landing/cancelled",
      verified: true,
    },
    requestId: "scenario-request-cancelled",
    runId: "scenario-run-cancelled",
    scenarioKind: "cancelled-retained-effects",
    state: "cancelled",
    updatedAt: "2026-07-16T09:05:00.000Z",
  }),
];

type RunFixtureInput = Pick<
  OrchestrationRunRecord,
  | "controls"
  | "currentNodeId"
  | "effectPosture"
  | "events"
  | "id"
  | "nodes"
  | "requestId"
  | "runId"
  | "scenarioKind"
  | "state"
  | "updatedAt"
> &
  Partial<
    Omit<
      OrchestrationRunRecord,
      | "controls"
      | "currentNodeId"
      | "effectPosture"
      | "events"
      | "id"
      | "nodes"
      | "requestId"
      | "runId"
      | "scenarioKind"
      | "state"
      | "updatedAt"
    >
  >;

function createRun(input: RunFixtureInput): OrchestrationRunRecord {
  return {
    artifactRefs: ["scenario-artifact://prototype-landing/inventory"],
    blocker: null,
    businessState: {
      label: "Landing in progress",
      sourceDomain: "prototype",
    },
    causationRef: `scenario-causation://${input.requestId}`,
    completedAt: null,
    correlationRef: `scenario-correlation://${input.requestId}`,
    createdAt: input.updatedAt,
    definitionFamilyId: "scenario.prototype.landing",
    definitionId: "scenario.prototype.landing.run",
    definitionVersion: "3",
    evidenceRefs: ["scenario-evidence://prototype-landing/operator-safe"],
    failure: null,
    logRefs: ["scenario-log://prototype-landing/operator-safe"],
    receipt: null,
    retry: {
      attempts: 0,
      available: false,
      backoff: "not applicable",
      maxAttempts: 0,
      nextEligibleAt: null,
    },
    runtimeDiagnostics: {
      adapter: "synthetic-runtime-adapter",
      detail:
        "Scenario coverage only. No OOS durable API, worker, or Temporal runtime is connected.",
      liveRuntimeClaimed: false,
      state: "synthetic",
      worker: "synthetic-worker",
    },
    source: syntheticRunSource,
    sourceDomain: "prototype",
    sourceProjectionRef: `scenario-projection://${input.runId}`,
    sourceProjectionVersion: "scenario-v1",
    sourceRecordRef: `prototype-scenario://${input.requestId}`,
    wait: null,
    ...input,
  };
}

function landingNodes(
  states: Record<
    "locks" | "preview" | "scaffold" | "support" | "verify",
    OrchestrationRunNodeState
  >,
): OrchestrationRunNode[] {
  return [
    runNode("locks", "Acquire source and target locks", states.locks, 1),
    runNode("scaffold", "Prepare project scaffold", states.scaffold, 1),
    runNode("support", "Configure selected support", states.support, 1),
    runNode("preview", "Prepare preview adapter", states.preview, 1),
    runNode("verify", "Verify landing outputs", states.verify, 1),
  ];
}

function runNode(
  id: string,
  label: string,
  state: OrchestrationRunNodeState,
  attempt: number,
): OrchestrationRunNode {
  const started = state === "queued" ? null : "2026-07-16T08:00:00.000Z";
  const completed = state === "completed" ? "2026-07-16T08:05:00.000Z" : null;

  return {
    artifactRefs: [`scenario-artifact://${id}`],
    attempt,
    completedAt: completed,
    duration: completed ? "5 minutes" : null,
    id,
    inputRefs: [`scenario-input://${id}`],
    label,
    logRefs: [`scenario-log://${id}`],
    outputRefs: [`scenario-output://${id}`],
    owner:
      id === "preview"
        ? "Synthetic host adapter"
        : "Synthetic prototype adapter",
    parallelGroup: null,
    receiptRefs: completed ? [`scenario-receipt://${id}`] : [],
    skipReason: state === "skipped" ? "Synthetic branch not selected." : null,
    startedAt: started,
    state,
    type: "activity",
  };
}

function controls(
  available: Partial<Record<OrchestrationRunControl["id"], boolean>>,
): OrchestrationRunControl[] {
  return [
    control("retry", "Retry", available.retry ?? false),
    control("resume", "Resume", available.resume ?? false),
    control(
      "provide-signal",
      "Provide Signal",
      available["provide-signal"] ?? false,
    ),
    control("defer", "Defer", available.defer ?? false),
    control("cancel", "Cancel", available.cancel ?? false),
  ];
}

function control(
  id: OrchestrationRunControl["id"],
  label: string,
  available: boolean,
): OrchestrationRunControl {
  return {
    available,
    disabledReason: available
      ? null
      : "This control is not available for the current synthetic run posture.",
    expectedEffect:
      id === "cancel"
        ? "Stop future nodes without rolling back retained effects."
        : `Record a bounded ${label.toLowerCase()} request against this run.`,
    id,
    idempotencyPosture: "Repeated identical requests reuse one local receipt.",
    label,
    owner: "Operator Orchestration Service after admission",
  };
}

function event(
  eventId: string,
  sequence: number,
  state: OrchestrationRunLifecycle,
  summary: string,
  occurredAt: string,
  nodeId: string | null = null,
): OrchestrationRunEvent {
  return {
    eventId,
    material: true,
    nodeId,
    occurredAt,
    sequence,
    state,
    summary,
  };
}
