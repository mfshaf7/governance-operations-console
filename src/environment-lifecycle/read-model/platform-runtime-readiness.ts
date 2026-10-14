import type {
  PlatformOperationRecord,
  PlatformOperationSubject,
  PlatformOperationsLiveSnapshot,
} from "../live-runtime/platform-operation-types.ts";

export const platformOperationFreshnessWindowMs = 60_000;

export type PlatformRuntimeReadiness = Readonly<{
  actionable: boolean;
  catalogState: "current" | "stale" | "unavailable";
  detail: string;
  label: "Degraded" | "Ready" | "Recovering" | "Stale" | "Unavailable";
  latestOperation: PlatformOperationRecord | null;
  nextAction: Readonly<{ authority: string; code: string; reason: string }>;
  operationState: "current" | "recovering" | "retained" | "unavailable";
  ready: boolean;
  state: "degraded" | "ready" | "recovering" | "stale" | "unavailable";
  tone: "danger" | "info" | "ok" | "stale" | "warn";
}>;

const refreshAction = {
  authority: "operator-orchestration-service",
  code: "refresh-owner-truth",
  reason: "Refresh current OOS and Platform owner truth before attempting another action.",
} as const;

export function projectPlatformRuntimeReadiness(
  snapshot: PlatformOperationsLiveSnapshot,
  now: Date = new Date(),
  subjectKinds?: readonly PlatformOperationSubject["kind"][],
): PlatformRuntimeReadiness {
  const operations = subjectKinds
    ? snapshot.operations.filter((operation) => subjectKinds.includes(operation.command.subject.kind))
    : snapshot.operations;
  const latestOperation = [...operations].sort(
    (left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at),
  )[0] ?? null;
  const nextAction = latestOperation?.next_action ?? refreshAction;

  if (snapshot.status === "loading") {
    return projection("recovering", "Recovering", "info", "unavailable", "recovering", false, false,
      "Loading current OOS catalog and retained operation truth.", latestOperation, refreshAction);
  }
  if (snapshot.mode === "disconnected-preview") {
    return projection("unavailable", "Unavailable", "warn", "unavailable", "unavailable", false, false,
      "Disconnected preview is not operating readiness. Configure the admitted OOS integration to use durable actions.", latestOperation, refreshAction);
  }
  if (!snapshot.catalog) {
    const retained = Boolean(latestOperation);
    return projection(retained ? "degraded" : "unavailable", retained ? "Degraded" : "Unavailable", retained ? "warn" : "danger", "unavailable", retained ? "retained" : "unavailable", false, false,
      retained
        ? "The Platform catalog is unavailable, but retained OOS history and recovery controls remain visible. New actions are disabled."
        : "The Platform catalog and retained OOS operation truth are unavailable. New actions are disabled.",
      latestOperation, nextAction);
  }

  const catalogAge = now.getTime() - Date.parse(snapshot.catalog.observed_at);
  if (snapshot.catalog.freshness !== "current" || catalogAge < -platformOperationFreshnessWindowMs || catalogAge > platformOperationFreshnessWindowMs) {
    return projection("stale", "Stale", "stale", "stale", latestOperation ? "retained" : "current", false, false,
      "The last Platform catalog observation is outside the current operating window. Retained history remains readable, but new actions are disabled.",
      latestOperation, refreshAction);
  }
  if (snapshot.status !== "current" || snapshot.mode !== "live") {
    return projection("degraded", "Degraded", "warn", "current", latestOperation ? "retained" : "unavailable", false, false,
      "Only part of the OOS operation projection is current. Retained truth remains visible, but new actions are disabled.",
      latestOperation, nextAction);
  }
  if (latestOperation && new Set(["requested", "queued", "running"]).has(latestOperation.state)) {
    return projection("recovering", "Recovering", "info", "current", "recovering", false, true,
      "OOS retained an operation that has not reached terminal owner readback. The Console is reconciling it.",
      latestOperation, nextAction);
  }
  if (latestOperation && new Set(["blocked", "failed"]).has(latestOperation.state)) {
    return projection("degraded", "Degraded", latestOperation.state === "failed" ? "danger" : "warn", "current", "retained", false, true,
      "The latest durable operation needs the projected owner next action before this workspace is ready.",
      latestOperation, nextAction);
  }
  return projection("ready", "Ready", "ok", "current", "current", true, true,
    "The OOS catalog is current and no retained operation is waiting for owner recovery.",
    latestOperation, nextAction);
}

function projection(
  state: PlatformRuntimeReadiness["state"],
  label: PlatformRuntimeReadiness["label"],
  tone: PlatformRuntimeReadiness["tone"],
  catalogState: PlatformRuntimeReadiness["catalogState"],
  operationState: PlatformRuntimeReadiness["operationState"],
  ready: boolean,
  actionable: boolean,
  detail: string,
  latestOperation: PlatformOperationRecord | null,
  nextAction: PlatformRuntimeReadiness["nextAction"],
): PlatformRuntimeReadiness {
  return { actionable, catalogState, detail, label, latestOperation, nextAction, operationState, ready, state, tone };
}
