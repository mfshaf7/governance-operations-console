export const CONSOLE_SOURCE_AUTHORITY_SCHEMA_VERSION = 1 as const;
export const CONSOLE_SOURCE_PROJECTION_MEDIA_TYPE =
  "application/vnd.mfshaf7.console-source-projection+json; version=1";

const maxTrackedSourceProjections = 500;
const acceptedSourceProjections = new Map<
  string,
  ConsoleSourceProjection
>();

export type ConsoleSourceFreshnessState =
  | "current"
  | "stale"
  | "unavailable"
  | "unknown";

export type ConsoleSourceBinding = Readonly<{
  authority: string;
  record_ref: string;
  source_owner: string;
  source_ref: string;
}>;

export type ConsoleSourceRevision = Readonly<{
  event_cursor: string;
  event_sequence: number;
  source_revision: string;
}>;

export type ConsoleSourceFreshness = Readonly<{
  observed_at: string;
  state: ConsoleSourceFreshnessState;
  valid_until: string;
}>;

export type ConsoleSourceProjection<TProjection = unknown> = Readonly<{
  artifact_type: "console-source-projection";
  binding: ConsoleSourceBinding;
  freshness: ConsoleSourceFreshness;
  projection: TProjection;
  revision: ConsoleSourceRevision;
  schema_version: typeof CONSOLE_SOURCE_AUTHORITY_SCHEMA_VERSION;
}>;

export type ConsoleSourceReceiptBinding = Readonly<{
  artifact_type: "console-source-receipt-binding";
  binding: ConsoleSourceBinding;
  receipt_ref: string;
  recorded_at: string;
  revision: ConsoleSourceRevision;
  schema_version: typeof CONSOLE_SOURCE_AUTHORITY_SCHEMA_VERSION;
}>;

export type ConsoleSourceAuthorityExpectation = Readonly<{
  authority: string;
  recordRef: string;
  sourceOwner: string;
  sourceRef?: string;
}>;

export type ConsoleSourceProgress = "advanced" | "unchanged";

export type ConsoleSourceAuthorityErrorCode =
  | "source_authority_conflict"
  | "source_authority_invalid"
  | "source_authority_unavailable"
  | "source_projection_replayed"
  | "source_projection_stale"
  | "source_receipt_invalid";

export class ConsoleSourceAuthorityError extends Error {
  readonly code: ConsoleSourceAuthorityErrorCode;

  constructor(code: ConsoleSourceAuthorityErrorCode, message: string) {
    super(message);
    this.name = "ConsoleSourceAuthorityError";
    this.code = code;
  }
}

export function consoleSourceProjectionHeaders(headers?: HeadersInit) {
  const normalized = Object.fromEntries(new Headers(headers).entries());
  delete normalized.accept;
  return {
    ...normalized,
    Accept: CONSOLE_SOURCE_PROJECTION_MEDIA_TYPE,
  };
}

export function acceptCurrentConsoleSourceProjection<TProjection = unknown>(
  value: unknown,
  expectation: ConsoleSourceAuthorityExpectation,
  options: {
    maxFutureClockSkewMs?: number;
    now?: Date;
  } = {},
) {
  const current = requireCurrentConsoleSourceProjection<TProjection>(
    value,
    expectation,
    options,
  );
  const key = sourceProjectionKey(current.binding);
  const previous = acceptedSourceProjections.get(key);
  const progress = previous
    ? compareConsoleSourceProgress(previous, current)
    : "advanced";

  if (progress === "advanced") {
    acceptedSourceProjections.delete(key);
    acceptedSourceProjections.set(key, current);
    trimAcceptedSourceProjections();
  }

  return current.projection;
}

export function parseConsoleSourceProjection<TProjection = unknown>(
  value: unknown,
): ConsoleSourceProjection<TProjection> {
  if (value === null || value === undefined) {
    fail(
      "source_authority_unavailable",
      "The canonical source projection is unavailable.",
    );
  }

  const projection = object(value, "source projection");
  exactKeys(projection, [
    "artifact_type",
    "binding",
    "freshness",
    "projection",
    "revision",
    "schema_version",
  ]);
  if (
    projection.schema_version !== CONSOLE_SOURCE_AUTHORITY_SCHEMA_VERSION ||
    projection.artifact_type !== "console-source-projection"
  ) {
    invalid("The source projection schema identity is invalid.");
  }

  const binding = parseBinding(projection.binding);
  const revision = parseRevision(projection.revision);
  const freshness = parseFreshness(projection.freshness);

  return {
    artifact_type: "console-source-projection",
    binding,
    freshness,
    projection: projection.projection as TProjection,
    revision,
    schema_version: CONSOLE_SOURCE_AUTHORITY_SCHEMA_VERSION,
  };
}

