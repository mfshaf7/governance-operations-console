import type {
  PrototypeLandingCanonicalIngress,
  PrototypeLandingFailure,
  PrototypeLandingPreparation,
  PrototypeLandingReceipt,
  PrototypeLandingResult,
  PrototypeLandingReview,
  PrototypeLandingSubmissionIntent,
} from "./prototype-landing-live-types.ts";

const commitPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const prototypeIdPattern = /^prototype:[a-z0-9][a-z0-9._-]*$/;
const requestIdPattern = /^prototype-landing-request:[a-z0-9][a-z0-9._-]*:[0-9]+$/;
const ingressClasses = new Set([
  "direct",
  "existing-source",
  "imported",
  "proposal-routed",
]);
const sourcePostures = new Set([
  "create-studio-source",
  "import-to-studio",
  "reference-dedicated-owner-source",
  "reference-shared-owner-source",
  "use-existing-studio-source",
]);
const supportProfiles = new Set([
  "custom",
  "existing-source-review",
  "external-dependency",
  "interactive",
  "local-runtime",
  "simple",
]);
const statuses = new Set([
  "accepted",
  "cancelled",
  "cancelling",
  "evaluating",
  "preparing",
  "rejected",
  "requires-action",
  "review-required",
  "succeeded",
]);
const nextActions = new Set([
  "candidate-promotion",
  "complete",
  "continue",
  "inspect-review-or-cancel",
  "restore-dependency-and-retry",
  "review-and-merge",
  "submit-corrected-request",
]);
const nextActionByStatus = {
  accepted: "continue",
  cancelled: "complete",
  cancelling: "continue",
  evaluating: "continue",
  preparing: "continue",
  rejected: "submit-corrected-request",
  "requires-action": "submit-corrected-request",
  "review-required": "review-and-merge",
  succeeded: "candidate-promotion",
} as const;

export class PrototypeLandingContractError extends Error {
  readonly code = "prototype_landing_contract_invalid";
}

export function assertPrototypeLandingId(value: unknown) {
  if (typeof value !== "string" || !prototypeIdPattern.test(value)) {
    throw invalid("Prototype Landing identity is invalid.");
  }
  return value;
}

export function assertPrototypeLandingRequestId(value: unknown) {
  if (typeof value !== "string" || !requestIdPattern.test(value)) {
    throw invalid("Prototype Landing request identity is invalid.");
  }
  return value;
}

export function assertPrototypeLandingPreparation(
  value: unknown,
): PrototypeLandingPreparation {
  const preparation = record(value, "preparation");
  const expected = record(preparation.expected_state, "expected state");
  const authority = record(
    preparation.canonical_authority,
    "canonical authority",
  );
  if (
    preparation.schema_version !== 1 ||
    preparation.workflow_id !== "prototype-landing" ||
    !prototypeIdPattern.test(String(preparation.prototype_id)) ||
    !commitPattern.test(String(preparation.authority_revision)) ||
    !digestPattern.test(String(expected.registry_digest)) ||
    expected.record_present !== false ||
    expected.record_digest !== null ||
    !nullableText(expected.source_revision) ||
    expected.source_revision !== preparation.authority_revision ||
    authority.repo !== "workspace-prototype-studio" ||
    authority.branch !== "main" ||
    authority.registry_path !== "prototypes.yaml" ||
    preparation.canonical_mutation !== false
  ) {
    throw invalid("Prototype Landing preparation is not canonical authority.");
  }
  return value as PrototypeLandingPreparation;
}

