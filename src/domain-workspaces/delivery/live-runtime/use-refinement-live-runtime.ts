"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { DeliveryPackageSummary } from "../read-model/index.ts";
import { deliveryLivePackageRef } from "./delivery-live-identity.ts";
import {
  assertRefinementOosAssistResult,
  assertRefinementOosRun,
  assertRefinementProjectionSnapshot,
  isRefinementLiveApiError,
  refinementPacketFromProjection,
} from "./refinement-live-contract.ts";
import type {
  RefinementApplyCommand,
  RefinementAssistCommand,
  RefinementOosAssistResult,
  RefinementOosRun,
  RefinementProjectionSnapshot,
} from "./refinement-live-types.ts";

export class RefinementLiveRuntimeError extends Error {
  readonly code: string;

  constructor(message: string, code = "refinement_live_request_failed") {
    super(message);
    this.code = code;
  }
}

export function useRefinementLiveRuntime(
  deliveryPackage: Pick<DeliveryPackageSummary, "legacy_epic_id">,
) {
  const packageRef = deliveryLivePackageRef(deliveryPackage);
  const [snapshot, setSnapshot] = useState<RefinementProjectionSnapshot | null>(null);
  const [activeRun, setActiveRun] = useState<RefinementOosRun | null>(null);
  const [advisorEvidence, setAdvisorEvidence] = useState<
    Array<{ gatewayAuditRef: string; responseId: string }>
  >([]);
  const snapshotRef = useRef<RefinementProjectionSnapshot | null>(null);
  const pendingRefresh = useRef<Promise<RefinementProjectionSnapshot> | null>(null);

  const refresh = useCallback(async () => {
    if (pendingRefresh.current) return pendingRefresh.current;
    const operation = fetch(
      `/api/delivery/refinement/${encodeURIComponent(packageRef)}/projection`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw refinementClientError(body);
        return assertRefinementProjectionSnapshot(body);
      })
      .then((next) => {
        snapshotRef.current = next;
        setSnapshot(next);
        setActiveRun(next.projection?.active_run ?? next.projection?.latest_run ?? null);
        return next;
      })
      .finally(() => {
        pendingRefresh.current = null;
      });
    pendingRefresh.current = operation;
    return operation;
  }, [packageRef]);

  useEffect(() => {
    snapshotRef.current = null;
    setSnapshot(null);
    setActiveRun(null);
    setAdvisorEvidence([]);
    void refresh().catch((error) => {
      const next: RefinementProjectionSnapshot = {
        error: error instanceof Error ? error.message : "Refinement projection failed.",
        mode: "live",
        observedAt: new Date().toISOString(),
        projection: null,
        status: "offline",
      };
      snapshotRef.current = next;
      setSnapshot(next);
    });
  }, [packageRef, refresh]);

  const advise = useCallback(
    async (command: RefinementAssistCommand) => {
      const current = await currentSnapshot(snapshotRef.current, refresh);
      if (current.mode === "disconnected-preview") {
        return { mode: current.mode, result: null } as const;
      }
      const response = await fetch(
        `/api/delivery/refinement/${encodeURIComponent(packageRef)}/assist`,
        {
          body: JSON.stringify(command),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        await refresh().catch(() => undefined);
        throw refinementClientError(body);
      }
      const result = assertRefinementOosAssistResult(body);
      rememberAdvisorEvidence(result, setAdvisorEvidence);
      return { mode: current.mode, result } as const;
    },
    [packageRef, refresh],
  );

  const apply = useCallback(
    async (command: RefinementApplyCommand) => {
      const current = await currentSnapshot(snapshotRef.current, refresh);
      if (current.mode === "disconnected-preview") {
        return { mode: current.mode, run: null } as const;
      }
      if (current.projection?.latest_run?.state === "completed") {
        return { mode: current.mode, run: current.projection.latest_run } as const;
      }
      const existingRun = current.projection?.active_run;
      const run = existingRun ?? (await startRun(packageRef, command));
      setActiveRun(run);
      const terminalRun = await waitForTerminalRun(packageRef, run, setActiveRun);
      if (terminalRun.state !== "completed") {
        throw new RefinementLiveRuntimeError(
          terminalRun.failure?.message || `Refinement apply ${terminalRun.state}.`,
          terminalRun.failure?.code || `refinement_apply_${terminalRun.state}`,
        );
      }
      const next = await refresh();
      const projectedRun = [
        next.projection?.active_run,
        next.projection?.latest_run,
        ...(next.projection?.history ?? []),
      ].find((candidate) => candidate?.run_id === terminalRun.run_id);
      if (
        !projectedRun ||
        projectedRun.state !== "completed" ||
        projectedRun.receipt?.receipt_digest !==
          terminalRun.receipt?.receipt_digest
      ) {
        throw new RefinementLiveRuntimeError(
          "Refinement apply completed but exact canonical run readback is unavailable.",
          "refinement_apply_readback_unavailable",
        );
      }
      return { mode: current.mode, run: projectedRun } as const;
    },
    [packageRef, refresh],
  );

  return {
    activeRun,
    advisorEvidence,
    advise,
    apply,
    loading: snapshot === null,
    mode: snapshot?.mode ?? "live",
    packet: snapshot?.projection
      ? refinementPacketFromProjection(snapshot.projection)
      : null,
    projection: snapshot?.projection ?? null,
    projectionError: snapshot?.error ?? null,
    projectionStatus: snapshot?.status ?? "offline",
    refresh,
  };
}

