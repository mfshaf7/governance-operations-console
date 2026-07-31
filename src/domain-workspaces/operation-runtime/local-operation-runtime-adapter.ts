import type {
  OperationCommandEnvelope,
  OperationCommandRunEnvelope,
  OperationCommandRunEvent,
  OperationCommandRunResult,
  OperationDraftEnvelope,
  OperationProjectionBundle,
  OperationProjectionListener,
  OperationReceiptEnvelope,
  OperationReceiptResult,
  OperationRuntimeCapability,
  OperationRuntimeCapabilities,
  OperationRuntimePort,
  OperationRuntimeSource,
} from "./operation-runtime-types.ts";

export type LocalOperationRuntimeAdapterOptions<
  TProjection,
  TCommand,
  TRun,
  TReceipt,
> = {
  capabilities?: Partial<Omit<OperationRuntimeCapabilities, "mode">>;
  clock?: () => string;
  commandRunner?: (
    command: OperationCommandEnvelope<TCommand>,
  ) =>
    OperationCommandRunResult<TRun> | Promise<OperationCommandRunResult<TRun>>;
  initialProjections?: Array<OperationProjectionBundle<TProjection>>;
  initialReceipts?: Array<OperationReceiptEnvelope<TReceipt>>;
  receiptFactory?: ({
    command,
    run,
  }: {
    command: OperationCommandEnvelope<TCommand>;
    run: OperationCommandRunEnvelope<TRun>;
  }) =>
    | OperationReceiptResult<TReceipt>
    | null
    | Promise<OperationReceiptResult<TReceipt> | null>;
  runtimeSource: OperationRuntimeSource & { mode: "local" };
};

export class OperationRuntimeCapabilityError extends Error {
  constructor(capability: OperationRuntimeCapability) {
    super(`Operation runtime capability "${capability}" is unavailable.`);
    this.name = "OperationRuntimeCapabilityError";
  }
}

export class OperationRuntimeInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationRuntimeInvariantError";
  }
}

export function createLocalOperationRuntimeAdapter<
  TProjection,
  TDraft,
  TCommand,
  TRun = { message: string },
  TReceipt = unknown,
