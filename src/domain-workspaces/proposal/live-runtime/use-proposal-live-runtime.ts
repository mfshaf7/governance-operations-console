"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  assertProposalLiveSnapshot,
  assertProposalOosCommandResult,
  assertProposalOosHandoffApplicationResult,
  assertProposalTargetApplicationResult,
  isProposalLiveApiError,
} from "./proposal-live-contract.ts";
import type {
  ProposalLiveCaptureRequest,
  ProposalLiveCommandRequest,
  ProposalLiveHandoffApplicationRequest,
  ProposalLiveSnapshot,
  ProposalOosCommandResult,
  ProposalOosHandoffApplicationResult,
  ProposalLiveTargetApplicationRequest,
  ProposalTargetApplicationResult,
} from "./proposal-live-types.ts";

const proposalPollIntervalMs = 15_000;

export function useProposalLiveRuntime() {
  const [snapshot, setSnapshot] = useState<ProposalLiveSnapshot | null>(null);
  const [targetApplications, setTargetApplications] = useState<
    Record<string, ProposalTargetApplicationResult>
  >({});
  const [targetApplicationErrors, setTargetApplicationErrors] = useState<
    Record<string, string | null>
  >({});
  const [targetApplicationPending, setTargetApplicationPending] = useState<
    Record<string, boolean>
  >({});
  const refreshSequence = useRef(0);
  const request = useRef<Promise<ProposalLiveSnapshot> | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async (afterMutation = false) => {
    if (request.current) {
      if (!afterMutation) return request.current;
      await request.current;
    }
    const operation = (async () => {
    const sequence = ++refreshSequence.current;
    let next: ProposalLiveSnapshot;
    let denied = false;
    try {
      const response = await fetch("/api/proposals", { cache: "no-store" });
      denied = response.status === 401 || response.status === 403;
      const body: unknown = await response.json().catch(() => null);
      next = response.ok ? assertProposalLiveSnapshot(body) : proposalOfflineSnapshot(body);
    } catch (error) {
      next = proposalOfflineSnapshot(error);
    }
    if (mounted.current && sequence === refreshSequence.current) {
      setSnapshot(current => !denied && next.status === "offline" && current?.mode === "live" ? {
        ...next, observedAt: current.observedAt,
        records: current.records.map(record => ({ ...record, projection: { ...record.projection, projection_state: "stale" as const } })),
        error: `${next.error ?? "Owner unavailable."} Previously verified records are read-only.`,
      } : next);
    }
    return next;
    })();
    request.current = operation;
    try { return await operation; }
    finally { if (request.current === operation) request.current = null; }
  }, []);

  useEffect(() => {
    mounted.current = true;
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
      mounted.current = false;
      refreshSequence.current++;
      request.current = null;
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
        await refresh(true);
        throw proposalClientError(body);
      }
      const result = body as { proposalId?: unknown };
      if (typeof result.proposalId !== "string") {
        throw new Error("Proposal capture did not return a proposal identity.");
      }
      await refresh(true);
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
        await refresh(true);
        throw proposalClientError(body);
      }
      const result = assertProposalOosCommandResult(body);
      await refresh(true);
      return result;
    },
    [refresh],
  );

  const applyDeliveryHandoff = useCallback(
    async (
      request: ProposalLiveHandoffApplicationRequest,
    ): Promise<ProposalOosHandoffApplicationResult> => {
      const response = await fetch(
        `/api/proposals/${encodeURIComponent(request.proposalId)}/handoff/apply`,
        {
          body: JSON.stringify(request),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        await refresh(true);
        throw proposalClientError(body);
      }
      const result = assertProposalOosHandoffApplicationResult(body);
      await refresh(true);
      return result;
    },
    [refresh],
  );

  const targetApplicationCommand = useCallback(
    async (
      proposalId: string,
      method: "DELETE" | "POST",
      input?:
        | (ProposalLiveTargetApplicationRequest & { action: "start" })
        | { action: "continue" },
    ) => {
      setTargetApplicationPending((current) => ({
        ...current,
        [proposalId]: true,
      }));
      try {
        const response = await fetch(
          `/api/proposals/${encodeURIComponent(proposalId)}/target-application`,
          {
            ...(input ? { body: JSON.stringify(input) } : {}),
            headers: { "Content-Type": "application/json" },
            method,
          },
        );
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw proposalClientError(body);
        const result = assertProposalTargetApplicationResult(body);
        setTargetApplications((current) => ({
          ...current,
          [proposalId]: result,
        }));
        setTargetApplicationErrors((current) => ({
          ...current,
          [proposalId]: null,
        }));
        if (result.status === "succeeded") await refresh(true);
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Target application failed.";
        setTargetApplicationErrors((current) => ({
          ...current,
          [proposalId]: message,
        }));
        throw error;
      } finally {
        setTargetApplicationPending((current) => ({
          ...current,
          [proposalId]: false,
        }));
      }
    },
    [refresh],
  );

  const startTargetApplication = useCallback(
    (request: ProposalLiveTargetApplicationRequest) =>
      targetApplicationCommand(request.proposalId, "POST", {
        ...request,
        action: "start",
      }),
    [targetApplicationCommand],
  );
  const continueTargetApplication = useCallback(
    (proposalId: string) =>
      targetApplicationCommand(proposalId, "POST", { action: "continue" }),
    [targetApplicationCommand],
  );
  const cancelTargetApplication = useCallback(
    (proposalId: string) => targetApplicationCommand(proposalId, "DELETE"),
    [targetApplicationCommand],
  );
  return {
    applyDeliveryHandoff,
    cancelTargetApplication,
    capture,
    command,
    continueTargetApplication,
    refresh,
    snapshot,
    startTargetApplication,
    targetApplicationErrors,
    targetApplicationPending,
    targetApplications,
  };
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
