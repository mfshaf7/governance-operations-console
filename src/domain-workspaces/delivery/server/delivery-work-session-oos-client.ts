import { createHash } from "node:crypto";

import {
  deliveryOosConfigured,
  deliveryOosRequest,
  resolveDeliveryOosConfig,
  DeliveryOosError,
} from "./delivery-oos-client.ts";
import {
  assertDeliveryWorkSessionDecision,
  assertDeliveryWorkSessionProjection,
  deliveryWorkSessionTargetId,
} from "../live-runtime/delivery-work-session-live-contract.ts";
import type {
  DeliveryWorkSessionDecision,
  DeliveryWorkSessionDecisionInput,
  DeliveryWorkSessionProjection,
} from "../live-runtime/delivery-work-session-live-types.ts";

type DeliveryWorkSessionClientOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
};

const deliveryWorkSessionReadTimeoutMs = 45_000;
const deliveryWorkSessionCommandTimeoutMs = 75_000;

export function deliveryWorkSessionOosConfigured(
  env: NodeJS.ProcessEnv = process.env,
) {
  return deliveryOosConfigured(env);
}

export async function readDeliveryWorkSession(
  workItemId: number,
  options: DeliveryWorkSessionClientOptions = {},
) {
  return requestWorkSession(
    workItemId,
    "",
    { method: "GET" },
    options,
  );
}

export async function startDeliveryWorkSession(
  workItemId: number,
  command: {
    commandId: string;
    decision?: DeliveryWorkSessionDecision;
    expectedSessionRevision: string | null;
  },
  options: DeliveryWorkSessionClientOptions = {},
) {
  if (command.decision !== undefined) {
    assertDeliveryWorkSessionDecision(command.decision);
  }
  return requestWorkSession(
    workItemId,
    "/start",
    {
      body: JSON.stringify({
        command: {
          command_id: command.commandId,
          ...(command.decision ? { decision: command.decision } : {}),
          expected_session_revision: command.expectedSessionRevision,
        },
      }),
      method: "POST",
    },
    options,
  );
}

export async function continueDeliveryWorkSession(
  workItemId: number,
  command: {
    commandId: string;
    expectedSessionRevision: string;
  },
  options: DeliveryWorkSessionClientOptions = {},
) {
  return requestWorkSession(
    workItemId,
    "/continue",
    {
      body: JSON.stringify({
        command: {
          command_id: command.commandId,
          expected_session_revision: command.expectedSessionRevision,
        },
      }),
      method: "POST",
    },
    options,
  );
}

export function deliveryWorkSessionOperator(
  env: NodeJS.ProcessEnv = process.env,
) {
  const config = resolveWorkSessionConfig(env);
  return {
    id: config.operatorId,
    decision_source: "operator" as const,
  };
}

export async function prepareDeliveryWorkSessionDecision(
  workItemId: number,
  input: DeliveryWorkSessionDecisionInput,
  commandId: string,
  expectedSessionRevision: string | null,
  options: DeliveryWorkSessionClientOptions = {},
): Promise<DeliveryWorkSessionDecision> {
  const prepared = await startDeliveryWorkSession(
    workItemId,
    {
      commandId: preparationCommandIdentity(commandId),
      expectedSessionRevision,
    },
    options,
  );
  const draft = prepared.decision_draft;
  if (!draft || draft.work_item_id !== `work-item-${workItemId}`) {
    throw new DeliveryOosError(
      "OOS did not return a caller-bound Landing Unit decision draft.",
      "delivery_work_session_decision_draft_required",
      409,
    );
  }
  return {
    ...draft,
    architecture: {
      artifact_location: input.architecture.artifactLocation,
      required: input.architecture.required,
    },
    landing_unit: {
      ...draft.landing_unit,
      branch: input.branch,
      decision: input.landingUnitDecision,
      id: input.landingUnitId,
      rollback_boundary: input.rollbackBoundary,
      split_reason: input.splitReason,
    },
    operator: deliveryWorkSessionOperator(options.env),
  };
}

function preparationCommandIdentity(commandId: string) {
  const digest = createHash("sha256").update(commandId).digest("hex");
  return `work-session-command:console-prepare-${digest}`;
}

async function requestWorkSession(
  workItemIdInput: number,
  suffix: string,
  init: RequestInit,
  { env = process.env, fetchImpl = fetch }: DeliveryWorkSessionClientOptions,
): Promise<DeliveryWorkSessionProjection> {
  const workItemId = deliveryWorkSessionTargetId(workItemIdInput);
  const config = resolveWorkSessionConfig(env);
  const value = await deliveryOosRequest(
    config,
    `/v1/delivery-work-items/${workItemId}/work-session${suffix}`,
    {
      ...init,
      headers: {
        ...Object.fromEntries(new Headers(init.headers).entries()),
        "x-oos-operator-id": config.operatorId,
      },
    },
    fetchImpl,
    suffix === ""
      ? deliveryWorkSessionReadTimeoutMs
      : deliveryWorkSessionCommandTimeoutMs,
  );
  const projection = assertDeliveryWorkSessionProjection(value);
  if (projection.work_item_id !== `work-item-${workItemId}`) {
    throw new DeliveryOosError(
      "OOS returned a Delivery work session for a different work item.",
      "delivery_work_session_target_mismatch",
      502,
    );
  }
  return projection;
}

function resolveWorkSessionConfig(env: NodeJS.ProcessEnv) {
  return resolveDeliveryOosConfig(env);
}