export function requireCurrentConsoleSourceProjection<TProjection = unknown>(
  value: unknown,
  expectation: ConsoleSourceAuthorityExpectation,
  options: {
    maxFutureClockSkewMs?: number;
    now?: Date;
  } = {},
): ConsoleSourceProjection<TProjection> {
  const projection = parseConsoleSourceProjection<TProjection>(value);
  assertExpectedBinding(projection.binding, expectation);

  const now = options.now ?? new Date();
  const maxFutureClockSkewMs = options.maxFutureClockSkewMs ?? 30_000;
  if (!Number.isSafeInteger(maxFutureClockSkewMs) || maxFutureClockSkewMs < 0) {
    invalid("The future clock-skew allowance is invalid.");
  }
  const observedAt = timestamp(
    projection.freshness.observed_at,
    "freshness.observed_at",
  );
  const validUntil = timestamp(
    projection.freshness.valid_until,
    "freshness.valid_until",
  );

  if (projection.freshness.state === "unavailable") {
    fail(
      "source_authority_unavailable",
      "The canonical source owner is unavailable.",
    );
  }
  if (
    projection.freshness.state !== "current" ||
    validUntil.getTime() <= now.getTime()
  ) {
    fail(
      "source_projection_stale",
      "The canonical source projection is not current.",
    );
  }
  if (
    observedAt.getTime() > now.getTime() + maxFutureClockSkewMs ||
    validUntil.getTime() <= observedAt.getTime()
  ) {
    invalid("The source projection freshness interval is invalid.");
  }

  return projection;
}

export function compareConsoleSourceProgress(
  previous: ConsoleSourceProjection,
  current: ConsoleSourceProjection,
): ConsoleSourceProgress {
  if (!sameBinding(previous.binding, current.binding)) {
    fail(
      "source_authority_conflict",
      "The canonical source binding changed during reconciliation.",
    );
  }

  if (current.revision.event_sequence < previous.revision.event_sequence) {
    fail(
      "source_projection_replayed",
      "The canonical source projection moved behind the accepted event sequence.",
    );
  }

  if (current.revision.event_sequence === previous.revision.event_sequence) {
    if (
      current.revision.event_cursor !== previous.revision.event_cursor ||
      current.revision.source_revision !== previous.revision.source_revision ||
      canonicalStringify(current.projection) !==
        canonicalStringify(previous.projection)
    ) {
      fail(
        "source_authority_conflict",
        "The canonical source returned conflicting state for one event sequence.",
      );
    }
    return "unchanged";
  }

  if (
    current.revision.event_cursor === previous.revision.event_cursor ||
    timestamp(current.freshness.observed_at, "freshness.observed_at").getTime() <
      timestamp(previous.freshness.observed_at, "freshness.observed_at").getTime()
  ) {
    fail(
      "source_authority_conflict",
      "The canonical source ordering evidence conflicts with its event sequence.",
    );
  }

  return "advanced";
}

function sourceProjectionKey(binding: ConsoleSourceBinding) {
  return [
    binding.authority,
    binding.source_owner,
    binding.record_ref,
    binding.source_ref,
  ].join("\u0000");
}

function trimAcceptedSourceProjections() {
  while (acceptedSourceProjections.size > maxTrackedSourceProjections) {
    const oldest = acceptedSourceProjections.keys().next().value;
    if (oldest === undefined) return;
    acceptedSourceProjections.delete(oldest);
  }
}

function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function assertConsoleSourceReceiptBinding(
  value: unknown,
  projection: ConsoleSourceProjection,
): ConsoleSourceReceiptBinding {
  const receipt = object(value, "source receipt binding");
  exactKeys(receipt, [
    "artifact_type",
    "binding",
    "receipt_ref",
    "recorded_at",
    "revision",
    "schema_version",
  ]);
  if (
    receipt.schema_version !== CONSOLE_SOURCE_AUTHORITY_SCHEMA_VERSION ||
    receipt.artifact_type !== "console-source-receipt-binding"
  ) {
    invalidReceipt("The source receipt schema identity is invalid.");
  }

  const binding = parseBinding(receipt.binding, invalidReceipt);
  const revision = parseRevision(receipt.revision, invalidReceipt);
  const recordedAt = text(receipt.recorded_at, "recorded_at", invalidReceipt);
  const recordedAtTime = timestamp(recordedAt, "recorded_at", invalidReceipt);
  const receiptRef = text(receipt.receipt_ref, "receipt_ref", invalidReceipt);
  if (
    recordedAtTime.getTime() <
    timestamp(
      projection.freshness.observed_at,
      "freshness.observed_at",
      invalidReceipt,
    ).getTime()
  ) {
    invalidReceipt("The source receipt predates the projection it claims.");
  }

  if (
    !sameBinding(binding, projection.binding) ||
    revision.event_cursor !== projection.revision.event_cursor ||
    revision.event_sequence !== projection.revision.event_sequence ||
    revision.source_revision !== projection.revision.source_revision
  ) {
    invalidReceipt(
      "The source receipt does not bind the exact canonical projection.",
    );
  }

  return {
    artifact_type: "console-source-receipt-binding",
    binding,
    receipt_ref: receiptRef,
    recorded_at: recordedAt,
    revision,
    schema_version: CONSOLE_SOURCE_AUTHORITY_SCHEMA_VERSION,
  };
}

