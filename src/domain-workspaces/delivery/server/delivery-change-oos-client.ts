import {
  assertCatalogMutationRequest,
} from "../live-runtime/catalog-live-contract.ts";
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
import {
  buildCatalogMutationRequest,
  readCatalogProjection,
} from "./refinement-catalog-oos-client.ts";

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
      {
        authority: "operator-orchestration-service",
        recordRef: deliveryRecordRef(deliveryId),
        sourceOwner: "workspace-delivery-art",
      },
    ),
  );
  if (projection.delivery_id !== deliveryId) {
    throw new Error("OOS returned Delivery change truth for another initiative.");
  }
  return projection;
}

function deliveryRecordRef(deliveryId: string) {
  return `openproject://work_packages/${deliveryId.replace(/^delivery-/, "")}`;
}

export async function submitDeliveryChangeCommand(
  deliveryIdInput: number | string,
  command: {
    acceptedAt: string;
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
  const acceptedAt = command.acceptedAt;
  if (Number.isNaN(Date.parse(acceptedAt))) {
    throw new Error("Delivery change acceptance time is invalid.");
  }
  const operation = await canonicalDeliveryChangeOperation(
    assertDeliveryChangeOperation(command.operation),
    {
      acceptanceNote: command.acceptanceNote,
      acceptedAt,
      commandId: command.commandId,
      env: options.env,
      fetchImpl: options.fetchImpl,
    },
  );
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
      accepted_at: acceptedAt,
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

async function canonicalDeliveryChangeOperation(
  operation: DeliveryChangeOperation,
  options: {
    acceptanceNote: string;
    acceptedAt: string;
    commandId: string;
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
  },
): Promise<DeliveryChangeOperation> {
  if (operation.type !== "link_repository") return operation;

  const consoleCatalogCommand = assertCatalogMutationRequest(
    operation.payload.catalog_request,
  );
  const projection = await readCatalogProjection({
    env: options.env,
    fetchImpl: options.fetchImpl,
  });
  const catalogRequest = buildCatalogMutationRequest(
    operation.payload.catalog_item_id,
    projection,
    consoleCatalogCommand,
    {
      acceptanceNote: options.acceptanceNote,
      acceptedAt: options.acceptedAt,
      correlationId: options.commandId,
      env: options.env,
    },
  );

  return {
    ...operation,
    payload: {
      ...operation.payload,
      catalog_request: catalogRequest,
    },
  };
}
