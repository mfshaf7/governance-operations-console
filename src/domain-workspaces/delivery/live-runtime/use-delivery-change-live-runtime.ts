"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  assertDeliveryChangeCommandResult,
  assertDeliveryChangeSnapshot,
  deliveryChangeDeliveryId,
  isDeliveryChangeLiveApiError,
} from "./delivery-change-live-contract.ts";
import type {
  DeliveryChangeOperation,
  DeliveryChangeResult,
  DeliveryChangeSnapshot,
} from "./delivery-change-live-types.ts";

export class DeliveryChangeLiveRuntimeError extends Error {
  readonly code: string;
  readonly nextAction: Record<string, unknown> | null;

  constructor(
    message: string,
    code = "delivery_change_live_request_failed",
    nextAction: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.code = code;
    this.nextAction = nextAction;
  }
}

type PendingCommand = {
  commandId: string;
  requestKey: string;
};

type PendingRefresh = {
  deliveryId: string;
  promise: Promise<DeliveryChangeSnapshot>;
};

export function useDeliveryChangeLiveRuntime(
  deliveryIdInput: number | string | null,
) {
  const deliveryId =
    deliveryIdInput === null
      ? null
      : deliveryChangeDeliveryId(deliveryIdInput);
  const [snapshot, setSnapshot] = useState<DeliveryChangeSnapshot | null>(null);
  const [lastResult, setLastResult] = useState<DeliveryChangeResult | null>(null);
  const activeDeliveryId = useRef<string | null>(deliveryId);
  const snapshotRef = useRef<DeliveryChangeSnapshot | null>(null);
  const pendingRefresh = useRef<PendingRefresh | null>(null);
  const pendingCommands = useRef<Record<string, PendingCommand>>({});

  const refresh = useCallback(async () => {
    if (!deliveryId) {
      throw new DeliveryChangeLiveRuntimeError(
        "The selected package has no Delivery identity.",
        "delivery_change_target_missing",
      );
    }
    if (pendingRefresh.current?.deliveryId === deliveryId) {
      return pendingRefresh.current.promise;
    }
    const operation = fetch(deliveryChangePath(deliveryId), {
      cache: "no-store",
    })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw clientError(body);
        return assertDeliveryChangeSnapshot(body);
      })
      .then((next) => {
        if (activeDeliveryId.current === deliveryId) {
          snapshotRef.current = next;
          setSnapshot(next);
        }
        return next;
      })
      .finally(() => {
        if (pendingRefresh.current?.deliveryId === deliveryId) {
          pendingRefresh.current = null;
        }
      });
    pendingRefresh.current = { deliveryId, promise: operation };
    return operation;
  }, [deliveryId]);

  useEffect(() => {
    activeDeliveryId.current = deliveryId;
    snapshotRef.current = null;
    pendingCommands.current = {};
    setSnapshot(null);
    setLastResult(null);
    if (!deliveryId) return;
    void refresh().catch((error) => {
      const next: DeliveryChangeSnapshot = {
        error:
          error instanceof Error
            ? error.message
            : "Delivery change projection failed.",
        mode: "live",
        observedAt: new Date().toISOString(),
        projection: null,
        status: "offline",
      };
      if (activeDeliveryId.current === deliveryId) {
        snapshotRef.current = next;
        setSnapshot(next);
      }
    });
  }, [deliveryId, refresh]);

  const apply = useCallback(
    async (operation: DeliveryChangeOperation, acceptanceNote: string) => {
      if (!deliveryId) {
        throw new DeliveryChangeLiveRuntimeError(
          "The selected package has no Delivery identity.",
          "delivery_change_target_missing",
        );
      }
      const current = await currentSnapshot(snapshotRef.current, refresh);
      if (current.mode === "disconnected-preview") return null;
      if (!current.projection) {
        throw new DeliveryChangeLiveRuntimeError(
          "Canonical Delivery change truth is unavailable.",
          "delivery_change_projection_unavailable",
        );
      }
      const requestKey = JSON.stringify({
        acceptanceNote,
        expectedSourceRevision: current.projection.source_revision,
        operation,
      });
      const pending = pendingCommands.current[requestKey];
      const commandId =
        pending?.requestKey === requestKey
          ? pending.commandId
          : commandIdentity(operation.type);
      pendingCommands.current[requestKey] = { commandId, requestKey };
      const response = await fetch(`${deliveryChangePath(deliveryId)}/commands`, {
        body: JSON.stringify({
          acceptanceNote,
          commandId,
          expectedSourceRevision: current.projection.source_revision,
          operation,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw clientError(body);
      }
      const commandResult = assertDeliveryChangeCommandResult(body);
      if (activeDeliveryId.current === deliveryId) {
        setLastResult(commandResult.result);
      }
      await refresh();
      delete pendingCommands.current[requestKey];
      return commandResult.result;
    },
    [deliveryId, refresh],
  );

  return {
    apply,
    lastResult,
    loading: snapshot === null,
    mode: snapshot?.mode ?? null,
    projection: snapshot?.projection ?? null,
    projectionError: snapshot?.error ?? null,
    projectionStatus: snapshot?.status ?? "offline",
    refresh,
  };
}

async function currentSnapshot(
  current: DeliveryChangeSnapshot | null,
  refresh: () => Promise<DeliveryChangeSnapshot>,
) {
  const snapshot = current ?? (await refresh());
  if (snapshot.mode === "live" && snapshot.status !== "current") {
    throw new DeliveryChangeLiveRuntimeError(
      snapshot.error || "Canonical Delivery change truth is unavailable.",
      "delivery_change_projection_unavailable",
    );
  }
  return snapshot;
}

function clientError(value: unknown) {
  const error = isDeliveryChangeLiveApiError(value) ? value : null;
  const nextActionLabel = error?.nextAction?.label;
  const message = error?.error ?? "Governed Delivery change request failed.";
  return new DeliveryChangeLiveRuntimeError(
    nextActionLabel ? `${message} Next action: ${nextActionLabel}.` : message,
    error?.code,
    error?.nextAction ?? null,
  );
}

function commandIdentity(operationType: string) {
  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `delivery-change-command:console-${operationType}-${randomId}`;
}

function deliveryChangePath(deliveryId: string) {
  return `/api/delivery/execution/${encodeURIComponent(deliveryId)}/change-control`;
}
