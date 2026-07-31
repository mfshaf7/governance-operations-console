export const OPERATION_ARTIFACT_SCHEMA_VERSION = "1" as const;

export type OperationArtifactSchemaVersion =
  typeof OPERATION_ARTIFACT_SCHEMA_VERSION;

export type OperationRuntimeMode = "local" | "live";

export type OperationRuntimeAuthority =
  | "backend"
  | "domain"
  | "fixture"
  | "oos"
  | "platform"
  | "prototype-local"
  | "wgcf";

export type OperationProjectionFreshness =
  "current" | "offline" | "stale" | "unknown";

export type OperationCommandRunState =
  | "accepted"
  | "blocked"
  | "canceled"
  | "completed"
  | "failed"
  | "queued"
  | "running"
  | "stale"
  | "unknown";

export type OperationActionSemantic =
  "durable-command" | "prototype-local-simulation";

export type OperationReceiptDurability = "durable" | "prototype-local";

export type OperationPacketCustodyState =
  "admitted" | "dispatched" | "prepared" | "rejected" | "returned";

export type OperationRuntimeSource = {
  authority: OperationRuntimeAuthority;
  mode: OperationRuntimeMode;
  sourceOwner: string;
};

export type OperationExpectedVersion = {
  recordId: string;
  sourceOwner: string;
  version: string;
};

export type OperationCommandPreconditions = {
  dependencies: readonly OperationExpectedVersion[];
  primary: OperationExpectedVersion;
};

export type OperationSourceSnapshot<TProjection> = Readonly<
  OperationRuntimeSource & {
    freshness: OperationProjectionFreshness;
    observedAt: string;
    projection: DeepReadonly<TProjection>;
    projectionVersion: string;
    recordId: string;
    schemaVersion: OperationArtifactSchemaVersion;
  }
>;

export type OperationDependencySnapshot<TProjection = unknown> =
  OperationSourceSnapshot<TProjection>;

export type OperationProjectionBundle<
  TProjection,
  TDependencyProjection = unknown,
> = Readonly<{
  dependencies: readonly OperationDependencySnapshot<TDependencyProjection>[];
  primary: OperationSourceSnapshot<TProjection>;
}>;

export type OperationProjectionEnvelope<TProjection> =
  OperationSourceSnapshot<TProjection>;

export type OperationDraftEnvelope<TDraft> = OperationRuntimeSource & {
  draft: TDraft;
  draftKey: string;
  draftVersion: string;
  preconditions: OperationCommandPreconditions | null;
  savedAt: string;
  schemaVersion: OperationArtifactSchemaVersion;
};

export type OperationCommandEnvelope<TCommand> = OperationRuntimeSource & {
  actionSemantic: OperationActionSemantic;
  actorId: string;
  command: TCommand;
  commandName: string;
  idempotencyKey: string;
  preconditions: OperationCommandPreconditions;
  recordId: string;
  requiredCapability: OperationRuntimeCapability;
  schemaVersion: OperationArtifactSchemaVersion;
  sessionId: string;
  submittedAt: string;
};

export type OperationCrossDomainPacketEnvelope<TPayload> = Readonly<{
  authority: OperationRuntimeAuthority;
  causationId: string;
  correlationId: string;
  createdAt: string;
  custodyOwner: string;
  packetId: string;
  payload: DeepReadonly<TPayload>;
  producerReceiptRef: string | null;
  schemaVersion: OperationArtifactSchemaVersion;
  sourceDomain: string;
  sourceOwner: string;
  sourceRecordId: string;
  sourceVersion: string;
  targetDomain: string;
}>;

export type OperationPacketCustodyProjection = Readonly<{
  custodyOwner: string;
  packetId: string;
  receiptRef: string | null;
  recordedAt: string;
  state: OperationPacketCustodyState;
}>;

export type OperationCommandRunEvent = {
  eventId: string;
  occurredAt: string;
  sequence: number;
  state: OperationCommandRunState;
  summary: string;
};

