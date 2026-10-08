import type {
  ModelOperationsLiveApiError,
  ModelOperationsLiveSnapshot,
  ModelProfileRequestDraft,
  ModelProfileRequestProjection,
} from "./model-operations-live-types.ts";

const digestPattern = /^sha256:[0-9a-f]{64}$/;
const requestIdPattern = /^model-profile-request:[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function assertModelOperationsLiveSnapshot(
  value: unknown,
): ModelOperationsLiveSnapshot {
  const root = record(value, "Model Operations live response");
  if (
    !new Set(["disconnected-preview", "live"]).has(text(root.mode)) ||
    !new Set(["current", "offline"]).has(text(root.status)) ||
    typeof root.observedAt !== "string" ||
    !Array.isArray(root.requests)
  ) {
    invalid("Model Operations live response is invalid.");
  }
  root.requests.forEach(assertModelProfileRequestProjection);
  if (root.mode === "live" && root.status === "current") {
    if (!recordOrNull(root.readModel) || !recordOrNull(root.source)) {
      invalid("Model Operations live authority evidence is incomplete.");
    }
  }
  return value as ModelOperationsLiveSnapshot;
}

export function assertModelProfileRequestProjection(
  value: unknown,
): ModelProfileRequestProjection {
  const root = record(value, "model-profile request projection");
  if (
    root.schema_version !== 1 ||
    root.workflow_id !== "model-profile-request" ||
    !requestIdPattern.test(text(root.request_id)) ||
    !Number.isSafeInteger(root.revision) ||
    (root.revision as number) < 1 ||
    root.profile_lifecycle_changed !== false ||
    !Array.isArray(root.history) ||
    root.history.length < 1 ||
    !Array.isArray(root.requirements)
  ) {
    invalid("Model-profile request projection is invalid.");
  }
  const request = record(root.request, "model-profile request");
  if (
    request.schema_version !== 1 ||
    request.request_id !== root.request_id ||
    !recordOrNull(request.profile_intent)
  ) {
    invalid("Model-profile request binding is invalid.");
  }
  const receipt = record(root.latest_receipt, "model-profile receipt");
  if (
    receipt.request_id !== root.request_id ||
    receipt.request_revision !== root.revision ||
    !digestPattern.test(text(receipt.digest))
  ) {
    invalid("Model-profile request receipt is stale or malformed.");
  }
  let expectedSequence = 1;
  for (const entry of root.history) {
    const event = record(entry, "model-profile request event");
    if (event.sequence !== expectedSequence || !recordOrNull(event.receipt_ref)) {
      invalid("Model-profile request history is out of order.");
    }
    expectedSequence += 1;
  }
  return value as ModelProfileRequestProjection;
}

export function assertModelProfileRequestDraft(
  value: unknown,
): ModelProfileRequestDraft {
  const draft = record(value, "model-profile request draft");
  const required = [
    "admittedContextDigest",
    "admittedContextUri",
    "dataClassification",
    "displayName",
    "environment",
    "justification",
    "operationalExpectations",
    "outputSchemaPath",
    "outputSchemaRepo",
    "outputSchemaVersion",
    "ownerRepo",
    "purpose",
    "registeredCallers",
    "requestId",
  ];
  if (
    Object.keys(draft).length !== required.length ||
    required.some((key) => typeof draft[key] !== "string") ||
    !requestIdPattern.test(text(draft.requestId)) ||
    !digestPattern.test(text(draft.admittedContextDigest)) ||
    !new Set(["public", "internal", "confidential", "restricted"]).has(
      text(draft.dataClassification),
    ) ||
    !new Set(["dev-integration", "stage", "prod"]).has(text(draft.environment))
  ) {
    invalid("Model-profile request draft is invalid.");
  }
  for (const key of [
    "displayName",
    "justification",
    "operationalExpectations",
    "outputSchemaPath",
    "outputSchemaRepo",
    "outputSchemaVersion",
    "ownerRepo",
    "purpose",
    "registeredCallers",
  ]) {
    if (!text(draft[key]).trim()) invalid(`Model-profile request ${key} is required.`);
  }
  try {
    new URL(text(draft.admittedContextUri));
  } catch {
    invalid("Model-profile admitted context reference is invalid.");
  }
  parseRegisteredCallers(text(draft.registeredCallers));
  if (expectations(text(draft.operationalExpectations)).length === 0) {
    invalid("At least one operational expectation is required.");
  }
  return value as ModelProfileRequestDraft;
}

export function parseRegisteredCallers(value: string) {
  const callers = value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [caller_id, owner_repo, ...extra] = entry.split("=").map((part) => part.trim());
      if (!caller_id || !owner_repo || extra.length) {
        invalid("Registered callers must use caller-id=owner-repo entries.");
      }
      return { caller_id, owner_repo };
    });
  if (!callers.length || new Set(callers.map(({ caller_id }) => caller_id)).size !== callers.length) {
    invalid("Registered caller identities must be present and unique.");
  }
  return callers;
}

export function operationalExpectations(value: string) {
  return expectations(value);
}

export function isModelOperationsLiveApiError(
  value: unknown,
): value is ModelOperationsLiveApiError {
  return (
    isRecord(value) &&
    value.mode === "live" &&
    value.status === "offline" &&
    typeof value.code === "string" &&
    typeof value.error === "string"
  );
}

function expectations(value: string) {
  return value.split("\n").map((entry) => entry.trim()).filter(Boolean);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) invalid(`${label} is not an object.`);
  return value;
}

function recordOrNull(value: unknown) {
  return value === null ? null : record(value, "record");
}

function text(value: unknown): string {
  if (typeof value !== "string") invalid("Expected text value.");
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): never {
  throw new Error(message);
}
