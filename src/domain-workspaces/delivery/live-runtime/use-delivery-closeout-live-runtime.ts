"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  assertDeliveryCloseoutCommandResult,
  assertDeliveryCloseoutSnapshot,
  deliveryCloseoutDeliveryId,
  isDeliveryCloseoutLiveApiError,
} from "./delivery-closeout-live-contract.ts";
import type {
  DeliveryCloseoutOperation,
  DeliveryCloseoutResult,
  DeliveryCloseoutSnapshot,
} from "./delivery-closeout-live-types.ts";

export class DeliveryCloseoutLiveRuntimeError extends Error {
  readonly code: string;
  readonly nextAction: Record<string, unknown> | null;
  readonly retryable: boolean;

  constructor(
    message: string,
    code = "delivery_closeout_live_request_failed",
    nextAction: Record<string, unknown> | null = null,
    retryable = false,
  ) {
    super(message);
    this.code = code;
    this.nextAction = nextAction;
    this.retryable = retryable;
  }
}

type PendingCommand = {
  commandId: string;
  requestKey: string;
};

type PendingRefresh = {
  deliveryId: string;
  promise: Promise<DeliveryCloseoutSnapshot>;
};

export function useDeliveryCloseoutLiveRuntime(
  deliveryIdInput: number | string | null,
) {
  const deliveryId =
    deliveryIdInput === null
      ? null
      : deliveryCloseoutDeliveryId(deliveryIdInput);
  const [snapshot, setSnapshot] = useState<DeliveryCloseoutSnapshot | null>(null);
  const [lastResult, setLastResult] = useState<DeliveryCloseoutResult | null>(null);
  const activeDeliveryId = useRef<string | null>(deliveryId);
  const snapshotRef = useRef<DeliveryCloseoutSnapshot | null>(null);
  const pendingRefresh = useRef<PendingRefresh | null>(null);
  const pendingCommands = useRef<Record<string, PendingCommand>>({});

  const refresh = useCallback(async () => {
    if (!deliveryId) {
      throw new DeliveryCloseoutLiveRuntimeError(
        "The selected package has no Delivery identity.",
        "delivery_closeout_target_missing",
      );
    }
    if (pendingRefresh.current?.deliveryId === deliveryId) {
      return pendingRefresh.current.promise;
    }
    const operation = fetch(deliveryCloseoutPath(deliveryId), {
      cache: "no-store",
    })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw clientError(body);
        return assertDeliveryCloseoutSnapshot(body);
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
      const next: DeliveryCloseoutSnapshot = {
        error:
          error instanceof Error
            ? error.message
            : "Delivery closeout projection failed.",
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
    async (operation: DeliveryCloseoutOperation, acceptanceNote: string) => {
      if (!deliveryId) {
        throw new DeliveryCloseoutLiveRuntimeError(
          "The selected package has no Delivery identity.",
          "delivery_closeout_target_missing",
        );
      }
      const current = await currentSnapshot(snapshotRef.current, refresh);
      if (current.mode === "disconnected-preview") return null;
      if (!current.projection) {
        throw new DeliveryCloseoutLiveRuntimeError(
          "Canonical Delivery closeout truth is unavailable.",
          "delivery_closeout_projection_unavailable",
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
          : commandIdentity();
      pendingCommands.current[requestKey] = { commandId, requestKey };
      const response = await fetch(`${deliveryCloseoutPath(deliveryId)}/commands`, {
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
      if (!response.ok) throw clientError(body);
      const commandResult = assertDeliveryCloseoutCommandResult(body);
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
  current: DeliveryCloseoutSnapshot | null,
  refresh: () => Promise<DeliveryCloseoutSnapshot>,
) {
  const snapshot = current ?? (await refresh());
  if (snapshot.mode === "live" && snapshot.status !== "current") {
    throw new DeliveryCloseoutLiveRuntimeError(
      snapshot.error || "Canonical Delivery closeout truth is unavailable.",
      "delivery_closeout_projection_unavailable",
    );
  }
  return snapshot;
}

function clientError(value: unknown) {
  const error = isDeliveryCloseoutLiveApiError(value) ? value : null;
  const nextActionLabel = error?.nextAction?.label;
  const message = error?.error ?? "Governed Delivery closeout request failed.";
  return new DeliveryCloseoutLiveRuntimeError(
    nextActionLabel ? `${message} Next action: ${nextActionLabel}.` : message,
    error?.code,
    error?.nextAction ?? null,
    error?.retryable ?? false,
  );
}

function commandIdentity() {
  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `delivery-closeout-command:console-${randomId}`;
}

function deliveryCloseoutPath(deliveryId: string) {
  return `/api/delivery/execution/${encodeURIComponent(deliveryId)}/closeout`;
}
