"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  assertModelOperationsLiveSnapshot,
  assertModelProfileRequestProjection,
  isModelOperationsLiveApiError,
} from "./model-operations-live-contract.ts";
import type {
  ModelOperationsLiveSnapshot,
  ModelProfileRequestDraft,
} from "./model-operations-live-types.ts";

const pollIntervalMs = 15_000;

export function useModelOperationsLiveRuntime() {
  const [snapshot, setSnapshot] = useState<ModelOperationsLiveSnapshot | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshSequence = useRef(0);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    const response = await fetch("/api/model-operations", { cache: "no-store" });
    const body: unknown = await response.json().catch(() => null);
    const next = response.ok
      ? assertModelOperationsLiveSnapshot(body)
      : offlineSnapshot(body);
    if (sequence === refreshSequence.current) setSnapshot(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    void refresh().catch((cause) => {
      if (active) setSnapshot(offlineSnapshot(cause));
    });
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh().catch(() => undefined);
    }, pollIntervalMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  const submitCreate = useCallback(
    async (draft: ModelProfileRequestDraft) => {
      setPending(true);
      setError(null);
      try {
        const response = await fetch("/api/model-operations", {
          body: JSON.stringify(draft),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw clientError(body);
        const result = assertModelProfileRequestProjection(body);
        await refresh();
        return result;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Model-profile request failed.";
        setError(message);
        throw cause;
      } finally {
        setPending(false);
      }
    },
    [refresh],
  );

  return { error, pending, refresh, snapshot, submitCreate };
}

function offlineSnapshot(value: unknown): ModelOperationsLiveSnapshot {
  return {
    error: isModelOperationsLiveApiError(value)
      ? value.error
      : value instanceof Error
        ? value.message
        : "Model Operations could not reconcile OOS and Platform authority.",
    mode: "live",
    observedAt: new Date().toISOString(),
    readModel: null,
    requests: [],
    source: null,
    status: "offline",
  };
}

function clientError(value: unknown) {
  return new Error(
    isModelOperationsLiveApiError(value)
      ? value.error
      : "Model-profile request failed.",
  );
}
