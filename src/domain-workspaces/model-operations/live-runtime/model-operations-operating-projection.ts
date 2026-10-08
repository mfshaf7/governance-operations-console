import type {
  ModelOperationsOperatingProjection,
  ModelProfileRequestProjection,
} from "./model-operations-live-types.ts";

export function projectModelOperationsOperatingEvidence(
  request: ModelProfileRequestProjection,
  artifacts: Readonly<{
    lifecycleReceipt: Record<string, unknown>;
    mergedReadback: Record<string, unknown>;
  }>,
): ModelOperationsOperatingProjection {
  const lifecycle = artifacts.lifecycleReceipt;
  const readback = artifacts.mergedReadback;
  const fulfillment = record(request.fulfillment);
  const fulfillmentSource = record(fulfillment.source);
  const fulfillmentReceipt = record(fulfillment.receipt_ref);
  if (
    request.review_state !== "approved" ||
    request.fulfillment_state !== "applied" ||
    request.next_action !== "refresh-authoritative-projections" ||
    request.profile_lifecycle_changed !== false ||
    request.request_id !== lifecycle.request_id ||
    lifecycle.request_revision !== request.revision - 1 ||
    fulfillment.expected_revision !== lifecycle.request_revision ||
    fulfillmentSource.result_version !== readback.source_version ||
    fulfillmentReceipt.digest !== lifecycle.digest
  ) throw new Error("Model Operations has not reconciled the exact OOS request and Platform source.");
  return {
    workflow_id: "model-operations-live-projection",
    projection_state: "current",
    next_action: "complete",
    console_mutation_authority: false,
    oos_request_ref: {
      request_id: request.request_id,
      revision: request.revision,
      receipt_digest: request.latest_receipt.digest,
    },
    platform_source_ref: {
      lifecycle_receipt_digest: text(lifecycle.digest),
      merged_readback_digest: text(readback.digest),
    },
  };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Model Operations reconciliation evidence is malformed.");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value) {
    throw new Error("Model Operations reconciliation evidence is malformed.");
  }
  return value;
}
