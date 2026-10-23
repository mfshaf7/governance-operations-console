import { createHash } from "node:crypto";
import { completionObject, completionEvidence, completionTargetId, itemPiReview, type ItemCompletionContext } from "../live-runtime/delivery-item-completion-contract.ts";
import { deliveryOosRequest, resolveDeliveryOosConfig, DeliveryOosError } from "./delivery-oos-client.ts";
import { readDeliveryWorkSession } from "./delivery-work-session-oos-client.ts";
import { readDeliveryChangeProjection } from "./delivery-change-oos-client.ts";

type Options = { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch };
// Reuse the governed work-session ART budget for readiness, native forms and
// canonical readback; these operations can exceed the generic 12s window.
const completionOosTimeoutMs = 75_000;

export async function readItemCompletionContext(target: number, options: Options = {}): Promise<ItemCompletionContext> {
  const id = completionTargetId(target);
  const config = resolveDeliveryOosConfig(options.env);
  const [raw, session] = await Promise.all([
    deliveryOosRequest(config, `/v1/delivery-work-items/${id}/continuation-context`, { method: "GET" }, options.fetchImpl, completionOosTimeoutMs),
    readDeliveryWorkSession(id, options),
  ]);
  const envelope = completionObject(raw);
  const context = completionObject(envelope.continuation_context);
  const item = completionObject(context.target_item);
  const summary = completionObject(context.summary);
  const ref = `openproject://work_packages/${id}`;
  if (envelope.workflow_id !== "delivery-work-item-continuation-context" ||
    envelope.work_item_id !== `work-item-${id}` || envelope.work_item_record_ref !== ref ||
    item.id !== id || item.record_ref !== ref || typeof item.subject !== "string" ||
    typeof item.status !== "string" || typeof item.updated_at !== "string" ||
    [summary.open_descendant_count, summary.open_child_count, summary.completed_related_count].some(v => !Number.isSafeInteger(v) || Number(v) < 0)) {
    throw new DeliveryOosError("The native completion read belongs to an invalid or different work item.", "delivery_completion_context_invalid", 502);
  }
  const reasons: string[] = [];
  if (session.session_id) reasons.push("An active source session must finish through its existing merge and close path.");
  if (item.type === "Epic") reasons.push("Use initiative closeout for an Epic.");
  if (summary.open_descendant_count !== 0) reasons.push("Open descendants must complete first.");
  if (item.blocked !== false || item.dependency_blocked !== false) reasons.push("Resolve the native blocker or dependency first.");
  if (item.ready_contract_satisfied !== true) reasons.push("Required execution fields are incomplete.");
  if (item.completion_narrative_contract_satisfied !== true) reasons.push("The native done narrative requires correction.");
  if (item.completion_status_transition_available !== true) reasons.push("The native completion transition is unavailable.");
  const piReview = item.type === "PI Objective" ? await readPiReviewMetadata(id, envelope.delivery_id, item, options) : undefined;
  const pi = piReview ? { ...piReview, can_review: !session.session_id && !["done", "retired"].includes(item.status) } : undefined;
  const revision = `sha256:${createHash("sha256").update(JSON.stringify({ item, open_descendant_count: summary.open_descendant_count, source_session_id: session.session_id, pi_review: pi })).digest("hex")}`;
  return {
    work_item_id: id, record_ref: ref, subject: item.subject, status: item.status,
    owner_repo: typeof item.owner_repo === "string" ? item.owner_repo : null,
    revision, open_descendant_count: Number(summary.open_descendant_count),
    open_child_count: Number(summary.open_child_count), completed_related_count: Number(summary.completed_related_count),
    source_session_active: Boolean(session.session_id),
    completion_evidence_valid: item.completion_evidence_present === true && item.completion_evidence_formatting_valid === true,
    can_complete: item.status !== "done" && reasons.length === 0,
    blocking_reasons: reasons,
    ...(pi ? { pi_review: pi } : {}),
  };
}

async function readPiReviewMetadata(id: number, deliveryId: unknown, item: Record<string, unknown>, options: Options) {
  if (typeof deliveryId !== "string" || !/^delivery-[1-9][0-9]*$/.test(deliveryId)) throw new Error("PI review requires its canonical initiative.");
  const projection = await readDeliveryChangeProjection(deliveryId, options);
  const stack = [projection.package.execution_tree];
  const matches: Record<string, unknown>[] = [];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.id === id) matches.push(completionObject(node));
    stack.push(...node.children);
  }
  const node = matches[0];
  if (matches.length !== 1 || node.type !== "PI Objective" || node.record_ref !== item.record_ref ||
    node.status !== item.status || node.updated_at !== item.updated_at || typeof node.target_pi !== "string" || !node.target_pi.trim()) {
    throw new Error("PI review metadata belongs to a changed or different objective; read the original target.");
  }
  function value(input: unknown): number | null {
    if (input === null) return null;
    if ((typeof input === "number" || (typeof input === "string" && /^[0-9]+$/.test(input))) && Number.isSafeInteger(Number(input)) && Number(input) >= 0) return Number(input);
    throw new Error("Native PI review value is invalid.");
  }
  if (!(node.pi_objective_review_outcome === null || typeof node.pi_objective_review_outcome === "string")) throw new Error("Native PI review outcome is invalid.");
  return { delivery_id: deliveryId, target_pi: node.target_pi, planned_business_value: value(node.planned_business_value),
    actual_business_value: value(node.actual_business_value), review_outcome: node.pi_objective_review_outcome as string | null };
}

