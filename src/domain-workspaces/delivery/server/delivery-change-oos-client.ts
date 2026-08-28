import {
  assertDeliveryChangeOperation,
  assertDeliveryChangeProjection,
  assertDeliveryChangeResult,
  assertDeliveryChangeSourceRevision,
  deliveryChangeDeliveryId,
} from "../live-runtime/delivery-change-live-contract.ts";
import type {
  DeliveryChangeOperation,
  DeliveryChangeProjection,
  DeliveryChangeResult,
} from "../live-runtime/delivery-change-live-types.ts";
import {
  deliveryOosConfigured,
  deliveryOosOperator,
  deliveryOosRequest,
  resolveDeliveryOosConfig,
} from "./delivery-oos-client.ts";

type DeliveryChangeClientOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
};

const deliveryChangeReadTimeoutMs = 30_000;
const deliveryChangeCommandTimeoutMs = 75_000;

export function deliveryChangeOosConfigured(
  env: NodeJS.ProcessEnv = process.env,
) {
  return deliveryOosConfigured(env);
}

export async function readDeliveryChangeProjection(
  deliveryIdInput: number | string,
  options: DeliveryChangeClientOptions = {},
): Promise<DeliveryChangeProjection> {
  const deliveryId = deliveryChangeDeliveryId(deliveryIdInput);
  const config = resolveDeliveryOosConfig(options.env);
  const projection = assertDeliveryChangeProjection(
    await deliveryOosRequest(
      config,
      `/v1/delivery-initiatives/${encodeURIComponent(deliveryId)}/change-control`,
      { method: "GET" },
      options.fetchImpl,
      deliveryChangeReadTimeoutMs,
    ),
  );
  if (projection.delivery_id !== deliveryId) {
    throw new Error("OOS returned Delivery change truth for another initiative.");
  }
  return projection;
}

export async function submitDeliveryChangeCommand(
  deliveryIdInput: number | string,
  command: {
    acceptanceNote: string;
    commandId: string;
    expectedSourceRevision: string;
    operation: DeliveryChangeOperation;
  },
  options: DeliveryChangeClientOptions = {},
): Promise<DeliveryChangeResult> {
  const deliveryId = deliveryChangeDeliveryId(deliveryIdInput);
  const config = resolveDeliveryOosConfig(options.env);
  const operator = deliveryOosOperator(config);
  const operation = assertDeliveryChangeOperation(command.operation);
  const expectedSourceRevision = assertDeliveryChangeSourceRevision(
    command.expectedSourceRevision,
  );
  const request = {
    schema_version: 1,
    command_id: command.commandId,
    delivery_id: deliveryId,
    expected_source_revision: expectedSourceRevision,
    operator,
    acceptance: {
      decision: "apply",
      accepted_at: new Date().toISOString(),
      accepted_by: config.operatorId,
      note: command.acceptanceNote,
    },
    operation,
  };
  const result = assertDeliveryChangeResult(
    await deliveryOosRequest(
      config,
      `/v1/delivery-initiatives/${encodeURIComponent(deliveryId)}/change-control/commands`,
      { body: JSON.stringify(request), method: "POST" },
      options.fetchImpl,
      deliveryChangeCommandTimeoutMs,
    ),
  );
  if (result.command_id !== command.commandId) {
    throw new Error("OOS returned a result for another Delivery change command.");
  }
  return result;
}
