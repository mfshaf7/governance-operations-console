import { createHash } from "node:crypto";
import { completionObject, completionEvidence, completionTargetId, type ItemCompletionContext } from "../live-runtime/delivery-item-completion-contract.ts";
import { deliveryOosRequest, resolveDeliveryOosConfig, DeliveryOosError } from "./delivery-oos-client.ts";
import { readDeliveryWorkSession } from "./delivery-work-session-oos-client.ts";

type Options = { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch };

export async function readItemCompletionContext(target: number, options: Options = {}): Promise<ItemCompletionContext> {
  const id = completionTargetId(target);
  const config = resolveDeliveryOosConfig(options.env);
  const [raw, session] = await Promise.all([
    deliveryOosRequest(config, `/v1/delivery-work-items/${id}/continuation-context`, { method: "GET" }, options.fetchImpl),
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
  const revision = `sha256:${createHash("sha256").update(JSON.stringify({ item, open_descendant_count: summary.open_descendant_count, source_session_id: session.session_id })).digest("hex")}`;
  return {
    work_item_id: id, record_ref: ref, subject: item.subject, status: item.status,
    owner_repo: typeof item.owner_repo === "string" ? item.owner_repo : null,
    revision, open_descendant_count: Number(summary.open_descendant_count),
    open_child_count: Number(summary.open_child_count), completed_related_count: Number(summary.completed_related_count),
    source_session_active: Boolean(session.session_id),
    completion_evidence_valid: item.completion_evidence_present === true && item.completion_evidence_formatting_valid === true,
    can_complete: item.status !== "done" && reasons.length === 0,
    blocking_reasons: reasons,
  };
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
    `/v1/delivery-work-items/${target}/${route}`, { method: "POST", body: JSON.stringify({ input }) }, options.fetchImpl));
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
