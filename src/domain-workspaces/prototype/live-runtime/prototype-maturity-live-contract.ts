import type {
  PrototypeMaturityArtifactRef,
  PrototypeMaturityBlocker,
  PrototypeMaturityDecision,
  PrototypeMaturityExpectedState,
  PrototypeMaturityPacket,
  PrototypeMaturityPreparation,
  PrototypeMaturityReceipt,
  PrototypeMaturityResult,
  PrototypeMaturitySubmissionIntent,
  PrototypeMaturityTransition,
} from "./prototype-maturity-live-types.ts";

const commitPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const prototypeIdPattern = /^prototype:[a-z0-9][a-z0-9._-]*$/;
const requestIdPattern =
  /^prototype-maturity-request:[a-z0-9][a-z0-9._-]*:[0-9]+$/;
const statuses = new Set([
  "accepted",
  "blocked",
  "cancelled",
  "cancelling",
  "decision-required",
  "evaluating",
  "preparing",
  "rejected",
  "requires-action",
  "review-required",
  "routed-closeout",
  "succeeded",
]);

export class PrototypeMaturityContractError extends Error {
  readonly code = "prototype_maturity_contract_invalid";
}

export function assertPrototypeMaturityId(value: unknown) {
  if (typeof value !== "string" || !prototypeIdPattern.test(value)) {
    throw invalid("Prototype Maturity identity is invalid.");
  }
  return value;
}

export function assertPrototypeMaturityRequestId(value: unknown) {
  if (typeof value !== "string" || !requestIdPattern.test(value)) {
    throw invalid("Prototype Maturity request identity is invalid.");
  }
  return value;
}

export function assertPrototypeMaturityTransition(
  value: unknown,
): PrototypeMaturityTransition {
  if (value !== "candidate-promotion" && value !== "baseline-promotion") {
    throw invalid("Prototype Maturity transition is invalid.");
  }
  return value;
}

export function assertPrototypeMaturityPreparation(
  value: unknown,
): PrototypeMaturityPreparation {
  const preparation = record(value, "preparation");
  const prototypeId = assertPrototypeMaturityId(preparation.prototype_id);
  const transition = assertPrototypeMaturityTransition(preparation.transition);
  const authority = record(preparation.canonical_authority, "canonical authority");
  const expected = assertExpectedState(preparation.expected_state);
  if (
    preparation.schema_version !== 1 ||
    preparation.workflow_id !== "prototype-maturity" ||
    !commitPattern.test(String(preparation.authority_revision)) ||
    expected.source_revision !== preparation.authority_revision ||
    expected.lifecycle !== sourceLifecycle(transition) ||
    authority.repo !== "workspace-prototype-studio" ||
    authority.branch !== "main" ||
    authority.registry_path !== "prototypes.yaml" ||
    preparation.canonical_mutation !== false ||
    !prototypeId
  ) {
    throw invalid("Prototype Maturity preparation is not canonical authority.");
  }
  return value as PrototypeMaturityPreparation;
}

export function assertPrototypeMaturitySubmissionIntent(
  value: unknown,
): PrototypeMaturitySubmissionIntent {
  const intent = record(value, "submission intent");
  const preparation = assertPrototypeMaturityPreparation(
    intent.reviewed_preparation,
  );
  const prototypeId = assertPrototypeMaturityId(intent.prototype_id);
  const requestId = assertPrototypeMaturityRequestId(intent.request_id);
  const maturityInput = record(intent.input, "maturity input");
  const transition = assertPrototypeMaturityTransition(maturityInput.transition);
  const source = record(intent.record, "source record projection");
  if (
    preparation.prototype_id !== prototypeId ||
    preparation.transition !== transition ||
    !requestId.startsWith(
      `prototype-maturity-request:${prototypeId.slice("prototype:".length)}:`,
    ) ||
    !dateTime(intent.accepted_at) ||
    !uniqueTextArray(source.accepted_scope) ||
    !text(source.landing_receipt_ref) ||
    !text(source.owner_ref) ||
    !text(source.source_ref) ||
    !uniqueTextArray(source.evidence_refs) ||
    !uniqueTextArray(source.excluded_scope)
  ) {
    throw invalid("Prototype Maturity submission intent is incomplete or mismatched.");
  }
  assertInput(transition, maturityInput.input);
  const decision = record(maturityInput.input, "transition input").decision;
  const blocker = source.blocker;
  if (isBlockingDecision(decision)) {
    assertPrototypeMaturityBlocker(blocker);
  } else if (blocker !== null) {
    throw invalid("A non-blocking maturity decision must not carry a blocker.");
  }
  return value as PrototypeMaturitySubmissionIntent;
}

