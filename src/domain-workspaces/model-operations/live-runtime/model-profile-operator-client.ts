import { assertModelProfileRequestId, assertModelProfileRequestProjection, assertModelProfileReviewCommandDraft } from "./model-operations-live-contract.ts";
import type { ModelOperationsOperatingProjection, ModelProfileReviewCommandDraft } from "./model-operations-live-types.ts";

export class ModelProfileOperatorError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null) { super(message); this.status = status; }
}

type Options = { fetchImpl?: typeof fetch };

async function request(path: string, init: RequestInit, options: Options) {
  let response: Response;
  try { response = await (options.fetchImpl ?? fetch)(path, { ...init, cache: "no-store", signal: AbortSignal.timeout(30_000) }); }
  catch { throw new ModelProfileOperatorError("The original request outcome could not be read. Recover that same request before another decision.", null); }
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = value && typeof value === "object" && "error" in value ? String(value.error) : "The request owner did not confirm this action.";
    throw new ModelProfileOperatorError(error, response.status);
  }
  return value;
}

export async function fetchModelProfileRequest(requestId: string, options: Options = {}) {
  assertModelProfileRequestId(requestId);
  const result = assertModelProfileRequestProjection(await request(`/api/model-operations/requests/${encodeURIComponent(requestId)}`, { method: "GET" }, options));
  if (result.request_id !== requestId) throw new ModelProfileOperatorError("The owner returned another request.", null);
  return result;
}

export async function submitModelProfileReviewCommand(requestId: string, draft: ModelProfileReviewCommandDraft, options: Options = {}) {
  assertModelProfileReviewCommandDraft(draft, requestId);
  const result = assertModelProfileRequestProjection(await request(`/api/model-operations/requests/${encodeURIComponent(requestId)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
  }, options));
  if (result.request_id !== requestId || !result.history.some(event => event.command_id === draft.commandId)) {
    throw new ModelProfileOperatorError("The owner did not confirm the original reviewed action.", null);
  }
  return result;
}

export async function fetchModelProfileFulfillment(requestId: string, revision: number, options: Options = {}): Promise<ModelOperationsOperatingProjection> {
  assertModelProfileRequestId(requestId);
  const value = await request(`/api/model-operations/operating-projection/${encodeURIComponent(requestId)}`, { method: "GET" }, options);
  const d = value as ModelOperationsOperatingProjection | null;
  const digest = (v: unknown) => typeof v === "string" && /^sha256:[0-9a-f]{64}$/.test(v);
  if (!d || d.workflow_id !== "model-operations-live-projection" || d.projection_state !== "current" || d.next_action !== "complete" ||
      d.console_mutation_authority !== false || d.oos_request_ref?.request_id !== requestId || d.oos_request_ref.revision !== revision ||
      !digest(d.oos_request_ref.receipt_digest) || !digest(d.platform_source_ref?.lifecycle_receipt_digest) ||
      !digest(d.platform_source_ref?.merged_readback_digest) || !/^[0-9a-f]{40}$/.test(d.platform_source_ref?.source_version ?? "")) {
    throw new ModelProfileOperatorError("The selected request has no matching verified fulfillment. Refresh its original owner state.", null);
  }
  return d;
}
