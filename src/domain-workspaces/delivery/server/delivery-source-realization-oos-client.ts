import { assertDeliverySourceRealizationInput, assertDeliverySourceRealizationProjection } from "../live-runtime/delivery-source-realization-live-contract.ts";
import type { DeliverySourceRealizationInput } from "../live-runtime/delivery-source-realization-live-types.ts";
import { canonicalDigest, deliveryOosRequest, resolveDeliveryOosConfig, stableDigestId, DeliveryOosError } from "./delivery-oos-client.ts";
import { deliveryWorkSessionTargetId } from "../live-runtime/delivery-work-session-live-contract.ts";

type Options = { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch };

export function readDeliverySourceRealization(workItemId: number, options: Options = {}) {
  return request(workItemId, "", undefined, options);
}

export async function commandDeliverySourceRealization(workItemId: number, input: DeliverySourceRealizationInput, options: Options = {}) {
  const command = assertDeliverySourceRealizationInput(input);
  const config = resolveDeliveryOosConfig(options.env);
  const identity = { caller: config.callerId, operator: config.operatorId, workItemId, commandId: command.commandId };
  const common = { schema_version: 1, requested_at: command.requestedAt };
  const realization = command.action === "start" ? {
    ...common,
    request_id: stableDigestId("source-realization:console", identity),
    execution_id: stableDigestId("source-realization-execution:console", identity),
    expected_session_revision: command.expectedSessionRevision,
    objective: command.objective, budget_tokens: command.budgetTokens, retry_of: command.retryOf,
  } : {
    ...common, command_id: stableDigestId("source-realization-command:console", identity),
    expected_revision: command.expectedRevision,
    ...(command.action === "continue" ? { accepted_change_set_digest: command.acceptedChangeSetDigest } : {}),
    ...(command.action === "cancel" ? { reason: command.reason } : {}),
  };
  const result = await request(workItemId, `/${command.action}`, realization, options);
  if (command.action === "start" && (result.attempt?.request_id !== (realization as { request_id: string }).request_id || result.attempt.objective_digest !== canonicalDigest(command.objective) || result.attempt.retry_of !== command.retryOf) ||
      command.action === "continue" && (result.state !== "source-created" || result.attempt?.change_set?.digest !== command.acceptedChangeSetDigest) ||
      command.action === "cancel" && result.state !== "cancelled" || command.action === "recover" && result.state !== "source-created") {
    throw new DeliveryOosError("Source realization acknowledgement does not bind the reviewed command.", "delivery_source_realization_command_mismatch", 502);
  }
  return result;
}

async function request(workItemIdInput: number, suffix: string, realization: unknown, options: Options) {
  const workItemId = deliveryWorkSessionTargetId(workItemIdInput);
  const config = resolveDeliveryOosConfig(options.env);
  const body = await deliveryOosRequest(config, `/v1/delivery-work-items/${workItemId}/work-session/realization${suffix}`, {
    method: suffix ? "POST" : "GET",
    ...(suffix ? { body: JSON.stringify({ realization }) } : {}),
    headers: { "x-oos-operator-id": config.operatorId },
  }, options.fetchImpl, suffix === "/start" ? 300000 : 75000, suffix ? undefined : {
    authority: "operator-orchestration-service", sourceOwner: "workspace-delivery-art",
    recordRef: `openproject://work_packages/${workItemId}/source-realization`,
  });
  if (body && typeof body === "object" && "attempt" in body && body.attempt && typeof body.attempt === "object" && "source_receipt" in body.attempt && body.attempt.source_receipt) {
    const receipt = body.attempt.source_receipt;
    if (typeof receipt !== "object" || !("receipt_digest" in receipt)) throw new DeliveryOosError("Source realization receipt is malformed.", "delivery_source_realization_receipt_invalid", 502);
    const { receipt_digest: claimed, ...subject } = receipt;
    if (canonicalDigest(subject) !== claimed || !("outcome" in subject) || subject.outcome !== "committed") throw new DeliveryOosError("Source realization receipt does not verify.", "delivery_source_realization_receipt_invalid", 502);
  }
  const projection = assertDeliverySourceRealizationProjection(body);
  if (projection.work_item_id !== `work-item-${workItemId}`) throw new DeliveryOosError("OOS returned source realization for another work item.", "delivery_source_realization_target_mismatch", 502);
  return projection;
}