>({
  capabilities: capabilityOverrides,
  clock = operationRuntimeTimestamp,
  commandRunner,
  initialProjections = [],
  initialReceipts = [],
  receiptFactory,
  runtimeSource,
}: LocalOperationRuntimeAdapterOptions<
  TProjection,
  TCommand,
  TRun,
  TReceipt
>): OperationRuntimePort<TProjection, TDraft, TCommand, TRun, TReceipt> {
  const capabilities: OperationRuntimeCapabilities = Object.freeze({
    canCancel: false,
    canInspectRawLogs: false,
    canRefresh: initialProjections.length > 0,
    canRetry: Boolean(commandRunner),
    canSubmit: Boolean(commandRunner),
    canSubscribe: false,
    mode: "local",
    ...capabilityOverrides,
  });
  const projections = new Map(
    initialProjections.map((bundle) => [
      operationProjectionKey(
        bundle.primary.recordId,
        bundle.primary.projectionVersion,
      ),
      bundle,
    ]),
  );
  const latestProjectionVersionByRecord = new Map<string, string>();
  const drafts = new Map<string, OperationDraftEnvelope<TDraft>>();
  const runs = new Map<string, OperationCommandRunEnvelope<TRun>>();
  const runIdByIdempotencyKey = new Map<string, string>();
  const receipts = new Map(
    initialReceipts.map((receipt) => [receipt.receiptId, receipt]),
  );
  const listeners = new Map<
    string,
    Set<OperationProjectionListener<TProjection>>
  >();

  for (const bundle of initialProjections) {
    latestProjectionVersionByRecord.set(
      bundle.primary.recordId,
      bundle.primary.projectionVersion,
    );
  }

  return {
    async cancelCommand(runId) {
      if (!capabilities.canCancel) {
        throw new OperationRuntimeCapabilityError("canCancel");
      }

      const current = runs.get(runId);
      if (!current || operationRunTerminal(current.state)) {
        return current ?? null;
      }

      const canceledAt = clock();
      const canceled: OperationCommandRunEnvelope<TRun> = {
        ...current,
        events: [
          ...current.events,
          operationRunEvent({
            occurredAt: canceledAt,
            runId,
            sequence: current.events.length + 1,
            state: "canceled",
            summary: `${current.commandName} canceled.`,
          }),
        ],
        state: "canceled",
        updatedAt: canceledAt,
      };
      runs.set(runId, canceled);
      return canceled;
    },
    async discardDraft(draftKey) {
      drafts.delete(draftKey);
    },
    getCapabilities() {
      return capabilities;
    },
    async getCommandRun(runId) {
      return runs.get(runId) ?? null;
    },
    async getReceipt(receiptId) {
      return receipts.get(receiptId) ?? null;
    },
    getRuntimeSource() {
      return runtimeSource;
    },
    async listCommandEvents(runId) {
      return runs.get(runId)?.events ?? [];
    },
    async listReceipts(recordId) {
      return Array.from(receipts.values()).filter(
        (receipt) => receipt.recordId === recordId,
      );
    },
    async loadDraft(draftKey) {
      return drafts.get(draftKey) ?? null;
    },
    async readProjection(recordId) {
      return readLatestProjection(recordId);
    },
    async refreshProjection(recordId) {
      if (!capabilities.canRefresh) {
        throw new OperationRuntimeCapabilityError("canRefresh");
      }

      const projection = readLatestProjection(recordId);
      if (projection) {
        notifyProjection(recordId, projection);
      }
      return projection;
    },
    async saveDraft(draftKey, draft, options) {
      const now = clock();
      const savedDraft: OperationDraftEnvelope<TDraft> = {
        ...runtimeSource,
        draft,
        draftKey,
        draftVersion: `local-draft-${operationRuntimeSlug(`${draftKey}-${now}`)}`,
        preconditions: options?.preconditions ?? null,
        savedAt: now,
        schemaVersion: "1",
      };
      drafts.set(draftKey, savedDraft);
      return savedDraft;
    },
    async submitCommand(command) {
      if (!capabilities.canSubmit || !commandRunner) {
        throw new OperationRuntimeCapabilityError("canSubmit");
      }
      assertLocalCommand(command, runtimeSource);
      if (!capabilities[command.requiredCapability]) {
        throw new OperationRuntimeCapabilityError(command.requiredCapability);
      }

      const existingRunId = runIdByIdempotencyKey.get(command.idempotencyKey);
      if (existingRunId) {
        const existingRun = runs.get(existingRunId);
        if (existingRun) {
          return existingRun;
        }
      }

      const result = await commandRunner(command);
      const run = operationRunEnvelope({ command, result, runtimeSource });
      const receiptResult = receiptFactory
        ? await receiptFactory({ command, run })
        : null;

      if (run.state === "completed" && !receiptResult) {
        throw new OperationRuntimeInvariantError(
          `${command.commandName} completed without a receipt.`,
        );
      }

      runs.set(run.runId, run);
      runIdByIdempotencyKey.set(command.idempotencyKey, run.runId);

      if (receiptResult) {
        const receipt = operationReceiptEnvelope({
          command,
          receiptResult,
          run,
          runtimeSource,
        });
        receipts.set(receipt.receiptId, receipt);
      }

      return run;
    },
    subscribeProjection(recordId, listener) {
      const recordListeners = listeners.get(recordId) ?? new Set();
      recordListeners.add(listener);
      listeners.set(recordId, recordListeners);

      return () => {
        recordListeners.delete(listener);
        if (recordListeners.size === 0) {
          listeners.delete(recordId);
        }
      };
    },
  };

  function readLatestProjection(recordId: string) {
    const projectionVersion = latestProjectionVersionByRecord.get(recordId);
    return projectionVersion
      ? (projections.get(operationProjectionKey(recordId, projectionVersion)) ??
          null)
      : null;
  }

  function notifyProjection(
    recordId: string,
    projection: OperationProjectionBundle<TProjection>,
  ) {
    const recordListeners = listeners.get(recordId);
    if (!recordListeners) {
      return;
    }

    for (const listener of recordListeners) {
      listener(projection);
    }
  }
}

