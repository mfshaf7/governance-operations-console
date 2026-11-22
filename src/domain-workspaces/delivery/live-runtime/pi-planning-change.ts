import { assertDeliveryChangeCommandResult, assertDeliveryChangeSnapshot } from "./delivery-change-live-contract.ts";
import type { DeliveryChangeResult } from "./delivery-change-live-types.ts";

export class PIPlanningApplyError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
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

export async function applyPIPlanningEpic(epicId: number, request: string): Promise<DeliveryChangeResult> {
  const response = await fetch(`${piPlanningChangePath(epicId)}/commands`, {
    method: "POST", body: request, headers: { "Content-Type": "application/json" },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new PIPlanningApplyError(body?.error ?? `Epic #${epicId} could not confirm a result.`, response.status);
  return assertDeliveryChangeCommandResult(body).result;
}
