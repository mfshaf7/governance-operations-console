"use client";

import { useCallback, useState } from "react";

import {
  assertPrototypeDeliveryApplicationResult,
  assertPrototypeDeliveryResultMatchesPacket,
  isPrototypeDeliveryLiveApiError,
  prototypeDeliveryApplicationIdForPacket,
} from "./prototype-delivery-live-contract.ts";
import type {
  PrototypeDeliveryPacket,
  PrototypeDeliveryApplicationProjection,
  PrototypeDeliveryApplicationRequest,
} from "./prototype-delivery-live-types.ts";

export function usePrototypeDeliveryLiveRuntime() {
  const [projectionsByPrototypeId, setProjectionsByPrototypeId] = useState<
    Readonly<Record<string, PrototypeDeliveryApplicationProjection>>
  >({});
  const [errorsByPrototypeId, setErrorsByPrototypeId] = useState<Record<string, Error | null>>({});

  const apply = useCallback(
    async (request: PrototypeDeliveryApplicationRequest) => {
      const response = await fetch("/api/prototypes/delivery-applications", {
        body: JSON.stringify(request),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw prototypeDeliveryClientError(body);
      const result = assertPrototypeDeliveryResultMatchesPacket({
        packet: request.packet,
        result: assertPrototypeDeliveryApplicationResult(body),
      });
      const projection = { packet: request.packet, result };
      setProjectionsByPrototypeId((current) => ({
        ...current,
        [request.packet.content.source.prototype_id]: projection,
      }));
      return result;
    },
    [],
  );

  const read = useCallback(async (applicationId: string) => {
    const response = await fetch(
      `/api/prototypes/delivery-applications/${encodeURIComponent(applicationId)}`,
      { cache: "no-store" },
    );
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw Object.assign(prototypeDeliveryClientError(body), {
      status: response.status,
      code: isPrototypeDeliveryLiveApiError(body) ? body.code : "prototype_delivery_read_failed",
    });
    return assertPrototypeDeliveryApplicationResult(body);
  }, []);

  const load = useCallback(async (packet: PrototypeDeliveryPacket) => {
    const id = packet.content.source.prototype_id;
    try {
      const result = await read(await prototypeDeliveryApplicationIdForPacket(packet));
      assertPrototypeDeliveryResultMatchesPacket({ packet, result });
      setProjectionsByPrototypeId((current) => ({ ...current, [id]: { packet, result } }));
      setErrorsByPrototypeId((current) => ({ ...current, [id]: null }));
      return result;
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 404 && "code" in error && error.code === "prototype_delivery_application_not_found") {
        setErrorsByPrototypeId((current) => ({ ...current, [id]: null }));
        return null;
      }
      setErrorsByPrototypeId((current) => ({ ...current, [id]: error instanceof Error ? error : new Error("Prototype Delivery owner readback is unavailable.") }));
      throw error;
    }
  }, [read]);

  return { apply, errorsByPrototypeId, load, projectionsByPrototypeId, read };
}

function prototypeDeliveryClientError(value: unknown) {
  return new Error(
    isPrototypeDeliveryLiveApiError(value)
      ? value.error
      : "Prototype Delivery application failed.",
  );
}
