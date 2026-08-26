"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  assertDeliveryWorkSessionSnapshot,
  isDeliveryWorkSessionLiveApiError,
} from "./delivery-work-session-live-contract.ts";
import type {
  DeliveryWorkSessionDecisionInput,
  DeliveryWorkSessionSnapshot,
} from "./delivery-work-session-live-types.ts";

export class DeliveryWorkSessionLiveRuntimeError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

type PendingCommand = {
  commandId: string;
  requestKey: string;
};

export function useDeliveryWorkSessionLiveRuntime(workItemId: number | null) {
  const [snapshot, setSnapshot] =
    useState<DeliveryWorkSessionSnapshot | null>(null);
  const pendingCommands = useRef<Record<string, PendingCommand>>({});

  const refresh = useCallback(async () => {
    if (workItemId === null) {
      const next: DeliveryWorkSessionSnapshot = {
        error: "The selected execution target has no work-item identity.",
        mode: "live",
        observedAt: new Date().toISOString(),
        projection: null,
        status: "offline",
      };
      setSnapshot(next);
      return next;
    }
    let response: Response;
    try {
      response = await fetch(workSessionPath(workItemId), {
        cache: "no-store",
      });
    } catch (caught) {
      const error = new DeliveryWorkSessionLiveRuntimeError(
        caught instanceof Error
          ? caught.message
          : "Authoritative Delivery work-session state is unavailable.",
        "delivery_work_session_projection_unavailable",
      );
      const next: DeliveryWorkSessionSnapshot = {
        error: error.message,
        mode: "live",
        observedAt: new Date().toISOString(),
        projection: null,
        status: "offline",
      };
      setSnapshot(next);
      throw error;
    }
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = clientError(body);
      const next: DeliveryWorkSessionSnapshot = {
        error: error.message,
        mode: "live",
        observedAt: new Date().toISOString(),
        projection: null,
        status: "offline",
      };
      setSnapshot(next);
      throw error;
    }
    const next = assertDeliveryWorkSessionSnapshot(body);
    setSnapshot(next);
    return next;
  }, [workItemId]);

  useEffect(() => {
    setSnapshot(null);
    pendingCommands.current = {};
    void refresh().catch(() => undefined);
  }, [refresh]);

  const prepare = useCallback(async () => {
    const current = await currentSnapshot(snapshot, refresh);
    if (current.mode === "disconnected-preview") return current;
    return mutate({
      action: "prepare",
      body: {
        expectedSessionRevision:
          current.projection?.session_revision ?? null,
      },
      path: `${workSessionPath(requiredTarget(workItemId))}/start`,
      pendingCommands,
      setSnapshot,
    });
  }, [refresh, snapshot, workItemId]);

  const start = useCallback(
    async (decision: DeliveryWorkSessionDecisionInput) => {
      const current = await currentSnapshot(snapshot, refresh);
      if (current.mode === "disconnected-preview") return current;
      return mutate({
        action: "start",
        body: {
          decision,
          expectedSessionRevision:
            current.projection?.session_revision ?? null,
        },
        path: `${workSessionPath(requiredTarget(workItemId))}/start`,
        pendingCommands,
        setSnapshot,
      });
    },
    [refresh, snapshot, workItemId],
  );

  const continueWork = useCallback(async () => {
    const current = await currentSnapshot(snapshot, refresh);
    if (current.mode === "disconnected-preview") return current;
    const revision = current.projection?.session_revision;
    if (!revision) {
      throw new DeliveryWorkSessionLiveRuntimeError(
        "Start the work session before continuing it.",
        "delivery_work_session_not_started",
      );
    }
    return mutate({
      action: "continue",
      body: { expectedSessionRevision: revision },
      path: `${workSessionPath(requiredTarget(workItemId))}/continue`,
      pendingCommands,
      setSnapshot,
    });
  }, [refresh, snapshot, workItemId]);

  const projectionStatus: DeliveryWorkSessionSnapshot["status"] | "loading" =
    snapshot?.status ?? "loading";

  return {
    continueWork,
    mode: snapshot?.mode ?? null,
    prepare,
    projection: snapshot?.projection ?? null,
    projectionError: snapshot?.error ?? null,
    projectionStatus,
    refresh,
    start,
  };
}

async function currentSnapshot(
  current: DeliveryWorkSessionSnapshot | null,
  refresh: () => Promise<DeliveryWorkSessionSnapshot>,
) {
  const snapshot = current ?? (await refresh());
  if (snapshot.mode === "live" && snapshot.status !== "current") {
    throw new DeliveryWorkSessionLiveRuntimeError(
      snapshot.error || "Authoritative Delivery work-session state is unavailable.",
      "delivery_work_session_projection_unavailable",
    );
  }
  return snapshot;
}

function clientError(value: unknown) {
  return new DeliveryWorkSessionLiveRuntimeError(
    isDeliveryWorkSessionLiveApiError(value)
      ? value.error
      : "Governed Delivery work-session request failed.",
    isDeliveryWorkSessionLiveApiError(value) ? value.code : undefined,
  );
}

function commandIdentity(action: string, _requestKey: string) {
  const randomId = globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `work-session-command:console-${action}-${randomId}`;
}

async function mutate({
  action,
  body,
  path,
  pendingCommands,
  setSnapshot,
}: {
  action: string;
  body: Record<string, unknown>;
  path: string;
  pendingCommands: React.MutableRefObject<Record<string, PendingCommand>>;
  setSnapshot: React.Dispatch<React.SetStateAction<DeliveryWorkSessionSnapshot | null>>;
}) {
  const requestKey = JSON.stringify(body);
  const pending = pendingCommands.current[action];
  const commandId =
    pending?.requestKey === requestKey
      ? pending.commandId
      : commandIdentity(action, requestKey);
  pendingCommands.current[action] = { commandId, requestKey };
  const response = await fetch(path, {
    body: JSON.stringify({ ...body, commandId }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    delete pendingCommands.current[action];
    throw clientError(value);
  }
  const next = assertDeliveryWorkSessionSnapshot(value);
  delete pendingCommands.current[action];
  setSnapshot(next);
  return next;
}

function requiredTarget(workItemId: number | null) {
  if (workItemId === null) {
    throw new DeliveryWorkSessionLiveRuntimeError(
      "The selected execution target has no work-item identity.",
      "delivery_work_session_target_missing",
    );
  }
  return workItemId;
}

function workSessionPath(workItemId: number) {
  return `/api/delivery/execution/${workItemId}/work-session`;
}
