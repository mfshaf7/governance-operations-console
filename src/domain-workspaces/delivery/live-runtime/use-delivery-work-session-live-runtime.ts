"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  assertDeliveryWorkSessionSnapshot,
  recoveryFromWorkSession,
  isDeliveryWorkSessionLiveApiError,
} from "./delivery-work-session-live-contract.ts";
import { submitTrackedDeliveryCommand, useDeliveryCommandRecovery, type DeliveryCommandReference, type DeliveryPublication } from "./delivery-command-outcome.ts";
import { assertPlatformOperationRecord } from "../../../environment-lifecycle/live-runtime/platform-operation-contract.ts";
import type {
  DeliveryWorkSessionDecisionInput,
  DeliveryWorkSessionSnapshot,
} from "./delivery-work-session-live-types.ts";

export class DeliveryWorkSessionLiveRuntimeError extends Error {
  readonly code?: string;
  readonly sourceOperationId?: string;

  constructor(message: string, code?: string, sourceOperationId?: string) {
    super(message);
    this.code = code;
    this.sourceOperationId = sourceOperationId;
  }
}

type PendingCommand = {
  commandId: string;
  requestKey: string;
};

type RetainedWorkSessionRead = {
  workItemId: number;
  deliveryId: string;
  status: "closed" | "absent" | "unavailable";
  snapshot?: DeliveryWorkSessionSnapshot;
};

export function useRetainedWorkSessionRead(workItemId: number | null, deliveryId: string | null) {
  const [read, setRead] = useState<RetainedWorkSessionRead | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (workItemId === null || deliveryId === null) return;

    const request = new AbortController();
    const record = { workItemId, deliveryId };
    async function inspect() {
      try {
        const response = await fetch(workSessionPath(record.workItemId), {
          cache: "no-store",
          signal: request.signal,
        });
        if (!response.ok) throw new Error("Saved work session read failed.");
        const snapshot = assertDeliveryWorkSessionSnapshot(await response.json());
        const session = snapshot.projection;
        if (snapshot.mode !== "live" || snapshot.status !== "current" ||
          !session || session.work_item_id !== `work-item-${record.workItemId}` ||
          (session.state === "closed" && session.delivery_id !== record.deliveryId)) {
          throw new Error("Saved work session read is unavailable.");
        }
        if (!request.signal.aborted) {
          const closed = session.state === "closed" && Boolean(session.cleanup_receipt);
          setRead(closed ? { ...record, status: "closed", snapshot } : { ...record, status: "absent" });
        }
      } catch {
        if (!request.signal.aborted) setRead({ ...record, status: "unavailable" });
      }
    }

    void inspect();
    return () => request.abort();
  }, [workItemId, deliveryId, attempt]);

  const current = read?.workItemId === workItemId && read.deliveryId === deliveryId ? read : null;
  return {
    status: current?.status ?? "checking",
    snapshot: current?.snapshot ?? null,
    retry() {
      setRead(null);
      setAttempt(previous => previous + 1);
    },
  } as const;
}