export type OperationCommandRunResult<TRun> = {
  progress?: readonly {
    occurredAt?: string;
    state: OperationCommandRunState;
    summary: string;
  }[];
  run: TRun;
  state: OperationCommandRunState;
  summary: string;
  updatedAt?: string;
};

export type OperationCommandRunEnvelope<TRun> = OperationRuntimeSource & {
  actorId: string;
  commandName: string;
  events: readonly OperationCommandRunEvent[];
  idempotencyKey: string;
  recordId: string;
  run: TRun;
  runId: string;
  schemaVersion: OperationArtifactSchemaVersion;
  sessionId: string;
  state: OperationCommandRunState;
  submittedAt: string;
  updatedAt: string;
};

export type OperationReceiptResult<TReceipt> = {
  durability: OperationReceiptDurability;
  receipt: TReceipt;
  receiptId: string;
  recordedAt?: string;
  recordId?: string;
};

export type OperationReceiptEnvelope<TReceipt> = OperationRuntimeSource & {
  actorId: string;
  commandName: string;
  durability: OperationReceiptDurability;
  receipt: TReceipt;
  receiptId: string;
  recordId: string;
  recordedAt: string;
  runId: string;
  schemaVersion: OperationArtifactSchemaVersion;
  sessionId: string;
  sourceVersions: readonly OperationExpectedVersion[];
};

export type OperationRuntimeCapabilities = {
  canCancel: boolean;
  canInspectRawLogs: boolean;
  canRefresh: boolean;
  canRetry: boolean;
  canSubmit: boolean;
  canSubscribe: boolean;
  mode: OperationRuntimeMode;
};

export type OperationRuntimeCapability = Exclude<
  keyof OperationRuntimeCapabilities,
  "mode"
>;

export type OperationProjectionListener<TProjection> = (
  projection: OperationProjectionBundle<TProjection>,
) => void;

export type OperationRuntimePort<
  TProjection,
  TDraft,
  TCommand,
  TRun,
  TReceipt,
> = {
  cancelCommand(
    runId: string,
  ): Promise<OperationCommandRunEnvelope<TRun> | null>;
  discardDraft(draftKey: string): Promise<void>;
  getCapabilities(): OperationRuntimeCapabilities;
  getCommandRun(
    runId: string,
  ): Promise<OperationCommandRunEnvelope<TRun> | null>;
  getReceipt(
    receiptId: string,
  ): Promise<OperationReceiptEnvelope<TReceipt> | null>;
  getRuntimeSource(): OperationRuntimeSource;
  listCommandEvents(
    runId: string,
  ): Promise<readonly OperationCommandRunEvent[]>;
  listReceipts(
    recordId: string,
  ): Promise<Array<OperationReceiptEnvelope<TReceipt>>>;
  loadDraft(draftKey: string): Promise<OperationDraftEnvelope<TDraft> | null>;
  readProjection(
    recordId: string,
  ): Promise<OperationProjectionBundle<TProjection> | null>;
  refreshProjection(
    recordId: string,
  ): Promise<OperationProjectionBundle<TProjection> | null>;
  saveDraft(
    draftKey: string,
    draft: TDraft,
    options?: { preconditions?: OperationCommandPreconditions | null },
  ): Promise<OperationDraftEnvelope<TDraft>>;
  submitCommand(
    command: OperationCommandEnvelope<TCommand>,
  ): Promise<OperationCommandRunEnvelope<TRun>>;
  subscribeProjection(
    recordId: string,
    listener: OperationProjectionListener<TProjection>,
  ): () => void;
};

type DeepReadonly<TValue> = TValue extends (...args: never[]) => unknown
  ? TValue
  : TValue extends readonly (infer TItem)[]
    ? readonly DeepReadonly<TItem>[]
    : TValue extends object
      ? { readonly [TKey in keyof TValue]: DeepReadonly<TValue[TKey]> }
      : TValue;
