import type {
  PrototypeClosureAction,
  PrototypeClosureHistoryEvent,
  PrototypeClosureIntent,
  PrototypeClosurePreparation,
  PrototypeClosureResult,
} from "./prototype-closure-live-types.ts";

const actions = [
  "apply-delivery",
  "graduate-source",
  "retire-incubation",
  "reopen-incubation",
] as const;
const lifecycles = [
  "exploring",
  "candidate",
  "baseline-approved",
  "graduating",
  "retired",
  "graduated",
] as const;
const statuses = [
  "accepted",
  "evaluating",
  "decision-required",
  "reconciling",
  "preparing",
  "review-required",
  "pending-readback",
  "pending-runtime-disposition",
  "cancelling",
  "succeeded",
  "denied",
  "failed",
] as const;
const fieldNames = [
  "accepted_baseline_receipt_ref",
  "target_kind",
  "target_delivery_ref",
  "accepted_delivery_target_receipt_ref",
  "durable_owner_ref",
  "durable_repo_ref",
  "durable_owner_acceptance_ref",
  "transfer_strategy",
  "already_owned_source_proof_ref",
  "retirement_reason",
  "retention_plan_ref",
  "runtime_disposition_plan_ref",
  "prior_retirement_receipt_ref",
] as const;
const requiredFields: Record<PrototypeClosureAction, readonly string[]> = {
  "apply-delivery": [
    "accepted_baseline_receipt_ref",
    "target_kind",
    "target_delivery_ref",
    "accepted_delivery_target_receipt_ref",
  ],
  "graduate-source": [
    "accepted_delivery_target_receipt_ref",
    "durable_owner_ref",
    "durable_repo_ref",
    "durable_owner_acceptance_ref",
    "transfer_strategy",
  ],
  "retire-incubation": [
    "retirement_reason",
    "retention_plan_ref",
    "runtime_disposition_plan_ref",
  ],
  "reopen-incubation": ["prior_retirement_receipt_ref"],
};
const allowedFields: Record<PrototypeClosureAction, readonly string[]> = {
  "apply-delivery": [
    "accepted_baseline_receipt_ref",
    "target_kind",
    "target_delivery_ref",
    "accepted_delivery_target_receipt_ref",
  ],
  "graduate-source": ["accepted_delivery_target_receipt_ref", "durable_owner_ref",
    "durable_repo_ref", "durable_owner_acceptance_ref", "transfer_strategy",
    "already_owned_source_proof_ref"],
  "retire-incubation": ["retirement_reason", "retention_plan_ref",
    "runtime_disposition_plan_ref"],
  "reopen-incubation": ["prior_retirement_receipt_ref"],
};
const safeRef = /^[a-z][a-z0-9+.-]*:\/\/[A-Za-z0-9][A-Za-z0-9._~:/%+=-]*$/;

export class PrototypeClosureContractError extends Error {
  readonly code = "prototype_closure_contract_invalid";
}

function fail(message: string): never {
  throw new PrototypeClosureContractError(message);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("Closure returned a non-object value.");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, max = 2048): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    fail(`${label} is missing or invalid.`);
  }
  return value as string;
}

function oneOf<T extends string | null>(
  value: unknown,
  values: readonly T[],
  label: string,
): T {
  if (!values.includes(value as T)) fail(`${label} is not admitted.`);
  return value as T;
}

function optionalText(value: unknown, label: string) {
  return value === null ? null : text(value, label);
}

export function assertPrototypeClosureId(value: unknown): string {
  const id = text(value, "Prototype identity", 128);
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(id)) fail("Prototype identity is invalid.");
  return id;
}

export function assertPrototypeClosureRequestId(value: unknown): string {
  const id = text(value, "Closure request identity", 1024);
  if (/[\u0000-\u001f\u007f]/.test(id)) {
    fail("Closure request identity is invalid.");
  }
  try { encodeURIComponent(id); } catch { fail("Closure request identity is invalid."); }
  return id;
}

