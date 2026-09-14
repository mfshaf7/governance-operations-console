"use client";

import { useCallback, useRef, useState } from "react";

import type { PrototypeRecord } from "../read-model/prototype-workspace-read-model.ts";
import {
  clearPrototypeClosureRequestPointer,
  readPrototypeClosureRequestPointer,
  writePrototypeClosureRequestPointer,
} from "../local-runtime/prototype-closure-request-pointer.ts";
import {
  assertPrototypeClosureIntent,
  assertPrototypeClosurePreparation,
  assertPrototypeClosureResult,
} from "./prototype-closure-live-contract.ts";
import type {
  PrototypeClosureAction,
  PrototypeClosureApiError,
  PrototypeClosurePreparation,
  PrototypeClosureRequestFields,
  PrototypeClosureResult,
} from "./prototype-closure-live-types.ts";

export class PrototypeClosureClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

export function prototypeClosureId(record: PrototypeRecord) {
  const sourceMatch = /^prototypes\.yaml\/([a-z0-9][a-z0-9-]*)$/.exec(record.sourceRef);
  return sourceMatch?.[1] ?? record.id.replace(/^prototype-/, "");
}

export function usePrototypeClosureLiveRuntime() {
  const [preparations, setPreparations] = useState<Record<string, PrototypeClosurePreparation>>({});
  const [results, setResults] = useState<Record<string, PrototypeClosureResult>>({});
  const [errors, setErrors] = useState<Record<string, PrototypeClosureClientError | null>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const identities = useRef(new Map<string, string>());

  const load = useCallback(async (record: PrototypeRecord) => {
    setPending((current) => ({ ...current, [record.id]: true }));
    try {
      const preparation = assertPrototypeClosurePreparation(await api(
        "/api/prototypes/closures/preparations", {
          method: "POST", body: JSON.stringify({ prototype_id: prototypeClosureId(record) }),
        },
      ));
      setPreparations((current) => ({ ...current, [record.id]: preparation }));
      setErrors((current) => ({ ...current, [record.id]: null }));
      const pendingRequestId = readPrototypeClosureRequestPointer(preparation.prototype_id);
      if (pendingRequestId) {
        try {
          const result = assertPrototypeClosureResult(await api(requestPath(pendingRequestId),
            { method: "GET" }), pendingRequestId);
          if (result.prototype_id !== preparation.prototype_id) {
            throw new PrototypeClosureClientError("prototype_closure_recovery_mismatch",
              "Stored Closure request belongs to a different Prototype.", false);
          }
          setResults((current) => ({ ...current, [record.id]: result }));
        } catch (error) {
          if (error instanceof PrototypeClosureClientError && error.code === "prototype_closure_not_found") {
            clearPrototypeClosureRequestPointer(preparation.prototype_id);
          } else {
            throw error;
          }
        }
      }
      return preparation;
    } catch (error) {
      const failure = asClientError(error);
      setErrors((current) => ({ ...current, [record.id]: failure }));
      throw failure;
    } finally {
      setPending((current) => ({ ...current, [record.id]: false }));
    }
  }, []);

  const retain = useCallback((record: PrototypeRecord, result: PrototypeClosureResult) => {
    setResults((current) => ({ ...current, [record.id]: result }));
    setErrors((current) => ({ ...current, [record.id]: null }));
    return result;
  }, []);

  const submit = useCallback(async (record: PrototypeRecord, action: PrototypeClosureAction,
    fields: PrototypeClosureRequestFields, preparation: PrototypeClosurePreparation) => {
    const inputKey = JSON.stringify([record.id, action, fields,
      preparation.authority_revision, preparation.expected_state.record_digest]);
    let requestId = identities.current.get(inputKey);
    if (!requestId) {
      requestId = `prototype-closure-request:${prototypeClosureId(record)}:${crypto.randomUUID()}`;
      identities.current.set(inputKey, requestId);
    }
    const intent = assertPrototypeClosureIntent({ action, fields, preparation, request_id: requestId });
    writePrototypeClosureRequestPointer(preparation.prototype_id, requestId);
    return retain(record, assertPrototypeClosureResult(await api("/api/prototypes/closures/requests", {
      method: "POST", body: JSON.stringify(intent),
    }), requestId));
  }, [retain]);

  const read = useCallback(async (record: PrototypeRecord, requestId: string) =>
    retain(record, assertPrototypeClosureResult(await api(requestPath(requestId), { method: "GET" }), requestId)),
  [retain]);

  const inspect = useCallback(async (requestId: string) =>
    assertPrototypeClosureResult(await api(requestPath(requestId), { method: "GET" }), requestId), []);

  const command = useCallback(async (record: PrototypeRecord, requestId: string,
    action: "continue" | "cancel" | "approve" | "deny") => {
    const decision = action === "approve" || action === "deny";
    const path = `${requestPath(requestId)}/${decision ? "decisions" : action}`;
    return retain(record, assertPrototypeClosureResult(await api(path, {
      method: "POST", body: JSON.stringify(decision ? { decision: action } : {}),
    }), requestId));
  }, [retain]);

  return { command, errors, inspect, load, pending, preparations, read, results, submit };
}

function requestPath(requestId: string) {
  return `/api/prototypes/closures/requests/${encodeURIComponent(requestId)}`;
}

async function api(path: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, cache: "no-store",
      headers: { Accept: "application/json", "Content-Type": "application/json" } });
  } catch {
    throw new PrototypeClosureClientError("prototype_closure_console_unavailable",
      "Prototype Closure could not reach the Console adapter.", true);
  }
  let body: unknown;
  try { body = await response.json(); } catch {
    throw new PrototypeClosureClientError("prototype_closure_response_invalid",
      "Prototype Closure returned an invalid response.", false);
  }
  if (!response.ok) {
    const value = body as Partial<PrototypeClosureApiError> | null;
    throw new PrototypeClosureClientError(value?.code ?? "prototype_closure_failed",
      value?.error ?? "Prototype Closure could not complete this action.", value?.retryable === true);
  }
  return body;
}

function asClientError(error: unknown) {
  return error instanceof PrototypeClosureClientError ? error :
    new PrototypeClosureClientError("prototype_closure_projection_invalid",
      error instanceof Error ? error.message : "Closure authority projection is invalid.", false);
}
