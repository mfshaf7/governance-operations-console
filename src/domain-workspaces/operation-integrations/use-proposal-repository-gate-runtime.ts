"use client";

import { useState } from "react";
import { useProposalLiveRuntime } from "../proposal/live-runtime/use-proposal-live-runtime.ts";
import { assertProposalOosCommandResult } from "../proposal/live-runtime/proposal-live-contract.ts";
import type { ProposalRepositoryResolutionIntent } from "../operation-contracts/proposal-repository-live.ts";
import { projectCanonicalRepositoryGateRequests } from "./proposal-repository-live-projection.ts";

export function useProposalRepositoryGateRuntime() {
  const runtime = useProposalLiveRuntime();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function resolve(intent: ProposalRepositoryResolutionIntent) {
    if (pending) return;
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/proposals/${encodeURIComponent(intent.proposalId)}/repository-resolution`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(intent),
      });
      const value: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof value === "object" && value && "error" in value ? String(value.error) : "Repository acknowledgement is unavailable; refresh and retry the same reviewed request.");
      assertProposalOosCommandResult(value);
      await runtime.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Repository gate resolution failed.");
      await runtime.refresh().catch(() => undefined);
    } finally { setPending(false); }
  }
  return { mode: runtime.snapshot?.mode, status: runtime.snapshot?.status ?? "loading", error: error ?? runtime.snapshot?.error,
    requests: projectCanonicalRepositoryGateRequests(runtime.snapshot), pending, resolve };
}