async function startRun(packageRef: string, command: RefinementApplyCommand) {
  const response = await fetch(
    `/api/delivery/refinement/${encodeURIComponent(packageRef)}/apply`,
    {
      body: JSON.stringify(command),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw refinementClientError(body);
  return assertRefinementOosRun(body);
}

async function waitForTerminalRun(
  packageRef: string,
  initialRun: RefinementOosRun,
  setActiveRun: Dispatch<SetStateAction<RefinementOosRun | null>>,
) {
  let run = initialRun;
  for (let attempt = 0; attempt < 120 && ["accepted", "running"].includes(run.state); attempt += 1) {
    await delay(500);
    const response = await fetch(
      `/api/delivery/refinement/${encodeURIComponent(packageRef)}/runs/${encodeURIComponent(run.run_id)}`,
      { cache: "no-store" },
    );
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw refinementClientError(body);
    run = assertRefinementOosRun(body);
    setActiveRun(run);
  }
  if (["accepted", "running"].includes(run.state)) {
    throw new RefinementLiveRuntimeError(
      "Refinement apply is still running. Reopen the workflow to recover its durable state.",
      "refinement_apply_poll_timeout",
    );
  }
  return run;
}

async function currentSnapshot(
  current: RefinementProjectionSnapshot | null,
  refresh: () => Promise<RefinementProjectionSnapshot>,
) {
  const snapshot = current ?? (await refresh());
  if (snapshot.mode === "live" && snapshot.status !== "current") {
    throw new RefinementLiveRuntimeError(
      snapshot.error || "Canonical Refinement projection is unavailable.",
      "refinement_projection_unavailable",
    );
  }
  return snapshot;
}

function rememberAdvisorEvidence(
  result: RefinementOosAssistResult,
  setAdvisorEvidence: Dispatch<SetStateAction<Array<{ gatewayAuditRef: string; responseId: string }>>>,
) {
  setAdvisorEvidence((current) => current.some((item) => item.responseId === result.response_id)
    ? current
    : [...current, { gatewayAuditRef: result.evidence.gateway_audit_ref, responseId: result.response_id }]);
}

function refinementClientError(value: unknown) {
  return new RefinementLiveRuntimeError(
    isRefinementLiveApiError(value)
      ? value.error
      : "Governed Refinement request failed.",
    isRefinementLiveApiError(value) ? value.code : undefined,
  );
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
