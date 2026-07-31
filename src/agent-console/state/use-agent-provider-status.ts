"use client";

import { useEffect, useState } from "react";

import {
  isAgentProviderStatus,
  retainStaleAgentProviderObservation,
  type AgentProviderStatus,
} from "../model/agent-provider-status";

const LIVE_POLL_INTERVAL_MS = 10_000;
const OFFLINE_POLL_INTERVAL_MS = 20_000;
const FAILED_POLL_INTERVAL_MS = 15_000;
const MAX_FAILED_POLL_INTERVAL_MS = 60_000;

export function useAgentProviderStatus() {
  const [providerStatus, setProviderStatus] =
    useState<AgentProviderStatus | null>(null);

  useEffect(() => {
    let active = true;
    let currentStatus: AgentProviderStatus | null = null;
    let failureCount = 0;
    let inFlight = false;
    let pollController: AbortController | null = null;
    let timeoutId: number | null = null;

    function clearScheduledPoll() {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    function scheduleProviderStatus(delayMs: number) {
      if (!active) {
        return;
      }

      clearScheduledPoll();
      timeoutId = window.setTimeout(() => {
        void loadProviderStatus();
      }, delayMs);
    }

    function failedPollDelay() {
      return Math.min(
        FAILED_POLL_INTERVAL_MS * 2 ** Math.max(0, failureCount - 1),
        MAX_FAILED_POLL_INTERVAL_MS,
      );
    }

    async function loadProviderStatus() {
      if (
        !active ||
        inFlight ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      inFlight = true;
      pollController = new AbortController();
      let nextPollDelay = LIVE_POLL_INTERVAL_MS;

      try {
        const response = await fetch(
          `/api/agent-interaction?probe=${Date.now()}`,
          {
            cache: "no-store",
            signal: pollController.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`provider probe failed with ${response.status}`);
        }

        const payload = (await response.json()) as unknown;

        if (!isAgentProviderStatus(payload)) {
          throw new Error("provider probe returned an invalid observation");
        }

        currentStatus = payload;
        failureCount = 0;
        nextPollDelay =
          payload.status === "online"
            ? LIVE_POLL_INTERVAL_MS
            : OFFLINE_POLL_INTERVAL_MS;
        setProviderStatus(payload);
      } catch (error) {
        if (
          !active ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }

        failureCount += 1;
        nextPollDelay = failedPollDelay();
        currentStatus = retainStaleAgentProviderObservation({
          checkedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
          previous: currentStatus,
        });
        setProviderStatus(currentStatus);
      } finally {
        inFlight = false;
        pollController = null;

        if (active) {
          scheduleProviderStatus(nextPollDelay);
        }
      }
    }

    function requestProviderStatus() {
      if (
        active &&
        !inFlight &&
        document.visibilityState === "visible"
      ) {
        clearScheduledPoll();
        void loadProviderStatus();
      }
    }

    void loadProviderStatus();
    window.addEventListener("focus", requestProviderStatus);
    document.addEventListener("visibilitychange", requestProviderStatus);

    return () => {
      active = false;
      clearScheduledPoll();
      pollController?.abort();
      window.removeEventListener("focus", requestProviderStatus);
      document.removeEventListener(
        "visibilitychange",
        requestProviderStatus,
      );
    };
  }, []);

  return providerStatus;
}
