"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  assertDeliveryWorkSessionSnapshot,
  recoveryFromWorkSession,
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

export function useDeliveryWorkSessionLiveRuntime(workItemId: number | null, onCanonicalChanged?: () => Promise<void>) {
  const [snapshot, setSnapshot] =
    useState<DeliveryWorkSessionSnapshot | null>(null);
  const pendingCommands = useRef<Record<string, PendingCommand>>({});
  const confirmedRevision = useRef<string | null>(null);
  const changed = useRef(onCanonicalChanged); changed.current = onCanonicalChanged;
  const publish = useCallback((next: DeliveryWorkSessionSnapshot) => {
    const revision = next.projection?.session_revision ?? null;
    if (next.mode === "live" && next.status === "current" && (Object.keys(pendingCommands.current).length > 0 || revision && confirmedRevision.current && revision !== confirmedRevision.current)) {
      void changed.current?.().catch(() => undefined);
    }
    confirmedRevision.current = revision;
    setSnapshot(next);
  }, []);

  const publishCommand = useCallback((next: DeliveryWorkSessionSnapshot) => {
    confirmedRevision.current = next.projection?.session_revision ?? null;
    setSnapshot(next);
    void changed.current?.().catch(() => undefined);
  }, []);

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
    publish(next);
    return next;
  }, [workItemId, publish]);

  useEffect(() => {
    setSnapshot(null);
    pendingCommands.current = {};
    confirmedRevision.current = null;
    void refresh().catch(() => undefined);
  }, [refresh]);

  const prepare = useCallback(async () => {
    const current = await currentSnapshot(snapshot, refresh);
    if (current.mode === "disconnected-preview") return current;
    return submitDeliveryWorkSessionCommand({
      action: "prepare",
      body: {
        expectedSessionRevision:
          current.projection?.session_revision ?? null,
      },
      path: `${workSessionPath(requiredTarget(workItemId))}/start`,
      pendingCommands,
      setSnapshot: next => { confirmedRevision.current = next.projection?.session_revision ?? null; setSnapshot(next); },
    });
  }, [refresh, snapshot, workItemId, publishCommand]);

  const start = useCallback(
    async (decision: DeliveryWorkSessionDecisionInput, sourceIntentRef?: string) => {
      const current = await currentSnapshot(snapshot, refresh);
      if (current.mode === "disconnected-preview") return current;
      return submitDeliveryWorkSessionCommand({
        action: "start",
        body: {
          decision,
          ...(sourceIntentRef ? { sourceIntentRef } : {}),
          expectedSessionRevision:
            current.projection?.session_revision ?? null,
        },
        path: `${workSessionPath(requiredTarget(workItemId))}/start`,
        pendingCommands,
        setSnapshot: publishCommand,
      });
    },
    [refresh, snapshot, workItemId, publishCommand],
  );

  const command = useCallback(async (action: "close" | "continue" | "merge" | "reconstruct" | "recover", sourceIntentRef?: string, reason?: string) => {
    const current = await currentSnapshot(snapshot, refresh);
    if (current.mode === "disconnected-preview") return current;
    const revision = current.projection?.session_revision;
    if (!revision) {
      throw new DeliveryWorkSessionLiveRuntimeError(
        "Start the work session before running a lifecycle command.",
        "delivery_work_session_not_started",
      );
    }
    return submitDeliveryWorkSessionCommand({
      action,
      body: { expectedSessionRevision: revision, ...(sourceIntentRef ? { sourceIntentRef } : {}), ...(action === "recover" ? { recovery: recoveryFromWorkSession(current.projection!, reason ?? "") } : {}) },
      path: `${workSessionPath(requiredTarget(workItemId))}/${action}`,
      pendingCommands,
      setSnapshot: publishCommand,
    });
  }, [refresh, snapshot, workItemId, publishCommand]);

  const continueWork = useCallback((sourceIntentRef?: string) => command("continue", sourceIntentRef), [command]);
  const mergeWork = useCallback(() => command("merge"), [command]);
  const closeWork = useCallback(() => command("close"), [command]);
  const reconstructWork = useCallback(() => command("reconstruct"), [command]);
  const recoverWork = useCallback((reason: string) => command("recover", undefined, reason), [command]);

  const projectionStatus: DeliveryWorkSessionSnapshot["status"] | "loading" =
    snapshot?.status ?? "loading";

  return {
    closeWork,
    reconstructWork,
    recoverWork,
    continueWork,
    mergeWork,
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

export async function submitDeliveryWorkSessionCommand({
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
  setSnapshot: (snapshot: DeliveryWorkSessionSnapshot) => void;
}) {
  const requestKey = JSON.stringify({ path, body });
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
    // A server/timeout failure may follow an accepted owner effect. Retain the
    // exact command for recovery; only a known rejection releases its identity.
    if (response.status < 500 && response.status !== 408) {
      delete pendingCommands.current[action];
    }
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