export function assertPrototypeClosurePreparation(
  value: unknown,
): PrototypeClosurePreparation {
  const source = record(value);
  const state = record(source.expected_state);
  if (
    source.schema_version !== 1 ||
    source.workflow_id !== "prototype-closure" ||
    source.canonical_mutation !== false
  ) fail("Closure preparation is not a read-only source projection.");
  const prototypeId = assertPrototypeClosureId(source.prototype_id);
  const revision = text(source.authority_revision, "Studio revision", 40);
  if (!/^[0-9a-f]{40}$/.test(revision) || state.source_revision !== revision) {
    fail("Closure preparation has no exact Studio revision.");
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(String(state.record_digest))) {
    fail("Closure preparation has no valid record digest.");
  }
  const lifecycle = oneOf(state.lifecycle, lifecycles, "Studio lifecycle");
  const sourceCustody = oneOf(
    state.source_custody,
    ["incubation-repo", "dedicated-owner-repo", "shared-owner-repo", null],
    "Source custody",
  );
  const designBaselineRef = optionalText(state.design_baseline_ref, "Design baseline reference");
  const deliveryPacketRef = optionalText(state.delivery_packet_ref, "Delivery packet reference");
  const acceptedDeliveryReceiptRef = optionalText(state.accepted_delivery_target_receipt_ref, "Accepted Delivery receipt");
  const retirementRef = optionalText(state.retirement_ref, "Retirement reference");
  const projectPhase = optionalText(state.project_phase, "Project phase");
  const authority = record(source.canonical_authority);
  if (authority.repo !== "workspace-prototype-studio" || authority.branch !== "main" || authority.registry_path !== "prototypes.yaml") {
    fail("Closure preparation names an unexpected source authority.");
  }
  if (!Array.isArray(source.history) || source.history.length > 256) {
    fail("Closure history exceeds the bounded source contract.");
  }
  const history: PrototypeClosureHistoryEvent[] = [];
  for (const entry of source.history) {
    const event = record(entry);
    const eventId = text(event.event_id, "Closure event identity");
    const eventType = oneOf(event.event_type, [
      "delivery-accepted",
      "source-graduated",
      "incubation-retired",
      "incubation-reopened",
    ], "Closure event type");
    const requestRef = assertPrototypeClosureRequestId(event.request_ref);
    const expectedSourceRevision = text(event.expected_source_revision, "Expected Studio revision", 40);
    const previousLifecycle = oneOf(event.previous_lifecycle, lifecycles, "Prior lifecycle");
    const observedLifecycle = oneOf(event.observed_lifecycle, lifecycles, "Observed lifecycle");
    const previousSourceCustody = text(event.previous_source_custody, "Prior custody");
    const observedSourceCustody = text(event.observed_source_custody, "Observed custody");
    const recordedAt = text(event.recorded_at, "Closure event time");
    if (Number.isNaN(Date.parse(recordedAt))) {
      fail("Closure event time is invalid.");
    }
    history.push({ event_id: eventId, event_type: eventType, request_ref: requestRef,
      expected_source_revision: expectedSourceRevision, previous_lifecycle: previousLifecycle,
      observed_lifecycle: observedLifecycle, previous_source_custody: previousSourceCustody,
      observed_source_custody: observedSourceCustody, recorded_at: recordedAt });
  }
  return {
    schema_version: 1,
    workflow_id: "prototype-closure",
    prototype_id: prototypeId,
    authority_revision: revision,
    expected_state: { source_revision: revision, record_digest: state.record_digest as string,
      lifecycle, source_custody: sourceCustody, design_baseline_ref: designBaselineRef,
      delivery_packet_ref: deliveryPacketRef, accepted_delivery_target_receipt_ref: acceptedDeliveryReceiptRef,
      retirement_ref: retirementRef, project_phase: projectPhase },
    history,
    canonical_authority: { repo: "workspace-prototype-studio", branch: "main", registry_path: "prototypes.yaml" },
    canonical_mutation: false,
  };
}

