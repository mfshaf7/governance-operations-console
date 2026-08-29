import {
  assertDeliveryCloseoutOperation,
  assertDeliveryCloseoutProjection,
  assertDeliveryCloseoutResult,
  assertDeliveryCloseoutSourceRevision,
  deliveryCloseoutDeliveryId,
} from "../live-runtime/delivery-closeout-live-contract.ts";
import type {
  DeliveryCloseoutOperation,
  DeliveryCloseoutProjection,
  DeliveryCloseoutResult,
} from "../live-runtime/delivery-closeout-live-types.ts";
import {
  deliveryOosConfigured,
  deliveryOosOperator,
  deliveryOosRequest,
  resolveDeliveryOosConfig,
} from "./delivery-oos-client.ts";

type DeliveryCloseoutClientOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
};

const closeoutReadTimeoutMs = 30_000;
const closeoutCommandTimeoutMs = 90_000;

export function deliveryCloseoutOosConfigured(
  env: NodeJS.ProcessEnv = process.env,
) {
  return deliveryOosConfigured(env);
}

export async function readDeliveryCloseoutProjection(
  deliveryIdInput: number | string,
  options: DeliveryCloseoutClientOptions = {},
): Promise<DeliveryCloseoutProjection> {
  const deliveryId = deliveryCloseoutDeliveryId(deliveryIdInput);
  const config = resolveDeliveryOosConfig(options.env);
  const projection = assertDeliveryCloseoutProjection(
    await deliveryOosRequest(
      config,
      `/v1/delivery-initiatives/${encodeURIComponent(deliveryId)}/closeout`,
      { method: "GET" },
      options.fetchImpl,
      closeoutReadTimeoutMs,
    ),
  );
  if (projection.delivery_id !== deliveryId) {
    throw new Error("OOS returned closeout truth for another Delivery initiative.");
  }
  return projection;
}

export async function submitDeliveryCloseoutCommand(
  deliveryIdInput: number | string,
  command: {
    acceptanceNote: string;
    commandId: string;
    expectedSourceRevision: string;
    operation: DeliveryCloseoutOperation;
  },
  options: DeliveryCloseoutClientOptions = {},
): Promise<DeliveryCloseoutResult> {
  const deliveryId = deliveryCloseoutDeliveryId(deliveryIdInput);
  const config = resolveDeliveryOosConfig(options.env);
  const operator = deliveryOosOperator(config);
  const operation = assertDeliveryCloseoutOperation(command.operation);
  const expectedSourceRevision = assertDeliveryCloseoutSourceRevision(
    command.expectedSourceRevision,
  );
  const result = assertDeliveryCloseoutResult(
    await deliveryOosRequest(
      config,
      `/v1/delivery-initiatives/${encodeURIComponent(deliveryId)}/closeout/commands`,
      {
        body: JSON.stringify({
          acceptance: {
            accepted_at: new Date().toISOString(),
            accepted_by: config.operatorId,
            decision: "apply",
            note: command.acceptanceNote,
          },
          command_id: command.commandId,
          delivery_id: deliveryId,
          expected_source_revision: expectedSourceRevision,
          operation,
          operator,
          schema_version: 1,
        }),
        method: "POST",
      },
      options.fetchImpl,
      closeoutCommandTimeoutMs,
    ),
  );
  if (result.command_id !== command.commandId) {
    throw new Error("OOS returned a result for another Delivery closeout command.");
  }
  return result;
}
