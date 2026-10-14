"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { assertPlatformOperationCatalog, assertPlatformOperationList, assertPlatformOperationRecord } from "./platform-operation-contract.ts";
import type { PlatformOperationRecord, PlatformOperationsLiveSnapshot } from "./platform-operation-types.ts";

const initialSnapshot: PlatformOperationsLiveSnapshot = { catalog: null, error: null, mode: "unavailable", observedAt: new Date(0).toISOString(), operations: [], status: "loading" };

export function usePlatformOperationsRuntime() {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const pendingRequestIds = useRef(new Map<string, string>());
  const load = useCallback(async () => {
    try {
      const body = record(await jsonRequest("/api/environment-operations", { cache: "no-store" }));
      if (body.mode === "disconnected-preview") {
        const next = { ...initialSnapshot, mode: "disconnected-preview" as const, observedAt: text(body.observedAt), status: "current" as const };
        setSnapshot(next);
        return next;
      }
      const operations = assertPlatformOperationList({ workflow_id: "platform-operation-list", operations: body.operations });
      if (body.status === "partial") {
        const sourceError = record(body.error);
        const next: PlatformOperationsLiveSnapshot = {
          catalog: body.catalog === null ? null : assertPlatformOperationCatalog(body.catalog),
          error: { code: typeof sourceError.code === "string" ? sourceError.code : "platform_operation_projection_partial", message: typeof sourceError.message === "string" ? sourceError.message : "Part of the Platform operation projection is unavailable." },
          mode: "unavailable",
          observedAt: text(body.observedAt),
          operations,
          status: "offline",
        };
        setSnapshot(next);
        return next;
      }
      const next: PlatformOperationsLiveSnapshot = {
        catalog: assertPlatformOperationCatalog(body.catalog),
        error: null,
        mode: "live",
        observedAt: text(body.observedAt),
        operations,
        status: "current",
      };
      setSnapshot(next);
      return next;
    } catch (caught) {
      const error = normalizeError(caught);
      const next: PlatformOperationsLiveSnapshot = { ...initialSnapshot, error, mode: "unavailable", observedAt: new Date().toISOString(), status: "offline" };
      setSnapshot((current) => ({ ...current, error, mode: "unavailable", observedAt: next.observedAt, status: "offline" }));
      return next;
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = useCallback(async (subjectRef: string, capabilityId: string, input: Record<string, unknown> = {}) => {
    const requestKey = `submit:${subjectRef}:${capabilityId}:${stableJson(input)}`;
    const requestId = retainedRequestId(pendingRequestIds.current, requestKey);
    const operation = assertPlatformOperationRecord(await jsonRequest("/api/environment-operations", {
      body: JSON.stringify({ capabilityId, input, requestId, subjectRef }),
      headers: { "Content-Type": "application/json" }, method: "POST",
    }));
    pendingRequestIds.current.delete(requestKey);
    upsert(setSnapshot, operation);
    return operation;
  }, []);

  const control = useCallback(async (operationId: string, action: "cancel" | "retry", reason: string) => {
    const requestKey = `control:${operationId}:${action}:${reason}`;
    const requestId = retainedRequestId(pendingRequestIds.current, requestKey);
    const operation = assertPlatformOperationRecord(await jsonRequest(`/api/environment-operations/${encodeURIComponent(operationId)}/controls`, {
      body: JSON.stringify({ action, reason, requestId }),
      headers: { "Content-Type": "application/json" }, method: "POST",
    }));
    pendingRequestIds.current.delete(requestKey);
    upsert(setSnapshot, operation);
    return operation;
  }, []);

  return { control, load, snapshot, submit };
}

function upsert(setSnapshot: React.Dispatch<React.SetStateAction<PlatformOperationsLiveSnapshot>>, operation: PlatformOperationRecord) {
  setSnapshot((current) => ({ ...current, operations: [operation, ...current.operations.filter((candidate) => candidate.operation_id !== operation.operation_id)] }));
}
async function jsonRequest(url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const source = record(body);
    throw new Error(typeof source.error === "string" ? source.error : "Platform operation request failed.");
  }
  return body;
}
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Platform operation response is malformed."); return value as Record<string, unknown>; }
function text(value: unknown) { if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new Error("Platform operation observation time is malformed."); return value; }
function normalizeError(value: unknown) { return { code: "platform_operation_unavailable", message: value instanceof Error ? value.message : "Platform operations are unavailable." }; }
function retainedRequestId(requests: Map<string, string>, key: string) { const existing = requests.get(key); if (existing) return existing; const created = crypto.randomUUID(); requests.set(key, created); return created; }
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`; return JSON.stringify(value); }