export function assertPrototypeClosureIntent(value: unknown): PrototypeClosureIntent {
  const input = record(value);
  if (Object.keys(input).sort().join(",") !== "action,fields,preparation,request_id") {
    fail("Closure submission contains unexpected fields.");
  }
  const action = oneOf(input.action, actions, "Closure action");
  const fields = record(input.fields);
  if (Object.keys(fields).some((key) => !fieldNames.includes(key as typeof fieldNames[number]) ||
      !allowedFields[action].includes(key))) {
    fail("Closure submission contains an unknown field.");
  }
  for (const [key, value] of Object.entries(fields)) {
    const field = text(value, key, key === "retirement_reason" ? 1024 : 512);
    if (key.endsWith("_ref") && key !== "durable_owner_ref" && !safeRef.test(field)) {
      fail(`${key} must be an owner-resolvable reference.`);
    }
  }
  if (requiredFields[action].some((key) => !Object.hasOwn(fields, key))) {
    fail("Closure submission lacks action evidence.");
  }
  if (action === "apply-delivery") {
    oneOf(fields.target_kind, ["new-delivery-epic"], "Delivery target kind");
  }
  if (action === "graduate-source") {
    oneOf(fields.transfer_strategy, ["transfer", "already-owned"], "Source transfer strategy");
    if (fields.transfer_strategy === "already-owned" && !fields.already_owned_source_proof_ref) {
      fail("Already-owned source proof is required.");
    }
    if (fields.transfer_strategy === "transfer" && fields.already_owned_source_proof_ref) {
      fail("Source transfer must not carry already-owned proof.");
    }
  }
  const preparation = assertPrototypeClosurePreparation(input.preparation);
  const allowedLifecycle: Record<PrototypeClosureAction, readonly string[]> = {
    "apply-delivery": ["baseline-approved"],
    "graduate-source": ["graduating"],
    "retire-incubation": ["exploring", "candidate", "baseline-approved", "graduating"],
    "reopen-incubation": ["retired"],
  };
  if (!allowedLifecycle[action].includes(preparation.expected_state.lifecycle)) {
    fail("Closure action is unavailable for the current Studio lifecycle.");
  }
  return {
    action,
    fields: fields as PrototypeClosureIntent["fields"],
    preparation,
    request_id: assertPrototypeClosureRequestId(input.request_id),
  };
}