export async function submitItemPiReview(target: number, value: unknown, options: Options = {}) {
  const body = completionObject(value);
  if (Object.keys(body).some(key => !["expectedRevision", "reviewConfirmed", "review"].includes(key)) ||
    body.reviewConfirmed !== true || typeof body.expectedRevision !== "string" || !/^sha256:[a-f0-9]{64}$/.test(body.expectedRevision)) {
    throw new DeliveryOosError("Approve this exact earned PI review.", "delivery_pi_review_required", 400);
  }
  const review = itemPiReview(body.review);
  const current = await readItemCompletionContext(target, options);
  const pi = current.pi_review;
  if (!pi?.can_review || current.revision !== body.expectedRevision) {
    throw new DeliveryOosError("The exact objective changed or cannot be reviewed; read its current state.", "delivery_pi_review_context_changed", 409);
  }
  if (pi.actual_business_value === review.actualBusinessValue && pi.review_outcome === review.reviewOutcome) return { outcome: "already-recorded", context: current };
  const result = completionObject(await deliveryOosRequest(resolveDeliveryOosConfig(options.env),
    `/v1/delivery-initiatives/${pi.delivery_id}/pi-review`, { method: "POST", body: JSON.stringify({ input: {
      target_pi: pi.target_pi, reviews: [{ target_work_package_id: target, actual_business_value: review.actualBusinessValue,
        review_outcome: review.reviewOutcome, ...(review.reviewNote ? { review_note: review.reviewNote } : {}) }],
    } }) }, options.fetchImpl, completionOosTimeoutMs));
  const updated = Array.isArray(result.updated) && result.updated.length === 1 ? completionObject(completionObject(result.updated[0]).work_package) : null;
  if (result.workflow_id !== "delivery-pi-review" || result.delivery_id !== pi.delivery_id ||
    result.delivery_record_ref !== `openproject://work_packages/${pi.delivery_id.replace("delivery-", "")}` ||
    !updated || updated.id !== target || updated.record_ref !== current.record_ref || updated.target_pi !== pi.target_pi ||
    Number(updated.actual_business_value) !== review.actualBusinessValue || updated.review_outcome !== review.reviewOutcome) {
    throw new DeliveryOosError("PI review outcome is unconfirmed; read the original objective without repeating the write.", "delivery_pi_review_unconfirmed", 502);
  }
  const observed = await readItemCompletionContext(target, options);
  if (observed.pi_review?.actual_business_value !== review.actualBusinessValue || observed.pi_review.review_outcome !== review.reviewOutcome || observed.status !== current.status) {
    throw new DeliveryOosError("PI review readback is unconfirmed; read the original objective.", "delivery_pi_review_readback_unconfirmed", 502);
  }
  return { outcome: "recorded", context: observed };
}

export async function submitItemCompletion(target: number, value: unknown, options: Options = {}) {
  const body = completionObject(value);
  if (Object.keys(body).some(key => !["expectedRevision", "nonSourceConfirmed", "evidence", "route", "staleOpenJustification"].includes(key)) ||
    body.nonSourceConfirmed !== true || typeof body.expectedRevision !== "string" || !/^sha256:[a-f0-9]{64}$/.test(body.expectedRevision)) {
    throw new DeliveryOosError("Confirm this exact non-source completion review.", "delivery_completion_review_required", 400);
  }
  const evidence = completionEvidence(body.evidence);
  const route = body.route ?? "complete";
  if (typeof route !== "string" || !["complete", "stale-open-close"].includes(route)) throw new Error("Use the existing native completion or parent closeout route.");
  const current = await readItemCompletionContext(target, options);
  if (current.status === "done") return { outcome: "already-complete" as const, context: current };
  if (current.revision !== body.expectedRevision || !current.can_complete) {
    throw new DeliveryOosError(current.blocking_reasons.join(" ") || "The target changed; read and review its current state.", "delivery_completion_context_changed", 409);
  }
  if (route === "stale-open-close" && (current.open_child_count !== 0 || current.completed_related_count === 0 ||
    typeof body.staleOpenJustification !== "string" || !body.staleOpenJustification.trim())) {
    throw new DeliveryOosError("Parent closeout requires terminal children, completed related scope and an explicit operator justification.", "delivery_completion_parent_review_required", 400);
  }
  const input = { ...evidence, ...(route === "stale-open-close" ? { stale_open_justification: String(body.staleOpenJustification).trim() } : {}) };
  if (!input.completion_note) delete (input as Partial<typeof input>).completion_note;
  const raw = completionObject(await deliveryOosRequest(resolveDeliveryOosConfig(options.env),
    `/v1/delivery-work-items/${target}/${route}`, { method: "POST", body: JSON.stringify({ input }) }, options.fetchImpl, completionOosTimeoutMs));
  const item = completionObject(raw.work_item);
  if (raw.workflow_id !== (route === "complete" ? "delivery-work-item-complete" : "delivery-work-item-stale-open-close") || raw.work_item_id !== `work-item-${target}` ||
    raw.work_item_record_ref !== current.record_ref || item.id !== target || item.status !== "done") {
    throw new DeliveryOosError("The completion response is unconfirmed; read the original target before another write.", "delivery_completion_result_unconfirmed", 502);
  }
  const observed = await readItemCompletionContext(target, options);
  if (observed.status !== "done" || !observed.completion_evidence_valid) {
    throw new DeliveryOosError("Canonical completion evidence is not confirmed; read the original target.", "delivery_completion_readback_unconfirmed", 502);
  }
  return { outcome: "recorded" as const, context: observed };
}
