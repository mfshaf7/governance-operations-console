"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  assertProposalLiveSnapshot,
  assertProposalOosCommandResult,
  isProposalLiveApiError,
} from "./proposal-live-contract.ts";
import type {
  ProposalLiveCaptureRequest,
  ProposalLiveCommandRequest,
  ProposalLiveSnapshot,
  ProposalOosCommandResult,
} from "./proposal-live-types.ts";

const proposalPollIntervalMs = 15_000;

export function useProposalLiveRuntime() {
  const [snapshot, setSnapshot] = useState<ProposalLiveSnapshot | null>(null);
  const refreshSequence = useRef(0);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    const response = await fetch("/api/proposals", { cache: "no-store" });
    const body: unknown = await response.json().catch(() => null);
    const next = response.ok
      ? assertProposalLiveSnapshot(body)
      : proposalOfflineSnapshot(body);
    if (sequence === refreshSequence.current) {
      setSnapshot(next);
    }
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    void refresh().catch((error) => {
      if (active) setSnapshot(proposalOfflineSnapshot(error));
    });
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh().catch(() => undefined);
      }
    }, proposalPollIntervalMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  const capture = useCallback(
    async (request: ProposalLiveCaptureRequest) => {
      const response = await fetch("/api/proposals", {
        body: JSON.stringify(request),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        await refresh();
        throw proposalClientError(body);
      }
      const result = body as { proposalId?: unknown };
      if (typeof result.proposalId !== "string") {
        throw new Error("Proposal capture did not return a proposal identity.");
      }
      await refresh();
      return result.proposalId;
    },
    [refresh],
  );

  const command = useCallback(
    async (request: ProposalLiveCommandRequest): Promise<ProposalOosCommandResult> => {
      const response = await fetch(
        `/api/proposals/${encodeURIComponent(request.proposalId)}/commands`,
        {
          body: JSON.stringify(request),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        await refresh();
        throw proposalClientError(body);
      }
      const result = assertProposalOosCommandResult(body);
      await refresh();
      return result;
    },
    [refresh],
  );

  return { capture, command, refresh, snapshot };
}

function proposalOfflineSnapshot(value: unknown): ProposalLiveSnapshot {
  const error = isProposalLiveApiError(value)
    ? value.error
    : value instanceof Error
      ? value.message
      : "OOS could not provide canonical Proposal state.";
  return {
    error,
    mode: "live",
    observedAt: new Date().toISOString(),
    records: [],
    status: "offline",
  };
}

function proposalClientError(value: unknown) {
  return new Error(
    isProposalLiveApiError(value) ? value.error : "Proposal command failed.",
  );
}
