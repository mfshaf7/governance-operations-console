"use client";

import { useCallback, useState } from "react";

import {
  assertArchitecturePacketApiSnapshot,
  isArchitecturePacketApiError,
} from "./architecture-packet-live-contract.ts";
import type {
  ArchitecturePacketApiSnapshot,
  ArchitecturePacketArtifact,
  ArchitecturePacketDraftInput,
} from "./architecture-packet-live-types.ts";

export class ArchitecturePacketLiveRuntimeError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

export function useArchitecturePacketLiveRuntime() {
  const [snapshot, setSnapshot] =
    useState<ArchitecturePacketApiSnapshot | null>(null);

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      let response: Response;
      try {
        response = await fetch(path, {
          cache: "no-store",
          ...init,
          headers: {
            ...(init?.body ? { "Content-Type": "application/json" } : {}),
            ...Object.fromEntries(new Headers(init?.headers).entries()),
          },
        });
      } catch (caught) {
        const error = new ArchitecturePacketLiveRuntimeError(
          caught instanceof Error
            ? caught.message
            : "Architecture Packet authority is unavailable.",
          "delivery_architecture_packet_projection_unavailable",
        );
        setSnapshot(offlineSnapshot(error.message));
        throw error;
      }
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new ArchitecturePacketLiveRuntimeError(
          isArchitecturePacketApiError(body)
            ? body.error
            : "Governed Architecture Packet request failed.",
          isArchitecturePacketApiError(body) ? body.code : undefined,
        );
        setSnapshot(offlineSnapshot(error.message));
        throw error;
      }
      const next = assertArchitecturePacketApiSnapshot(body);
      setSnapshot(next);
      return next;
    },
    [],
  );

  const inspectCurrent = useCallback(
    (deliveryId: string) =>
      request(`/api/delivery/architecture-packets/${deliveryId}`),
    [request],
  );

  const draft = useCallback(
    (input: ArchitecturePacketDraftInput) =>
      request("/api/delivery/architecture-packets/draft", {
        body: JSON.stringify({ input }),
        method: "POST",
      }),
    [request],
  );

  const persist = useCallback(
    (artifact: ArchitecturePacketArtifact) =>
      request("/api/delivery/architecture-packets/persist", {
        body: JSON.stringify({ artifact }),
        method: "POST",
      }),
    [request],
  );

  return {
    draft,
    error: snapshot?.error ?? null,
    inspectCurrent,
    mode: snapshot?.mode ?? null,
    persist,
    result: snapshot?.result ?? null,
    status: snapshot?.status ?? "loading",
  };
}

function offlineSnapshot(error: string): ArchitecturePacketApiSnapshot {
  return {
    error,
    mode: "live",
    observedAt: new Date().toISOString(),
    result: null,
    status: "offline",
  };
}