export function useDeliveryWorkSessionLiveRuntime(
  workItemId: number | null,
  onCanonicalChanged?: () => Promise<void>,
  retainedSnapshot: DeliveryWorkSessionSnapshot | null = null,
) {
  const [snapshot, setSnapshot] =
    useState<DeliveryWorkSessionSnapshot | null>(null);
  const pendingCommands = useRef<Record<string, PendingCommand>>({});
  const confirmedRevision = useRef<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [checking, setChecking] = useState(false);
  const [publication, setPublication] = useState<DeliveryPublication | null>(null);
  const [pendingAccess, setPendingAccess] = useState<{ operationId: string; intentId: string } | null>(null);
  const [accessCheckFailed, setAccessCheckFailed] = useState(false);
  const [pendingRebuild, setPendingRebuild] = useState<{ reference: DeliveryCommandReference; revision: string } | null>(null);
  const changed = useRef(onCanonicalChanged); changed.current = onCanonicalChanged;
  const publish = useCallback((next: DeliveryWorkSessionSnapshot) => {
    const revision = next.projection?.session_revision ?? null;
    if (next.mode === "live" && next.status === "current" && (Object.keys(pendingCommands.current).length > 0 || revision && confirmedRevision.current && revision !== confirmedRevision.current)) {
      void changed.current?.().catch(() => undefined);
    }
    confirmedRevision.current = revision;
    setSnapshot(next);
    const pullRequest = next.projection?.pull_request;
    if (typeof pullRequest?.url === "string" && next.projection?.next_action?.code !== "agent-source-publish-required") {
      setPublication(current => current?.url === pullRequest.url && current?.head_commit === pullRequest.head_commit ? null : current);
    }
  }, []);

  const publishCommand = useCallback((next: DeliveryWorkSessionSnapshot) => {
    confirmedRevision.current = next.projection?.session_revision ?? null;
    setSnapshot(next);
    setPublication(null);
    void changed.current?.().catch(() => undefined);
  }, []);

  const refresh = useCallback(async (keepConfirmedClosure = false) => {
    function showReadFailure(next: DeliveryWorkSessionSnapshot) {
      setSnapshot(current => keepConfirmedClosure && current?.projection?.state === "closed" &&
        current.projection.work_item_id === `work-item-${workItemId}`
        ? current.projection.closed_review ? current : {
          ...current, projection: { ...current.projection, closed_review_unavailable: true },
        }
        : next);
    }
    if (workItemId === null) {
      const next: DeliveryWorkSessionSnapshot = {
        error: "The selected execution target has no work-item identity.",
        mode: "live",
        observedAt: new Date().toISOString(),
        projection: null,
        status: "offline",
      };
      showReadFailure(next);
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
      showReadFailure(next);
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
      showReadFailure(next);
      throw error;
    }
    const next = assertDeliveryWorkSessionSnapshot(body);
    publish(next);
    return next;
  }, [workItemId, publish]);

  useEffect(() => {
    setSnapshot(null);
    setPublication(null);
    setPendingAccess(null);
    setAccessCheckFailed(false);
    pendingCommands.current = {};
    confirmedRevision.current = null;
    if (workItemId === null) return;
    const receipt = retainedSnapshot?.projection;
    const age = Date.now() - Date.parse(retainedSnapshot?.observedAt ?? "");
    if (retainedSnapshot?.status === "current" && retainedSnapshot.mode === "live" &&
        receipt?.work_item_id === `work-item-${workItemId}` &&
        receipt.state === "closed" && receipt.cleanup_receipt && age >= 0 && age <= 60000) {
      publish(retainedSnapshot);
      return;
    }
    void refresh().catch(() => undefined);
  }, [publish, refresh, retainedSnapshot, workItemId]);

  useEffect(() => {
    if (!pendingAccess) return;
    const { operationId, intentId } = pendingAccess;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function check() {
      try {
        const response = await fetch(`/api/environment-operations/${encodeURIComponent(operationId)}`, { cache: "no-store", signal: abort.signal });
        if (!response.ok) throw new Error("Source access read failed.");
        const operation = assertPlatformOperationRecord(await response.json());
        const intent = operation.command.input.source_intent as { intent_id?: string } | undefined;
        if (abort.signal.aborted) return;
        if (operation.operation_id === operationId && intent?.intent_id === intentId &&
            ["agent-source.issue", "agent-source.renew"].includes(operation.command.action)) {
          if (operation.state === "succeeded") {
            await refresh();
            if (!abort.signal.aborted) setPendingAccess(null);
            return;
          }
          if (["failed", "cancelled"].includes(operation.state)) {
            await refresh();
            if (!abort.signal.aborted) {
              setAccessCheckFailed(true);
              setPendingAccess(null);
            }
            return;
          }
        }
      } catch {
        // Keep checking the original access operation after a temporary read failure.
      }
      if (!abort.signal.aborted) timer = setTimeout(check, 5_000);
    }
    void check();
    return () => { abort.abort(); clearTimeout(timer); };
  }, [pendingAccess, refresh]);

  const scope = workItemId === null ? null : `work-session:${workItemId}`;
  const recovery = useDeliveryCommandRecovery(scope, dispatching, result => {
    const next = assertDeliveryWorkSessionSnapshot({
      mode: "live", status: "current", error: null, observedAt: new Date().toISOString(), projection: result,
    });
    publishCommand(next);
    if (next.projection?.state === "closed") void refresh(true).catch(() => undefined);
    return true;
  }, setPendingRebuild, setPublication);

  const track = useCallback(async (action: string, target: number, path: string, body: Record<string, unknown>, observePublication = false) => {
    const commandId = commandIdentity(action, "");
    setDispatching(true);
    setPublication(null);
    setAccessCheckFailed(false);
    try {
      const next = await submitTrackedDeliveryCommand({
        scope: `work-session:${target}`,
        reference: { kind: "work-session", target: String(target), commandId },
        send: () => fetch(path, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, commandId }),
        }),
        accept: (value, recovered) => assertDeliveryWorkSessionSnapshot(recovered ? {
          mode: "live", status: "current", error: null, observedAt: new Date().toISOString(), projection: value,
        } : value),
        reject: clientError,
        onChecking: () => setChecking(true),
        ...(observePublication ? { onPublication: setPublication } : {}),
      });
      publishCommand(next);
      if (next.projection?.state === "closed") void refresh(true).catch(() => undefined);
      return next;
    } catch (error) {
      if (error instanceof DeliveryWorkSessionLiveRuntimeError && error.code === "platform_source_credential_pending" &&
          error.sourceOperationId && typeof body.sourceIntentRef === "string") {
        setPendingAccess({ operationId: error.sourceOperationId, intentId: body.sourceIntentRef });
        return;
      }
      throw error;
    } finally {
      setChecking(false);
      setDispatching(false);
    }
  }, [publishCommand, refresh]);

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
  }, [refresh, snapshot, workItemId]);

  const start = useCallback(
    async (decision: DeliveryWorkSessionDecisionInput, sourceIntentRef?: string) => {
      const current = await currentSnapshot(snapshot, refresh);
      if (current.mode === "disconnected-preview") return current;
      const target = requiredTarget(workItemId);
      return track("start", target, `${workSessionPath(target)}/start`, {
        decision,
        ...(sourceIntentRef ? { sourceIntentRef } : {}),
        expectedSessionRevision: current.projection?.session_revision ?? null,
      });
    },
    [refresh, snapshot, workItemId, track],
  );

  const command = useCallback(async (action: "close" | "continue" | "merge" | "reconstruct" | "recover", sourceIntentRef?: string, reason?: string, reviewedVerificationDigest?: string) => {
    const current = await currentSnapshot(snapshot, refresh);
    if (current.mode === "disconnected-preview") return current;
    const revision = current.projection?.session_revision;
    if (!revision) {
      throw new DeliveryWorkSessionLiveRuntimeError(
        "Start the work session before running a lifecycle command.",
        "delivery_work_session_not_started",
      );
    }
    const target = requiredTarget(workItemId);
    if (reviewedVerificationDigest && current.projection?.operating_verification?.digest !== reviewedVerificationDigest) {
      throw new DeliveryWorkSessionLiveRuntimeError("The original merge or verifier changed. Read the current session before verifying.");
    }
    return track(action, target, `${workSessionPath(target)}/${action}`, {
      expectedSessionRevision: revision,
      ...(sourceIntentRef ? { sourceIntentRef } : {}),
      ...(reviewedVerificationDigest ? { reviewedVerificationDigest } : {}),
      ...(action === "recover" ? { recovery: recoveryFromWorkSession(current.projection!, reason ?? "") } : {}),
    }, action === "continue" && current.projection?.next_action?.code === "agent-source-publish-required");
  }, [refresh, snapshot, workItemId, track]);

  const continueWork = useCallback((sourceIntentRef?: string, reviewedVerificationDigest?: string) =>
    command("continue", sourceIntentRef, undefined, reviewedVerificationDigest), [command]);
  const mergeWork = useCallback(() => command("merge"), [command]);
  const closeWork = useCallback(() => command("close"), [command]);
  const reconstructWork = useCallback(() => command("reconstruct"), [command]);
  const ownerRebuild = snapshot?.projection?.pending_rebuild;
  const resumeRebuild = useCallback(async () => {
    if (!scope || workItemId === null) return;
    const accepted = ownerRebuild ? {
      reference: { kind: "work-session" as const, commandId: ownerRebuild.command_id, target: String(workItemId) },
      revision: ownerRebuild.expected_session_revision,
    } : pendingRebuild;
    if (!accepted || accepted.reference.target !== String(workItemId)) return;
    const { reference, revision } = accepted;
    setDispatching(true);
    try {
      const next = await submitTrackedDeliveryCommand({
        scope,
        reference,
        resume: true,
        send: () => fetch(`${workSessionPath(requiredTarget(workItemId))}/reconstruct`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commandId: reference.commandId, expectedSessionRevision: revision }),
        }),
        accept: (value, recovered) => assertDeliveryWorkSessionSnapshot(recovered ? {
          mode: "live", status: "current", error: null, observedAt: new Date().toISOString(), projection: value,
        } : value),
        reject: clientError,
        onChecking: () => setChecking(true),
      });
      publishCommand(next);
    } finally {
      setChecking(false);
      setDispatching(false);
    }
  }, [ownerRebuild, pendingRebuild, scope, workItemId, publishCommand]);
  const recoverWork = useCallback((reason: string) => command("recover", undefined, reason), [command]);

  const projectionStatus: DeliveryWorkSessionSnapshot["status"] | "loading" =
    snapshot?.status ?? "loading";

  return {
    closeWork,
    reconstructWork,
    resumeRebuild: ownerRebuild || pendingRebuild ? resumeRebuild : undefined,
    recoverWork,
    continueWork,
    mergeWork,
    operationStatus: checking || ownerRebuild ? "checking" as const : recovery,
    publication,
    accessCheckStatus: pendingAccess ? "checking" as const : accessCheckFailed ? "failed" as const : "idle" as const,
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
    value && typeof value === "object" && "sourceOperationId" in value &&
      typeof value.sourceOperationId === "string" && /^platform-operation:[0-9a-f]{24}$/.test(value.sourceOperationId) ? value.sourceOperationId : undefined,
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
    const error = clientError(value);
    if (response.status < 500 && response.status !== 408) {
      delete pendingCommands.current[action];
    } else if (response.status === 408 || error.code === "delivery_oos_unavailable") {
      throw new DeliveryWorkSessionLiveRuntimeError(
        "Delivery has not confirmed the result yet. Read Current Session before retrying the same command.",
        error.code,
      );
    }
    throw error;
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