function assertLocalCommand<TCommand>(
  command: OperationCommandEnvelope<TCommand>,
  runtimeSource: OperationRuntimeSource & { mode: "local" },
) {
  if (command.actionSemantic !== "prototype-local-simulation") {
    throw new OperationRuntimeInvariantError(
      "Local runtime accepts prototype-local simulation commands only.",
    );
  }
  if (
    command.mode !== runtimeSource.mode ||
    command.authority !== runtimeSource.authority ||
    command.sourceOwner !== runtimeSource.sourceOwner
  ) {
    throw new OperationRuntimeInvariantError(
      "Command authority does not match the active runtime source.",
    );
  }
  if (command.preconditions.primary.recordId !== command.recordId) {
    throw new OperationRuntimeInvariantError(
      "Command primary precondition must reference the command record.",
    );
  }
}

function operationRunEnvelope<TCommand, TRun>({
  command,
  result,
  runtimeSource,
}: {
  command: OperationCommandEnvelope<TCommand>;
  result: OperationCommandRunResult<TRun>;
  runtimeSource: OperationRuntimeSource & { mode: "local" };
}): OperationCommandRunEnvelope<TRun> {
  const runId = `local-run-${operationRuntimeSlug(command.idempotencyKey)}`;
  const updatedAt = result.updatedAt ?? command.submittedAt;
  const events: OperationCommandRunEvent[] = [
    operationRunEvent({
      occurredAt: command.submittedAt,
      runId,
      sequence: 1,
      state: "accepted",
      summary: `${command.commandName} accepted by the prototype-local runtime.`,
    }),
  ];

  for (const progress of result.progress ?? []) {
    events.push(
      operationRunEvent({
        occurredAt: progress.occurredAt ?? updatedAt,
        runId,
        sequence: events.length + 1,
        state: progress.state,
        summary: progress.summary,
      }),
    );
  }

  if (result.state !== "accepted" && events.at(-1)?.state !== result.state) {
    events.push(
      operationRunEvent({
        occurredAt: updatedAt,
        runId,
        sequence: events.length + 1,
        state: result.state,
        summary: result.summary,
      }),
    );
  }

  return {
    ...runtimeSource,
    actorId: command.actorId,
    commandName: command.commandName,
    events,
    idempotencyKey: command.idempotencyKey,
    recordId: command.recordId,
    run: result.run,
    runId,
    schemaVersion: "1",
    sessionId: command.sessionId,
    state: result.state,
    submittedAt: command.submittedAt,
    updatedAt,
  };
}

function operationReceiptEnvelope<TCommand, TRun, TReceipt>({
  command,
  receiptResult,
  run,
  runtimeSource,
}: {
  command: OperationCommandEnvelope<TCommand>;
  receiptResult: OperationReceiptResult<TReceipt>;
  run: OperationCommandRunEnvelope<TRun>;
  runtimeSource: OperationRuntimeSource & { mode: "local" };
}): OperationReceiptEnvelope<TReceipt> {
  return {
    ...runtimeSource,
    actorId: command.actorId,
    commandName: run.commandName,
    durability: receiptResult.durability,
    receipt: receiptResult.receipt,
    receiptId: receiptResult.receiptId,
    recordedAt: receiptResult.recordedAt ?? run.updatedAt,
    recordId: receiptResult.recordId ?? run.recordId,
    runId: run.runId,
    schemaVersion: "1",
    sessionId: command.sessionId,
    sourceVersions: [
      command.preconditions.primary,
      ...command.preconditions.dependencies,
    ],
  };
}

function operationRunEvent({
  occurredAt,
  runId,
  sequence,
  state,
  summary,
}: {
  occurredAt: string;
  runId: string;
  sequence: number;
  state: OperationCommandRunEvent["state"];
  summary: string;
}): OperationCommandRunEvent {
  return {
    eventId: `${runId}-event-${sequence}`,
    occurredAt,
    sequence,
    state,
    summary,
  };
}

function operationRunTerminal(state: OperationCommandRunEvent["state"]) {
  return ["blocked", "canceled", "completed", "failed", "stale"].includes(
    state,
  );
}

function operationProjectionKey(recordId: string, projectionVersion: string) {
  return `${recordId}:${projectionVersion}`;
}

function operationRuntimeTimestamp() {
  return new Date().toISOString();
}

function operationRuntimeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
