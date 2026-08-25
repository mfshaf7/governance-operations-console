"use client";

import { useCallback, useState } from "react";

import {
  assertPrototypeDeliveryApplicationResult,
  assertPrototypeDeliveryResultMatchesPacket,
  isPrototypeDeliveryLiveApiError,
} from "./prototype-delivery-live-contract.ts";
import type {
  PrototypeDeliveryApplicationProjection,
  PrototypeDeliveryApplicationRequest,
} from "./prototype-delivery-live-types.ts";

export function usePrototypeDeliveryLiveRuntime() {
  const [projectionsByPrototypeId, setProjectionsByPrototypeId] = useState<
    Readonly<Record<string, PrototypeDeliveryApplicationProjection>>
  >({});

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
    if (!response.ok) throw prototypeDeliveryClientError(body);
    return assertPrototypeDeliveryApplicationResult(body);
  }, []);

  return { apply, projectionsByPrototypeId, read };
}

function prototypeDeliveryClientError(value: unknown) {
  return new Error(
    isPrototypeDeliveryLiveApiError(value)
      ? value.error
      : "Prototype Delivery application failed.",
  );
}