export function samePrototypeMaturityPreparation(
  left: PrototypeMaturityPreparation,
  right: PrototypeMaturityPreparation,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function assertPrototypeMaturityBlocker(
  value: unknown,
): PrototypeMaturityBlocker {
  const blocker = record(value, "blocker");
  if (
    !text(blocker.issue_ref) ||
    !text(blocker.owner_ref) ||
    !text(blocker.required_fix)
  ) {
    throw invalid("A blocked maturity decision requires an issue, owner, and fix.");
  }
  return value as PrototypeMaturityBlocker;
}

export function assertPrototypeMaturityResult(
  value: unknown,
  expectedRequestId?: string,
): PrototypeMaturityResult {
  const result = record(value, "workflow result");
  const requestId = assertPrototypeMaturityRequestId(result.request_id);
  const prototypeId = assertPrototypeMaturityId(result.prototype_id);
  const transition = assertPrototypeMaturityTransition(result.transition);
  const request = assertRequest(result.request);
  const packet = assertPacket(result.packet);
  if (
    result.schema_version !== 1 ||
    result.workflow_id !== "prototype-maturity" ||
    (expectedRequestId && requestId !== expectedRequestId) ||
    request.request_id !== requestId ||
    request.prototype_id !== prototypeId ||
    request.transition !== transition ||
    packet.prototype_id !== prototypeId ||
    packet.transition !== transition ||
    packet.request_ref.id !== requestId ||
    packet.request_ref.digest !== request.request_digest ||
    !text(result.session_ref) ||
    !text(result.execution_ref) ||
    !statuses.has(String(result.status)) ||
    !text(result.next_action) ||
    !Number.isInteger(result.revision) ||
    Number(result.revision) < 1 ||
    !Array.isArray(result.history) ||
    result.history.length < 1 ||
    result.runtime_activation !== false ||
    typeof result.canonical_mutation !== "boolean"
  ) {
    throw invalid("Prototype Maturity result bindings are invalid.");
  }
  assertHistory(result.history, result.revision);

  const status = String(result.status);
  if (["blocked", "routed-closeout", "succeeded"].includes(status)) {
    const receipt = assertReceipt(result.receipt);
    const readback = assertReadback(result.readback);
    assertTerminalBindings({ packet, readback, receipt, request, result, transition });
  } else if (result.receipt !== null || result.readback !== null) {
    throw invalid("A nonterminal maturity result must not project completion evidence.");
  }

  if (status === "review-required") {
    const review = record(result.review, "source review");
    if (
      review.repository !== "workspace-prototype-studio" ||
      review.state !== "open" ||
      review.merged !== false ||
      !commitPattern.test(String(review.head_commit)) ||
      !record(result.preparation, "source preparation")
    ) {
      throw invalid("Review-required maturity result lacks an exact open review.");
    }
  }
  if (status === "succeeded") {
    const review = record(result.review, "merged source review");
    if (
      review.repository !== "workspace-prototype-studio" ||
      review.state !== "closed" ||
      review.merged !== true ||
      review.human_reviewed !== true ||
      !commitPattern.test(String(review.merge_commit)) ||
      result.canonical_mutation !== true
    ) {
      throw invalid("Successful maturity projection requires reviewed merged authority.");
    }
  } else if (result.canonical_mutation !== false) {
    throw invalid("Only successful promotion may claim canonical mutation.");
  }
  return value as PrototypeMaturityResult;
}

function assertInput(transition: PrototypeMaturityTransition, value: unknown) {
  const input = record(value, "transition input");
  if (transition === "candidate-promotion") {
    const audience = record(input.audience, "candidate audience");
    const proof = record(input.proof, "candidate proof");
    const scope = record(input.scope, "candidate scope");
    if (
      !text(input.objective) ||
      !text(audience.kind) ||
      audience.kind === "unassigned" ||
      !text(audience.label) ||
      !text(proof.criterion) ||
      !text(proof.method) ||
      proof.method === "unassigned" ||
      !uniqueTextArray(scope.included) ||
      scope.included.length < 1 ||
      !uniqueTextArray(scope.excluded) ||
      !candidateDecision(input.decision)
    ) {
      throw invalid("Candidate Promotion input is incomplete.");
    }
    return;
  }
  if (
    !text(input.baselineTitle) ||
    !text(input.baselineStatement) ||
    !text(input.evidenceDisposition) ||
    !text(input.issueDisposition) ||
    !baselineDecision(input.decision)
  ) {
    throw invalid("Baseline Promotion input is incomplete.");
  }
}

function assertRequest(value: unknown) {
  const request = record(value, "maturity request");
  const transition = assertPrototypeMaturityTransition(request.transition);
  const expected = assertExpectedState(request.expected_state);
  const inputs = record(request.inputs, "request inputs");
  record(inputs.editable_values, "editable values");
  if (
    request.schema_version !== 1 ||
    request.artifact_type !== "prototype-maturity-request" ||
    !requestIdPattern.test(String(request.request_id)) ||
    !prototypeIdPattern.test(String(request.prototype_id)) ||
    !dateTime(request.requested_at) ||
    !text(request.operator_ref) ||
    request.source_lifecycle !== sourceLifecycle(transition) ||
    request.target_lifecycle !== targetLifecycle(transition) ||
    expected.lifecycle !== request.source_lifecycle ||
    !uniqueTextArray(inputs.source_refs) ||
    inputs.source_refs.length < 1 ||
    !text(request.correlation_id) ||
    !text(request.idempotency_key) ||
    !digest(request.request_digest)
  ) {
    throw invalid("Prototype Maturity request is invalid.");
  }
  return value as PrototypeMaturityResult["request"];
}

function assertPacket(value: unknown): PrototypeMaturityPacket {
  const packet = record(value, "maturity packet");
  const transition = assertPrototypeMaturityTransition(packet.transition);
  const requestRef = assertRef(packet.request_ref);
  if (
    packet.schema_version !== 1 ||
    packet.artifact_type !== "prototype-maturity-packet" ||
    !text(packet.packet_id) ||
    !dateTime(packet.assembled_at) ||
    !prototypeIdPattern.test(String(packet.prototype_id)) ||
    packet.packet_kind !==
      (transition === "candidate-promotion"
        ? "candidate-evidence-packet"
        : "baseline-packet") ||
    !Array.isArray(packet.sections) ||
    packet.sections.length < 3 ||
    !digest(packet.packet_digest)
  ) {
    throw invalid("Prototype Maturity packet is invalid.");
  }
  const sectionIds = new Set<string>();
  for (const item of packet.sections) {
    const section = record(item, "packet section");
    if (
      !text(section.id) ||
      sectionIds.has(String(section.id)) ||
      !new Set(["ready", "missing", "blocked", "not-required", "deferred"]).has(
        String(section.state),
      ) ||
      !uniqueTextArray(section.evidence_refs)
    ) {
      throw invalid("Prototype Maturity packet sections are invalid.");
    }
    sectionIds.add(String(section.id));
  }
  void requestRef;
  return value as PrototypeMaturityPacket;
}

function assertReceipt(value: unknown): PrototypeMaturityReceipt {
  const receipt = record(value, "maturity receipt");
  for (const field of [
    "request_ref",
    "packet_ref",
    "readiness_ref",
    "decision_ref",
    "readback_ref",
  ]) {
    assertRef(receipt[field]);
  }
  const next = record(receipt.next_action, "receipt next action");
  if (
    receipt.schema_version !== 1 ||
    receipt.artifact_type !== "prototype-maturity-receipt" ||
    !text(receipt.receipt_id) ||
    !dateTime(receipt.completed_at) ||
    !prototypeIdPattern.test(String(receipt.prototype_id)) ||
    (!candidateDecision(receipt.decision) &&
      !baselineDecision(receipt.decision)) ||
    !new Set(["succeeded", "blocked", "routed-closeout", "failed"]).has(
      String(receipt.outcome),
    ) ||
    !text(next.code) ||
    !text(next.owner_ref) ||
    !text(receipt.correlation_id) ||
    !text(receipt.idempotency_key) ||
    !digest(receipt.receipt_digest)
  ) {
    throw invalid("Prototype Maturity receipt is invalid.");
  }
  return value as PrototypeMaturityReceipt;
}

function assertReadback(value: unknown) {
  const readback = record(value, "maturity readback");
  assertRef(readback.decision_ref);
  if (
    readback.schema_version !== 1 ||
    readback.artifact_type !== "prototype-maturity-readback" ||
    !text(readback.readback_id) ||
    !dateTime(readback.observed_at) ||
    !prototypeIdPattern.test(String(readback.prototype_id)) ||
    !commitPattern.test(String(readback.source_revision)) ||
    !digest(readback.record_digest) ||
    !text(readback.record_ref) ||
    !digest(readback.readback_digest)
  ) {
    throw invalid("Prototype Maturity readback is invalid.");
  }
  return value as NonNullable<PrototypeMaturityResult["readback"]>;
}

function assertTerminalBindings({
  packet,
  readback,
  receipt,
  request,
  result,
  transition,
}: {
  packet: PrototypeMaturityPacket;
  readback: NonNullable<PrototypeMaturityResult["readback"]>;
  receipt: PrototypeMaturityReceipt;
  request: PrototypeMaturityResult["request"];
  result: Record<string, unknown>;
  transition: PrototypeMaturityTransition;
}) {
  const status = String(result.status);
  const promoted = status === "succeeded";
  const expectedOutcome =
    status === "succeeded" ? "succeeded" : status === "blocked" ? "blocked" : "routed-closeout";
  if (
    receipt.request_ref.id !== request.request_id ||
    receipt.request_ref.digest !== request.request_digest ||
    receipt.packet_ref.id !== packet.packet_id ||
    receipt.packet_ref.digest !== packet.packet_digest ||
    receipt.prototype_id !== request.prototype_id ||
    receipt.transition !== transition ||
    receipt.outcome !== expectedOutcome ||
    readback.prototype_id !== request.prototype_id ||
    readback.transition !== transition ||
    readback.decision !== receipt.decision ||
    readback.authority_state !== (promoted ? "merged-authority" : "unchanged-authority") ||
    readback.observed_lifecycle !==
      (promoted ? targetLifecycle(transition) : sourceLifecycle(transition)) ||
    receipt.resulting_lifecycle !== readback.observed_lifecycle ||
    receipt.readback_ref.id !== readback.readback_id ||
    receipt.readback_ref.digest !== readback.readback_digest
  ) {
    throw invalid("Terminal Prototype Maturity evidence does not bind one outcome.");
  }
}

function assertHistory(value: unknown[], revision: unknown) {
  value.forEach((item, index) => {
    const event = record(item, "history event");
    if (
      event.sequence !== index + 1 ||
      !dateTime(event.at) ||
      !text(event.status) ||
      (event.details !== null && !isRecord(event.details))
    ) {
      throw invalid("Prototype Maturity history is not ordered.");
    }
  });
  if (value.length !== revision) {
    throw invalid("Prototype Maturity revision does not match history.");
  }
}

function assertExpectedState(value: unknown): PrototypeMaturityExpectedState {
  const expected = record(value, "expected source state");
  if (
    !commitPattern.test(String(expected.source_revision)) ||
    !digest(expected.record_digest) ||
    !new Set(["exploring", "candidate"]).has(String(expected.lifecycle))
  ) {
    throw invalid("Prototype Maturity expected source state is invalid.");
  }
  return value as PrototypeMaturityExpectedState;
}

function assertRef(value: unknown): PrototypeMaturityArtifactRef {
  const ref = record(value, "artifact reference");
  if (!text(ref.id) || !digest(ref.digest)) {
    throw invalid("Prototype Maturity artifact reference is invalid.");
  }
  return value as PrototypeMaturityArtifactRef;
}

function sourceLifecycle(transition: PrototypeMaturityTransition) {
  return transition === "candidate-promotion" ? "exploring" : "candidate";
}

function targetLifecycle(transition: PrototypeMaturityTransition) {
  return transition === "candidate-promotion" ? "candidate" : "baseline-approved";
}

function candidateDecision(value: unknown): value is PrototypeMaturityDecision {
  return new Set(["promote-candidate", "block-promotion", "route-closeout"]).has(
    String(value),
  );
}

function baselineDecision(value: unknown): value is PrototypeMaturityDecision {
  return new Set(["approve-baseline", "block-baseline", "route-closeout"]).has(
    String(value),
  );
}

function isBlockingDecision(value: unknown) {
  return value === "block-promotion" || value === "block-baseline";
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw invalid(`Prototype Maturity ${label} is invalid.`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function digest(value: unknown): value is string {
  return typeof value === "string" && digestPattern.test(value);
}

function dateTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function uniqueTextArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(text) &&
    new Set(value).size === value.length
  );
}

function invalid(message: string) {
  return new PrototypeMaturityContractError(message);
}
