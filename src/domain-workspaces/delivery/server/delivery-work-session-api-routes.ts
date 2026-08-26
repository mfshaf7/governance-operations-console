import { NextRequest, NextResponse } from "next/server";

import {
  assertDeliveryWorkSessionDecisionInput,
  deliveryWorkSessionTargetId,
} from "../live-runtime/delivery-work-session-live-contract.ts";
import {
  continueDeliveryWorkSession,
  deliveryWorkSessionOosConfigured,
  prepareDeliveryWorkSessionDecision,
  readDeliveryWorkSession,
  startDeliveryWorkSession,
} from "./delivery-work-session-oos-client.ts";
import { DeliveryOosError } from "./delivery-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function readDeliveryWorkSessionRoute(workItemIdInput: string) {
  try {
    const workItemId = routeWorkItemId(workItemIdInput);
    if (!deliveryWorkSessionOosConfigured()) {
      return NextResponse.json(
        {
          error: null,
          mode: "disconnected-preview",
          observedAt: new Date().toISOString(),
          projection: null,
          status: "current",
        },
        { headers: noStoreHeaders },
      );
    }
    const projection = await readDeliveryWorkSession(workItemId);
    return currentProjection(projection);
  } catch (error) {
    return workSessionErrorResponse(error);
  }
}

export async function startDeliveryWorkSessionRoute(
  request: NextRequest,
  workItemIdInput: string,
) {
  try {
    requireLiveMode();
    const workItemId = routeWorkItemId(workItemIdInput);
    const body = record(await request.json().catch(() => null));
    const commandId = commandIdentity(body.commandId);
    const expectedSessionRevision = nullableDateTime(
      body.expectedSessionRevision,
      "expected session revision",
    );
    const decisionInput =
      body.decision === undefined
        ? null
        : assertDeliveryWorkSessionDecisionInput(body.decision);
    const decision = decisionInput
      ? await prepareDeliveryWorkSessionDecision(
          workItemId,
          decisionInput,
          commandId,
          expectedSessionRevision,
        )
      : undefined;
    const projection = await startDeliveryWorkSession(workItemId, {
      commandId,
      ...(decision ? { decision } : {}),
      expectedSessionRevision,
    });
    return currentProjection(projection);
  } catch (error) {
    return workSessionErrorResponse(error);
  }
}

export async function continueDeliveryWorkSessionRoute(
  request: NextRequest,
  workItemIdInput: string,
) {
  try {
    requireLiveMode();
    const workItemId = routeWorkItemId(workItemIdInput);
    const body = record(await request.json().catch(() => null));
    const projection = await continueDeliveryWorkSession(workItemId, {
      commandId: commandIdentity(body.commandId),
      expectedSessionRevision: requiredDateTime(
        body.expectedSessionRevision,
        "expected session revision",
      ),
    });
    return currentProjection(projection);
  } catch (error) {
    return workSessionErrorResponse(error);
  }
}

function commandIdentity(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^work-session-command:[A-Za-z0-9._:-]+$/.test(value) ||
    value.length > 200
  ) {
    invalid("Delivery work-session command identity is invalid.");
  }
  return value;
}

function currentProjection(projection: unknown) {
  return NextResponse.json(
    {
      error: null,
      mode: "live",
      observedAt: new Date().toISOString(),
      projection,
      status: "current",
    },
    { headers: noStoreHeaders },
  );
}

function invalid(message: string): never {
  throw new DeliveryOosError(
    message,
    "delivery_work_session_adapter_request_invalid",
    400,
  );
}

function nullableDateTime(value: unknown, label: string) {
  if (value === null) return null;
  return requiredDateTime(value, label);
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid("Delivery work-session request is invalid.");
  }
  return value as Record<string, unknown>;
}

function requiredDateTime(value: unknown, label: string) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    invalid(`Delivery work-session ${label} is invalid.`);
  }
  return value as string;
}

function requireLiveMode() {
  if (!deliveryWorkSessionOosConfigured()) {
    throw new DeliveryOosError(
      "Delivery work-session mutation is unavailable in disconnected preview mode.",
      "delivery_work_session_live_mode_required",
      503,
    );
  }
}

function routeWorkItemId(value: string) {
  if (!/^[1-9][0-9]*$/.test(value)) {
    invalid("Delivery work-session target is invalid.");
  }
  return deliveryWorkSessionTargetId(Number(value));
}

function workSessionErrorResponse(error: unknown) {
  const status = error instanceof DeliveryOosError ? error.status : 400;
  const code =
    error instanceof DeliveryOosError
      ? error.code
      : "delivery_work_session_adapter_request_invalid";
  const message =
    error instanceof Error ? error.message : "Delivery work-session adapter failed.";
  return NextResponse.json(
    { code, error: message, mode: "live", status: "offline" },
    { headers: noStoreHeaders, status },
  );
}