function assertExpectedBinding(
  binding: ConsoleSourceBinding,
  expectation: ConsoleSourceAuthorityExpectation,
) {
  if (
    binding.authority !== expectation.authority ||
    binding.record_ref !== expectation.recordRef ||
    binding.source_owner !== expectation.sourceOwner ||
    (expectation.sourceRef !== undefined &&
      binding.source_ref !== expectation.sourceRef)
  ) {
    fail(
      "source_authority_conflict",
      "The canonical source projection does not match the expected authority binding.",
    );
  }
}

function parseBinding(
  value: unknown,
  onInvalid: (message: string) => never = invalid,
): ConsoleSourceBinding {
  const binding = object(value, "binding", onInvalid);
  exactKeys(
    binding,
    ["authority", "record_ref", "source_owner", "source_ref"],
    onInvalid,
  );
  return {
    authority: text(binding.authority, "binding.authority", onInvalid),
    record_ref: text(binding.record_ref, "binding.record_ref", onInvalid),
    source_owner: text(binding.source_owner, "binding.source_owner", onInvalid),
    source_ref: text(binding.source_ref, "binding.source_ref", onInvalid),
  };
}

function parseRevision(
  value: unknown,
  onInvalid: (message: string) => never = invalid,
): ConsoleSourceRevision {
  const revision = object(value, "revision", onInvalid);
  exactKeys(
    revision,
    ["event_cursor", "event_sequence", "source_revision"],
    onInvalid,
  );
  if (
    !Number.isSafeInteger(revision.event_sequence) ||
    Number(revision.event_sequence) < 0
  ) {
    onInvalid("revision.event_sequence must be a non-negative safe integer.");
  }
  return {
    event_cursor: text(
      revision.event_cursor,
      "revision.event_cursor",
      onInvalid,
    ),
    event_sequence: Number(revision.event_sequence),
    source_revision: text(
      revision.source_revision,
      "revision.source_revision",
      onInvalid,
    ),
  };
}

function parseFreshness(value: unknown): ConsoleSourceFreshness {
  const freshness = object(value, "freshness");
  exactKeys(freshness, ["observed_at", "state", "valid_until"]);
  const state = freshness.state;
  if (
    state !== "current" &&
    state !== "stale" &&
    state !== "unavailable" &&
    state !== "unknown"
  ) {
    invalid("freshness.state is invalid.");
  }
  const observedAt = text(freshness.observed_at, "freshness.observed_at");
  const validUntil = text(freshness.valid_until, "freshness.valid_until");
  timestamp(observedAt, "freshness.observed_at");
  timestamp(validUntil, "freshness.valid_until");
  return {
    observed_at: observedAt,
    state,
    valid_until: validUntil,
  };
}

function sameBinding(left: ConsoleSourceBinding, right: ConsoleSourceBinding) {
  return (
    left.authority === right.authority &&
    left.record_ref === right.record_ref &&
    left.source_owner === right.source_owner &&
    left.source_ref === right.source_ref
  );
}

function object(
  value: unknown,
  label: string,
  onInvalid: (message: string) => never = invalid,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    onInvalid(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  onInvalid: (message: string) => never = invalid,
) {
  if (
    Object.keys(value).sort().join("\u0000") !==
    [...expected].sort().join("\u0000")
  ) {
    onInvalid("The source authority artifact has unexpected fields.");
  }
}

function text(
  value: unknown,
  label: string,
  onInvalid: (message: string) => never = invalid,
) {
  if (typeof value !== "string" || !value.trim() || value.length > 1024) {
    onInvalid(`${label} must be a bounded non-empty string.`);
  }
  return value as string;
}

function timestamp(
  value: unknown,
  label: string,
  onInvalid: (message: string) => never = invalid,
) {
  const parsed = new Date(text(value, label, onInvalid));
  if (Number.isNaN(parsed.getTime())) {
    onInvalid(`${label} must be an ISO timestamp.`);
  }
  return parsed;
}

function invalid(message: string): never {
  return fail("source_authority_invalid", message);
}

function invalidReceipt(message: string): never {
  return fail("source_receipt_invalid", message);
}

function fail(code: ConsoleSourceAuthorityErrorCode, message: string): never {
  throw new ConsoleSourceAuthorityError(code, message);
}
