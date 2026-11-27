import { NextResponse } from "next/server";

import { assertDeliveryChangeCommandId, assertDeliveryChangeResult, deliveryChangeDeliveryId } from "../live-runtime/delivery-change-live-contract.ts";
import { assertDeliveryWorkSessionProjection, deliveryWorkSessionTargetId } from "../live-runtime/delivery-work-session-live-contract.ts";
import { DeliveryOosError, deliveryOosRequest, resolveDeliveryOosConfig } from "./delivery-oos-client.ts";

export async function readDeliveryCommandOutcomeRoute(
  kind: "work-session" | "change-control", target: string, commandId: string,
) {
  const response = (body: unknown, status = 200) =>
    NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  try {
    const workSession = kind === "work-session";
    if (workSession && !/^[1-9][0-9]*$/.test(target)) {
      return response({ error: "The work item reference is invalid." }, 400);
    }
    const targetId = workSession ? String(deliveryWorkSessionTargetId(Number(target))) : deliveryChangeDeliveryId(target);
    if (workSession) {
      if (commandId.length > 200 || !/^work-session-command:[A-Za-z0-9._:-]+$/.test(commandId)) {
        return response({ error: "The operation reference is invalid." }, 400);
      }
    } else {
      assertDeliveryChangeCommandId(commandId);
    }

    const config = resolveDeliveryOosConfig();
    const collection = workSession ? "delivery-work-items" : "delivery-initiatives";
    const value = await deliveryOosRequest(
      config,
      `/v1/${collection}/${targetId}/${kind}/commands/${encodeURIComponent(commandId)}`,
      { method: "GET", headers: { "x-oos-operator-id": config.operatorId } },
      fetch,
      15_000,
    ) as { command_id?: unknown; state?: unknown; result?: unknown; rebuild_revision?: unknown; publication?: unknown };

    if (value.command_id !== commandId) return response({ error: "Delivery returned an inconsistent operation reference." }, 502);
    if (value.state === "completed") {
      const result = workSession ? assertDeliveryWorkSessionProjection(value.result) : assertDeliveryChangeResult(value.result);
      if ("work_item_id" in result
        ? result.work_item_id !== `work-item-${targetId}` || result.command_receipt?.command_id !== commandId
        : result.command_id !== commandId || result.event.delivery_id !== targetId) {
        return response({ error: "Delivery returned a result for a different operation." }, 502);
      }
      return response({ state: value.state, result });
    }
    if (value.state === "failed" && workSession) {
      return response({ state: "failed" });
    }
    if (value.state === "pending" || value.state === "unconfirmed") {
      const rebuildRevision = workSession && value.state === "pending" && typeof value.rebuild_revision === "string" &&
        Number.isFinite(Date.parse(value.rebuild_revision)) ? value.rebuild_revision : undefined;
      const publication = workSession && value.state === "pending" ? value.publication : undefined;
      return response({ state: value.state, ...(rebuildRevision ? { rebuildRevision } : {}), ...(publication ? { publication } : {}) });
    }
    return response({ error: "Delivery returned an unrecognized operation state." }, 502);
  } catch (error) {
    return response(
      { error: "The operation status is temporarily unavailable." },
      error instanceof DeliveryOosError ? error.status : 502,
    );
  }
}
