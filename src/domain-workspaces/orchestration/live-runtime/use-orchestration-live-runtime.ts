"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OrchestrationRunControlInput, OrchestrationRunControlReceipt } from "../work-model/run-control/run-control-types.ts";
import { assertOosOrchestrationDefinitions, assertOosOrchestrationRun, assertOosOrchestrationRuns } from "./orchestration-live-contract.ts";
import { projectLiveOrchestrationWorkspace, unavailableOrchestrationWorkspace } from "./orchestration-live-projection.ts";
import type { OrchestrationLiveSnapshot } from "./orchestration-live-types.ts";

const initial: OrchestrationLiveSnapshot = { error: null, mode: "unavailable", observedAt: new Date(0).toISOString(), readModel: unavailableOrchestrationWorkspace("Loading current OOS orchestration truth."), status: "loading" };

export function useOrchestrationLiveRuntime() {
  const [snapshot, setSnapshot] = useState(initial);
  const pendingRequestIds = useRef(new Map<string, string>());
  const load = useCallback(async () => {
    try {
      const source = record(await jsonRequest("/api/orchestration"));
      if (source.mode === "disconnected-preview") {
        const next = { ...initial, mode: "disconnected-preview" as const, observedAt: text(source.observedAt), status: "current" as const };
        setSnapshot(next); return next;
      }
      const observedAt = text(source.observedAt);
      const readModel = projectLiveOrchestrationWorkspace(assertOosOrchestrationDefinitions({ schema_version: 1, definitions: source.definitions }), assertOosOrchestrationRuns({ schema_version: 1, runs: source.runs }), observedAt);
      const next: OrchestrationLiveSnapshot = { error: null, mode: "live", observedAt, readModel, status: "current" };
      setSnapshot(next); return next;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Orchestration owner truth is unavailable.";
      const next: OrchestrationLiveSnapshot = { error: { code: "orchestration_unavailable", message }, mode: "unavailable", observedAt: new Date().toISOString(), readModel: unavailableOrchestrationWorkspace(message), status: "offline" };
      setSnapshot((current) => ({ ...current, error: next.error, mode: "unavailable", observedAt: next.observedAt, readModel: unavailableOrchestrationWorkspace(message, current.readModel), status: "offline" })); return next;
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const control = useCallback(async (runId: string, input: OrchestrationRunControlInput): Promise<OrchestrationRunControlReceipt> => {
    const requestKey = `${runId}:${stableJson(input)}`;
    const requestId = retainedRequestId(pendingRequestIds.current, requestKey);
    const run = assertOosOrchestrationRun(await jsonRequest(`/api/orchestration/runs/${encodeURIComponent(runId)}/controls`, { body: JSON.stringify({ action: input.controlId, intent: input, requestId }), headers: { "Content-Type": "application/json" }, method: "POST" }));
    pendingRequestIds.current.delete(requestKey);
    await load();
    const aggregate = run.aggregate_receipt && typeof run.aggregate_receipt === "object" ? run.aggregate_receipt as Record<string, unknown> : null;
    const retainedControl = Array.isArray(run.controls) ? run.controls.find((candidate) => record(candidate).control_id === `console-control:${requestId}`) as Record<string, unknown> | undefined : undefined;
    return { controlId: input.controlId, effectPosture: ["none", "partial", "possible", "verified"].includes(String(run.effect_posture)) ? run.effect_posture as "none" | "partial" | "possible" | "verified" : "none", idempotencyKey: typeof retainedControl?.idempotency_key === "string" ? retainedControl.idempotency_key : `console-control-idempotency:${requestId}`, receiptId: aggregate && typeof aggregate.receipt_id === "string" ? aggregate.receipt_id : typeof retainedControl?.control_id === "string" ? retainedControl.control_id : `console-control:${requestId}`, recordedAt: typeof retainedControl?.recorded_at === "string" ? retainedControl.recorded_at : typeof run.last_projected_at === "string" ? run.last_projected_at : new Date().toISOString(), resultState: "recorded", resultingRunState: run.state, runId: run.run_id, schemaVersion: 1, summary: "OOS retained the digest-bound run control and returned current run truth." };
  }, [load]);
  return { control, load, snapshot };
}

async function jsonRequest(url: string, init: RequestInit = {}) { const response = await fetch(url, { ...init, cache: "no-store" }); const body = await response.json().catch(() => null); if (!response.ok) { const source = record(body); throw new Error(typeof source.error === "string" ? source.error : "Orchestration request failed."); } return body; }
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Orchestration response is malformed."); return value as Record<string, unknown>; }
function text(value: unknown) { if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new Error("Orchestration observation time is malformed."); return value; }
function retainedRequestId(requests: Map<string, string>, key: string) { const existing = requests.get(key); if (existing) return existing; const created = crypto.randomUUID(); requests.set(key, created); return created; }
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`; return JSON.stringify(value); }
