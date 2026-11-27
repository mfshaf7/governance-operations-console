import { assertDeliveryChangeCommandResult, assertDeliveryChangeResult, assertDeliveryChangeSnapshot } from "./delivery-change-live-contract.ts";
import { submitTrackedDeliveryCommand } from "./delivery-command-outcome.ts";
import type { DeliveryChangeResult } from "./delivery-change-live-types.ts";

export class PIPlanningApplyError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function piPlanningChangePath(epicId: number) {
  return `/api/delivery/execution/delivery-${epicId}/change-control`;
}

export async function readPIPlanningEpic(epicId: number) {
  const response = await fetch(piPlanningChangePath(epicId), { cache: "no-store" });
  if (!response.ok) throw new Error(`Epic #${epicId} could not be read for review.`);
  const snapshot = assertDeliveryChangeSnapshot(await response.json());
  if (snapshot.status !== "current" || !snapshot.projection || snapshot.projection.delivery_id !== `delivery-${epicId}`) {
    throw new Error(`The current plan for Epic #${epicId} is unavailable.`);
  }
  return snapshot.projection;
}

export function piPlanningCommandScope(pi: string) {
  return `pi-planning:${pi}`;
}

export async function applyPIPlanningEpic(epicId: number, request: string, pi: string, onChecking: () => void): Promise<DeliveryChangeResult> {
  const { commandId } = JSON.parse(request) as { commandId: string };
  return submitTrackedDeliveryCommand({
    scope: piPlanningCommandScope(pi),
    reference: { kind: "change-control", target: `delivery-${epicId}`, commandId },
    send: () => fetch(`${piPlanningChangePath(epicId)}/commands`, {
      method: "POST", body: request, headers: { "Content-Type": "application/json" },
    }),
    accept: (body, recovered) => recovered ? assertDeliveryChangeResult(body) : assertDeliveryChangeCommandResult(body).result,
    reject: (body, status) => new PIPlanningApplyError(
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Epic #${epicId} could not confirm a result.`,
      status,
    ),
    onChecking,
  });
}