export function assertPrototypeLandingSubmissionIntent(
  value: unknown,
): PrototypeLandingSubmissionIntent {
  const intent = record(value, "submission intent");
  const source = record(intent.source, "source intent");
  const suggestions = record(intent.suggestions, "source suggestions");
  const draft = record(intent.draft, "accepted Landing draft");
  const reviewed = assertPrototypeLandingPreparation(
    intent.reviewed_preparation,
  );
  const prototypeId = assertPrototypeLandingId(intent.prototype_id);
  const requestId = assertPrototypeLandingRequestId(intent.request_id);
  if (
    reviewed.prototype_id !== prototypeId ||
    !requestId.startsWith(
      `prototype-landing-request:${prototypeId.slice("prototype:".length)}:`,
    ) ||
    !dateTime(intent.accepted_at) ||
    !ingressClasses.has(String(intent.ingress_class)) ||
    !text(source.authority) ||
    !text(source.ref) ||
    !sourcePostures.has(String(source.posture)) ||
    !nullableText(source.revision) ||
    !nullableDigest(source.origin_digest) ||
    !nullableDigest(source.imported_content_digest) ||
    !nullableText(suggestions.name) ||
    !nullableText(suggestions.objective) ||
    !(
      suggestions.support_profile === null ||
      supportProfiles.has(String(suggestions.support_profile))
    ) ||
    !text(draft.name) ||
    !text(draft.summary) ||
    !text(draft.owner) ||
    !Array.isArray(draft.supportRows) ||
    draft.supportRows.length !== 10
  ) {
    throw invalid("Prototype Landing submission intent is incomplete or mismatched.");
  }
  const supportDimensions = new Set([
    "data",
    "evidence",
    "integration",
    "interface",
    "recovery",
    "runtime",
    "source",
    "studio-home",
    "tooling",
    "visibility",
  ]);
  const supportStates = new Set([
    "blocked",
    "needed",
    "not-needed",
    "ready",
    "unknown",
  ]);
  const seenDimensions = new Set<string>();
  for (const value of draft.supportRows) {
    const row = record(value, "support row");
    if (
      !supportDimensions.has(String(row.id)) ||
      seenDimensions.has(String(row.id)) ||
      !supportStates.has(String(row.state)) ||
      !text(row.label) ||
      !text(row.summary) ||
      !text(row.detail)
    ) {
      throw invalid("Prototype Landing support rows are incomplete or duplicated.");
    }
    seenDimensions.add(String(row.id));
  }
  if (
    source.posture === "import-to-studio" &&
    (!source.origin_digest ||
      !source.imported_content_digest ||
      !String(source.ref).startsWith("import://staged/"))
  ) {
    throw invalid("Imported Prototype Landing requires both source digests.");
  }
  if (
    (source.posture === "reference-dedicated-owner-source" ||
      source.posture === "reference-shared-owner-source" ||
      source.posture === "use-existing-studio-source") &&
    !source.revision
  ) {
    throw invalid("Existing Prototype Landing source requires an exact revision.");
  }
  if (
    source.posture === "use-existing-studio-source" &&
    !String(source.ref).startsWith("repo://workspace-prototype-studio/")
  ) {
    throw invalid("Existing Studio source must use the Prototype Studio authority ref.");
  }
  return value as PrototypeLandingSubmissionIntent;
}

