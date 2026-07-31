import type {
  OperationCommandEnvelope,
  OperationCommandPreconditions,
  OperationCommandRunEnvelope,
  OperationExpectedVersion,
  OperationProjectionBundle,
  OperationReceiptEnvelope,
  OperationRuntimeSource,
} from "./operation-runtime-types.ts";
import { prototypeLocalOperatorAttribution } from "../../console-integration/operator-attribution.ts";

export function createOperationCommandPreconditions({
  dependencies = [],
  primary,
}: {
  dependencies?: readonly OperationExpectedVersion[];
  primary: OperationExpectedVersion;
}): OperationCommandPreconditions {
  return {
    dependencies: [...dependencies],
    primary,
  };
}

export function createPrototypeLocalOperationCommand<TCommand>({
  command,
  commandName,
  preconditions,
  recordId,
  runtimeSource,
  submittedAt,
}: {
  command: TCommand;
  commandName: string;
  preconditions: OperationCommandPreconditions;
  recordId: string;
  runtimeSource: OperationRuntimeSource & { mode: "local" };
  submittedAt: string;
}): OperationCommandEnvelope<TCommand> {
  return {
    ...runtimeSource,
    actionSemantic: "prototype-local-simulation",
    actorId: prototypeLocalOperatorAttribution.actorId,
    command,
    commandName,
    idempotencyKey: createOperationIdempotencyKey({
      command,
      commandName,
      preconditions,
      recordId,
    }),
    preconditions,
    recordId,
    requiredCapability: "canSubmit",
    schemaVersion: "1",
    sessionId: prototypeLocalOperatorAttribution.sessionId,
    submittedAt,
  };
}

export function createOperationIdempotencyKey({
  command,
  commandName,
  preconditions,
  recordId,
}: {
  command: unknown;
  commandName: string;
  preconditions: OperationCommandPreconditions;
  recordId: string;
}) {
  const identity = stableSerialize({
    command,
    commandName,
    preconditions: operationExpectedVersions(preconditions),
    recordId,
  });

  return `operation-${stableHash(identity)}`;
}

export function createLocalOperationProjectionVersion({
  projection,
  sourceOwner,
}: {
  projection: unknown;
  sourceOwner: string;
}) {
  return `local-projection-${operationVersionSlug(sourceOwner)}-${stableHash(
    stableSerialize(projection),
  )}`;
}

export function operationExpectedVersions(
  preconditions: OperationCommandPreconditions,
) {
  return [preconditions.primary, ...preconditions.dependencies];
}

export function operationProjectionConflicts<TProjection>(
  bundle: OperationProjectionBundle<TProjection>,
  preconditions: OperationCommandPreconditions,
) {
  const currentVersions = new Map(
    [bundle.primary, ...bundle.dependencies].map((snapshot) => [
      `${snapshot.sourceOwner}:${snapshot.recordId}`,
      snapshot.projectionVersion,
    ]),
  );

  return operationExpectedVersions(preconditions).filter(
    (expected) =>
      currentVersions.get(`${expected.sourceOwner}:${expected.recordId}`) !==
      expected.version,
  );
}

export function operationRunCanReportSuccess<TRun, TReceipt>(
  run: OperationCommandRunEnvelope<TRun>,
  receipt: OperationReceiptEnvelope<TReceipt> | null,
) {
  return (
    run.state === "completed" &&
    receipt?.commandName === run.commandName &&
    receipt.runId === run.runId
  );
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
    .join(",")}}`;
}

function stableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function operationVersionSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
