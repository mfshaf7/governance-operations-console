"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  assertLifecycleTransitionLiveSnapshot,
  isLifecycleTransitionLiveApiError,
} from "./lifecycle-transition-live-contract.ts";
import type {
  LifecycleTransitionLiveSnapshot,
} from "./lifecycle-transition-live-types.ts";

const pollIntervalMs = 15_000;

export function useLifecycleTransitionLiveRuntime() {
  const [snapshot, setSnapshot] =
    useState<LifecycleTransitionLiveSnapshot | null>(null);
  const refreshSequence = useRef(0);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    const response = await fetch("/api/lifecycle-transitions", {
      cache: "no-store",
    });
    const body: unknown = await response.json().catch(() => null);
    const next = response.ok
      ? assertLifecycleTransitionLiveSnapshot(body)
      : lifecycleTransitionOfflineSnapshot(body);
    if (sequence === refreshSequence.current) setSnapshot(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    void refresh().catch((error) => {
      if (active) setSnapshot(lifecycleTransitionOfflineSnapshot(error));
    });
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh().catch(() => undefined);
      }
    }, pollIntervalMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { refresh, snapshot };
}

function lifecycleTransitionOfflineSnapshot(
  value: unknown,
): LifecycleTransitionLiveSnapshot {
  const error = isLifecycleTransitionLiveApiError(value)
    ? value.error
    : value instanceof Error
      ? value.message
      : "OOS could not provide canonical Lifecycle Transition state.";
  return {
    error,
    mode: "live",
    observedAt: new Date().toISOString(),
    status: "offline",
    transitions: [],
    truncated: false,
  };
}