export function samePrototypeLandingPreparation(
  left: PrototypeLandingPreparation,
  right: PrototypeLandingPreparation,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function assertPrototypeLandingResult(
  value: unknown,
  expectedRequestId?: string,
): PrototypeLandingResult {
  const result = record(value, "workflow result");
  if (
    result.schema_version !== 1 ||
    result.workflow_id !== "prototype-landing" ||
    !requestIdPattern.test(String(result.request_id)) ||
    (expectedRequestId && result.request_id !== expectedRequestId) ||
    !prototypeIdPattern.test(String(result.prototype_id)) ||
    !text(result.session_ref) ||
    !text(result.execution_ref) ||
    !statuses.has(String(result.status)) ||
    !nextActions.has(String(result.next_action)) ||
    !Number.isInteger(result.revision) ||
    Number(result.revision) < 1 ||
    !isRecord(result.entry_packet) ||
    !isRecord(result.request) ||
    !isRecord(result.plan) ||
    !nullableRecord(result.readiness) ||
    !nullableRecord(result.apply) ||
    !nullableRecord(result.preparation) ||
    typeof result.canonical_mutation !== "boolean" ||
    result.runtime_activation !== false ||
    !Array.isArray(result.history) ||
    result.history.length < 1
  ) {
    throw invalid("Prototype Landing workflow projection is invalid.");
  }
  const requestPrototype = record(result.request.prototype, "request prototype");
  if (
    result.request.request_id !== result.request_id ||
    requestPrototype.id !== result.prototype_id ||
    result.plan.prototype_id !== result.prototype_id
  ) {
    throw invalid("Prototype Landing result does not match its accepted request.");
  }
  result.history.forEach((item, index) => {
    const event = record(item, "history event");
    if (
      event.sequence !== index + 1 ||
      !dateTime(event.at) ||
      !text(event.status) ||
      (event.details !== null && !isRecord(event.details))
    ) {
      throw invalid("Prototype Landing history is incomplete or unordered.");
    }
  });
  const review = result.review === null ? null : assertReview(result.review);
  const receipt = result.receipt === null ? null : assertReceipt(result.receipt);
  const readback =
    result.readback === null ? null : assertReadback(result.readback);
  const failure =
    result.failure === null ? null : assertFailure(result.failure);

  const expectedNextAction = failure
    ? failure.retryable
      ? "restore-dependency-and-retry"
      : "inspect-review-or-cancel"
    : nextActionByStatus[result.status as keyof typeof nextActionByStatus];
  if (result.next_action !== expectedNextAction) {
    throw invalid("Prototype Landing status and next action do not agree.");
  }

  if (result.status === "succeeded") {
    if (
      result.canonical_mutation !== true ||
      !review?.merged ||
      !review.human_reviewed ||
      !receipt ||
      receipt.phase !== "merged-authority" ||
      receipt.outcome !== "succeeded" ||
      receipt.next_action.code !== "candidate-promotion" ||
      !readback ||
      readback.authority_state !== "merged-authority" ||
      readback.prototype_id !== result.prototype_id ||
      receipt.prototype_id !== result.prototype_id ||
      review.state !== "closed" ||
      review.merge_commit === null ||
      receipt.source_result.branch !== "main" ||
      receipt.source_result.revision !== review.merge_commit ||
      readback.source_branch !== "main" ||
      readback.source_revision !== review.merge_commit ||
      readback.registry_digest !== receipt.source_result.registry_digest ||
      readback.record_digest !== receipt.source_result.record_digest
    ) {
      throw invalid("Prototype Landing success lacks merged authority evidence.");
    }
  } else if (result.canonical_mutation) {
    throw invalid("Non-successful Prototype Landing cannot claim source mutation.");
  }
  if (result.status === "review-required" && !review) {
    throw invalid("Prototype Landing review state lacks its review reference.");
  }
  if (
    result.status === "review-required" &&
    (!result.readiness ||
      !result.apply ||
      !result.preparation ||
      !receipt ||
      !readback ||
      review?.state !== "open" ||
      review.merged ||
      receipt.phase === "merged-authority" ||
      readback.authority_state !== "review-branch" ||
      receipt.source_result.branch !== review.branch ||
      readback.source_branch !== review.branch ||
      receipt.source_result.revision !== review.head_commit ||
      readback.source_revision !== review.head_commit ||
      readback.registry_digest !== receipt.source_result.registry_digest ||
      readback.record_digest !== receipt.source_result.record_digest)
  ) {
    throw invalid("Prototype Landing review state lacks prepared source evidence.");
  }
  if (failure && result.status === "succeeded") {
    throw invalid("Successful Prototype Landing cannot carry a failure.");
  }
  return value as PrototypeLandingResult;
}

function assertReview(value: unknown): PrototypeLandingReview {
  const review = record(value, "review");
  if (
    review.repository !== "workspace-prototype-studio" ||
    review.base_branch !== "main" ||
    !Number.isInteger(review.number) ||
    Number(review.number) < 1 ||
    !text(review.url) ||
    !/^https:\/\//.test(String(review.url)) ||
    !text(review.branch) ||
    !commitPattern.test(String(review.base_commit)) ||
    !commitPattern.test(String(review.head_commit)) ||
    typeof review.merged !== "boolean" ||
    typeof review.human_reviewed !== "boolean" ||
    !new Set(["closed", "open"]).has(String(review.state)) ||
    !(review.merge_commit === null || commitPattern.test(String(review.merge_commit)))
  ) {
    throw invalid("Prototype Landing review projection is invalid.");
  }
  return value as PrototypeLandingReview;
}

function assertReceipt(value: unknown): PrototypeLandingReceipt {
  const receipt = record(value, "receipt");
  const nextAction = record(receipt.next_action, "receipt next action");
  const source = record(receipt.source_result, "receipt source result");
  if (
    receipt.schema_version !== 1 ||
    receipt.artifact_type !== "prototype-landing-receipt" ||
    !text(receipt.receipt_id) ||
    !dateTime(receipt.completed_at) ||
    !prototypeIdPattern.test(String(receipt.prototype_id)) ||
    !new Set(["source-preparation", "source-replay", "merged-authority"]).has(
      String(receipt.phase),
    ) ||
    !new Set(["prepared", "replayed", "succeeded"]).has(
      String(receipt.outcome),
    ) ||
    !new Set(["review-source", "candidate-promotion"]).has(
      String(nextAction.code),
    ) ||
    !text(nextAction.owner_ref) ||
    source.repo !== "workspace-prototype-studio" ||
    !text(source.branch) ||
    !text(source.revision) ||
    !digestPattern.test(String(source.registry_digest)) ||
    !digestPattern.test(String(source.record_digest)) ||
    !digestPattern.test(String(receipt.receipt_digest))
  ) {
    throw invalid("Prototype Landing receipt projection is invalid.");
  }
  return value as PrototypeLandingReceipt;
}

function assertReadback(value: unknown) {
  const readback = record(value, "readback");
  const sourceRecord = record(readback.record, "readback record");
  const setup = record(sourceRecord.setup, "readback setup");
  const source = record(sourceRecord.source, "readback source");
  if (
    readback.schema_version !== 1 ||
    readback.artifact_type !== "prototype-landing-readback" ||
    !text(readback.readback_id) ||
    !prototypeIdPattern.test(String(readback.prototype_id)) ||
    !new Set(["review-branch", "merged-authority"]).has(
      String(readback.authority_state),
    ) ||
    !text(readback.source_branch) ||
    !text(readback.source_revision) ||
    !digestPattern.test(String(readback.registry_digest)) ||
    !digestPattern.test(String(readback.record_digest)) ||
    !dateTime(readback.observed_at) ||
    !digestPattern.test(String(readback.readback_digest)) ||
    sourceRecord.id !== readback.prototype_id ||
    sourceRecord.lifecycle !== "exploring" ||
    sourceRecord.project_phase !== "incubating" ||
    sourceRecord.next_action !== "candidate-promotion" ||
    !text(sourceRecord.name) ||
    !text(sourceRecord.objective) ||
    !ingressClasses.has(String(sourceRecord.ingress_class)) ||
    !supportProfiles.has(String(setup.support_profile)) ||
    !Array.isArray(setup.support_rows) ||
    setup.support_rows.length !== 10 ||
    !text(setup.scaffold_profile) ||
    !text(setup.preview_mode) ||
    !text(setup.data_mode) ||
    !text(setup.mutation_boundary) ||
    !text(setup.visibility) ||
    !sourcePostures.has(String(source.posture)) ||
    !new Set([
      "dedicated-owner-repo",
      "incubation-repo",
      "shared-owner-repo",
    ]).has(String(source.custody)) ||
    !text(source.ref) ||
    !text(source.revision)
  ) {
    throw invalid("Prototype Landing readback projection is invalid.");
  }
  return value as PrototypeLandingResult["readback"] & object;
}

function assertFailure(value: unknown): PrototypeLandingFailure {
  const failure = record(value, "failure");
  if (
    !text(failure.code) ||
    !text(failure.message) ||
    typeof failure.retryable !== "boolean"
  ) {
    throw invalid("Prototype Landing failure projection is invalid.");
  }
  return value as PrototypeLandingFailure;
}

function invalid(message: string) {
  return new PrototypeLandingContractError(message);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw invalid(`Prototype Landing ${label} is invalid.`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function nullableText(value: unknown) {
  return value === null || text(value);
}

function nullableDigest(value: unknown) {
  return value === null || (typeof value === "string" && digestPattern.test(value));
}

function nullableRecord(value: unknown) {
  return value === null || isRecord(value);
}

function dateTime(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function prototypeLandingIngress(value: string) {
  const mapped = value === "local-entry" ? "direct" : value;
  if (!ingressClasses.has(mapped)) {
    throw invalid("Prototype Landing ingress is unsupported.");
  }
  return mapped as PrototypeLandingCanonicalIngress;
}