export function assertPrototypeClosureResult(
  value: unknown,
  requestId: string,
): PrototypeClosureResult {
  const result = record(value);
  if (
    result.schema_version !== 1 ||
    result.workflow_id !== "prototype-closure" ||
    result.request_id !== requestId ||
    result.runtime_activation !== true ||
    typeof result.canonical_mutation !== "boolean"
  ) fail("Closure result lost its request or authority binding.");
  assertPrototypeClosureId(result.prototype_id);
  oneOf(result.action, actions, "Closure action");
  const status = oneOf(result.status, statuses, "Closure status");
  const nextAction = text(result.next_action, "Closure next action");
  const revision = result.revision;
  if (!Number.isSafeInteger(revision) || (revision as number) < 1) fail("Closure revision is invalid.");
  const request = record(result.request);
  if (request.request_id !== requestId || request.prototype_id !== result.prototype_id || request.action !== result.action) {
    fail("Closure result is bound to a different request.");
  }
  const operatorId = text(request.operator_id, "Closure operator");
  const expectedLifecycle = oneOf(request.expected_lifecycle, lifecycles, "Expected lifecycle");
  const expectedSourceRevision = text(request.expected_source_revision, "Expected Studio revision", 40);
  if (!/^[0-9a-f]{40}$/.test(expectedSourceRevision)) fail("Expected Studio revision is invalid.");
  if (!Array.isArray(result.history) || result.history.length !== revision) fail("Closure transition history is invalid.");
  const history = result.history.map((entry, index) => {
    const item = record(entry);
    if (item.sequence !== index + 1) fail("Closure transition sequence is invalid.");
    const at = text(item.at, "Closure transition time");
    if (Number.isNaN(Date.parse(at))) fail("Closure transition time is invalid.");
    return { sequence: index + 1, at, status: oneOf(item.status, statuses, "Closure transition status"), details: item.details };
  });
  if (result.canonical_mutation !== (status === "succeeded")) {
    fail("Closure mutation claim does not match its terminal status.");
  }
  const sourceSnapshot = result.source_snapshot === null ? null : record(result.source_snapshot);
  if (sourceSnapshot) {
    const sourceRevision = text(sourceSnapshot.source_revision, "Closure source revision", 40);
    const recordDigest = text(sourceSnapshot.record_digest, "Closure record digest", 71);
    if (!/^[0-9a-f]{40}$/.test(sourceRevision) || !/^sha256:[0-9a-f]{64}$/.test(recordDigest) ||
        sourceRevision !== expectedSourceRevision ||
        sourceSnapshot.lifecycle !== expectedLifecycle) fail("Closure source snapshot is unbound.");
    text(sourceSnapshot.source_custody, "Closure source custody");
  }
  const readback = result.readback === null ? null : record(result.readback);
  if (readback) {
    const mergedRevision = text(readback.merged_source_revision, "Merged Studio revision", 40);
    if (!/^[0-9a-f]{40}$/.test(mergedRevision)) fail("Merged Studio revision is invalid.");
    oneOf(readback.observed_lifecycle, lifecycles, "Observed Studio lifecycle");
    text(readback.observed_source_custody, "Observed source custody");
  }
  const disposition = result.runtime_disposition === null ? null : record(result.runtime_disposition);
  if (disposition) {
    if (disposition.state !== "accepted") fail("Runtime disposition is not accepted.");
    oneOf(disposition.disposition, ["revoked", "absent"], "Runtime disposition");
    text(disposition.ref, "Runtime disposition reference");
  }
  const resolved = result.resolved_authority === null ? null : record(result.resolved_authority);
  const verification = resolved ? record(resolved.verification) : null;
  if (verification) {
    if (verification.state !== "accepted" ||
        verification.source_revision !== expectedSourceRevision ||
        !Array.isArray(verification.evidence_refs) ||
        verification.evidence_refs.length === 0 || verification.evidence_refs.length > 16) {
      fail("Closure target authority is not bound to the current Studio source.");
    }
    for (const ref of verification.evidence_refs) {
      if (!safeRef.test(text(ref, "Closure authority evidence", 512))) fail("Closure authority evidence is invalid.");
    }
    for (const key of ["target_delivery_ref", "durable_repo_ref",
      "runtime_disposition_proof_ref", "prior_retirement_event_ref"]) {
      if (resolved?.[key] !== undefined && resolved?.[key] !== null &&
          !safeRef.test(text(resolved[key], key, 512))) fail("Closure target reference is invalid.");
    }
  }
  const review = result.review === null ? null : record(result.review);
  let humanReviewed = false;
  if (review) {
    const headCommit = text(review.head_commit, "Closure review head", 40);
    if (!/^[0-9a-f]{40}$/.test(headCommit)) fail("Closure review head is invalid.");
    const delegatedApproval = review.delegated_approval === null
      ? null
      : record(review.delegated_approval);
    if (delegatedApproval) {
      const approvalHead = text(
        delegatedApproval.head_commit,
        "Closure approval head",
        40,
      );
      if (
        approvalHead !== headCommit ||
        !/^[0-9a-f]{40}$/.test(approvalHead) ||
        delegatedApproval.execution !== "agent-gary-delegated"
      ) fail("Closure delegated approval is invalid.");
      text(delegatedApproval.review_ref, "Closure approval reference");
      text(delegatedApproval.reviewer_login, "Closure reviewer");
      humanReviewed = true;
    }
    if (!Number.isSafeInteger(review.number) || (review.number as number) < 1 ||
        typeof review.merged !== "boolean") {
      fail("Closure source review is invalid.");
    }
    text(review.url, "Closure source review URL");
    text(review.state, "Closure source review state");
    if (review.merge_commit !== null) {
      const mergeCommit = text(review.merge_commit, "Closure merge commit", 40);
      if (!/^[0-9a-f]{40}$/.test(mergeCommit)) fail("Closure merge commit is invalid.");
    }
  }
  let receipt: PrototypeClosureResult["receipt"] = null;
  if (result.receipt !== null) {
    const receipt = record(result.receipt);
    text(receipt.receipt_id, "Closure receipt identity");
    oneOf(receipt.outcome, ["completed", "denied", "failed"], "Closure receipt outcome");
    oneOf(receipt.observed_lifecycle, lifecycles, "Closure observed lifecycle");
    text(receipt.observed_source_custody, "Closure observed custody");
    text(receipt.recorded_at, "Closure receipt time");
  }
  const rawReceipt = result.receipt === null ? null : record(result.receipt);
  if (rawReceipt) {
    receipt = {
      receipt_id: rawReceipt.receipt_id as string,
      outcome: rawReceipt.outcome as "completed" | "denied" | "failed",
      observed_lifecycle: rawReceipt.observed_lifecycle as PrototypeClosureResult["request"]["expected_lifecycle"],
      observed_source_custody: rawReceipt.observed_source_custody as string,
      recorded_at: rawReceipt.recorded_at as string,
    };
  }
  const terminal = ["succeeded", "denied", "failed"].includes(status);
  if (terminal !== Boolean(receipt) ||
      (status === "denied" && receipt?.outcome !== "denied") ||
      (status === "failed" && receipt?.outcome !== "failed")) {
    fail("Closure terminal state and receipt outcome disagree.");
  }
  if (status === "succeeded" && (!receipt || receipt.outcome !== "completed" ||
      !sourceSnapshot || !readback || !review?.merged || !humanReviewed ||
      readback.merged_source_revision !== review.merge_commit ||
      !resolved ||
      (result.action === "graduate-source" && !disposition))) {
    fail("Closure success lacks reviewed source readback, runtime disposition, or receipt.");
  }
  if (history.at(-1)?.status !== status) fail("Closure transition history lost the current state.");
  if (status === "succeeded" && receipt && readback &&
      (receipt.observed_lifecycle !== readback.observed_lifecycle ||
       receipt.observed_source_custody !== readback.observed_source_custody)) {
    fail("Closure receipt differs from merged Studio readback.");
  }
  const failure = result.failure === null ? null : record(result.failure);
  if (failure) {
    text(failure.code, "Closure failure code");
    text(failure.message, "Closure failure message");
  }
  return {
    schema_version: 1, workflow_id: "prototype-closure", request_id: requestId,
    prototype_id: result.prototype_id as string, action: result.action as PrototypeClosureAction,
    status, next_action: nextAction, revision: revision as number,
    request: { request_id: requestId, prototype_id: result.prototype_id as string,
      action: result.action as PrototypeClosureAction, operator_id: operatorId,
      expected_lifecycle: expectedLifecycle, expected_source_revision: expectedSourceRevision },
    history, source_snapshot: sourceSnapshot ? {
      source_revision: sourceSnapshot.source_revision as string,
      record_digest: sourceSnapshot.record_digest as string,
      lifecycle: sourceSnapshot.lifecycle as PrototypeClosureResult["request"]["expected_lifecycle"],
      source_custody: sourceSnapshot.source_custody as string,
    } : null, readiness: result.readiness, decision: result.decision,
    resolved_authority: resolved && verification ? {
      verification: { state: "accepted", source_revision: expectedSourceRevision,
        evidence_refs: verification.evidence_refs as string[] },
      target_delivery_ref: (resolved.target_delivery_ref as string | null | undefined) ?? null,
      durable_repo_ref: (resolved.durable_repo_ref as string | null | undefined) ?? null,
      runtime_disposition_proof_ref: (resolved.runtime_disposition_proof_ref as string | null | undefined) ?? null,
      prior_retirement_event_ref: (resolved.prior_retirement_event_ref as string | null | undefined) ?? null,
    } : null, preparation: result.preparation,
    review: review ? { number: review.number as number, url: review.url as string,
      state: review.state as string, merged: review.merged as boolean,
      merge_commit: review.merge_commit as string | null,
      human_reviewed: humanReviewed } : null,
    readback: readback ? {
      merged_source_revision: readback.merged_source_revision as string,
      observed_lifecycle: readback.observed_lifecycle as PrototypeClosureResult["request"]["expected_lifecycle"],
      observed_source_custody: readback.observed_source_custody as string,
    } : null,
    runtime_disposition: disposition ? { state: "accepted", disposition:
      disposition.disposition as "revoked" | "absent", ref: disposition.ref as string } : null, receipt,
    failure: failure ? { code: failure.code as string, message: failure.message as string } : null,
    canonical_mutation: result.canonical_mutation as boolean, runtime_activation: true,
  };
}
