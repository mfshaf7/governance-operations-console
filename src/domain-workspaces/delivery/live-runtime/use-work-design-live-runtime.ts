"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { DeliveryPackageSummary } from "../read-model/index.ts";
import {
  assertWorkDesignOosApplyResult,
  assertWorkDesignOosAssistResult,
  assertWorkDesignProjectionSnapshot,
  isWorkDesignLiveApiError,
  workDesignLivePackageRef,
} from "./work-design-live-contract.ts";
import type {
  WorkDesignApplyCommand,
  WorkDesignContextAssistCommand,
  WorkDesignOosAssistResult,
  WorkDesignProjectionSnapshot,
  WorkDesignTreeAssistCommand,
} from "./work-design-live-types.ts";

export class WorkDesignLiveRuntimeError extends Error {
  readonly code: string;

  constructor(message: string, code = "work_design_live_request_failed") {
    super(message);
    this.code = code;
  }
}

export function useWorkDesignLiveRuntime(
  deliveryPackage: Pick<DeliveryPackageSummary, "legacy_epic_id">,
) {
  const packageRef = workDesignLivePackageRef(deliveryPackage);
  const [snapshot, setSnapshot] = useState<WorkDesignProjectionSnapshot | null>(
    null,
  );
  const [advisorEvidence, setAdvisorEvidence] = useState<
    WorkDesignApplyCommand["advisorEvidence"]
  >([]);
  const snapshotRef = useRef<WorkDesignProjectionSnapshot | null>(null);
  const pendingRefresh = useRef<Promise<WorkDesignProjectionSnapshot> | null>(null);

  const refresh = useCallback(async () => {
    if (pendingRefresh.current) return pendingRefresh.current;
    const operation = fetch(
      `/api/delivery/work-design/${encodeURIComponent(packageRef)}/projection`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw workDesignClientError(body);
        return assertWorkDesignProjectionSnapshot(body);
      })
      .then((next) => {
        snapshotRef.current = next;
        setSnapshot(next);
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
    setAdvisorEvidence([]);
    void refresh().catch((error) => {
      const next: WorkDesignProjectionSnapshot = {
        error: error instanceof Error ? error.message : "Work Design projection failed.",
        mode: "live",
        observedAt: new Date().toISOString(),
        projection: null,
        status: "offline",
      };
      snapshotRef.current = next;
      setSnapshot(next);
    });
  }, [packageRef, refresh]);

  const contextAdvice = useCallback(
    async (command: Omit<WorkDesignContextAssistCommand, "sourceRevision">) => {
      const current = await currentSnapshot(snapshotRef.current, refresh);
      if (current.mode === "disconnected-preview") {
        return { mode: current.mode, result: null } as const;
      }
      let result: WorkDesignOosAssistResult;
      try {
        result = await postAdvice(packageRef, {
          ...command,
          sourceRevision: requiredSourceRevision(current),
          taskKind: "context_advice",
        });
      } catch (error) {
        await refresh().catch(() => undefined);
        throw error;
      }
      rememberAdvisorEvidence(result, setAdvisorEvidence);
      return { mode: current.mode, result } as const;
    },
    [packageRef, refresh],
  );

  const treeAdvice = useCallback(
    async (command: Omit<WorkDesignTreeAssistCommand, "sourceRevision">) => {
      const current = await currentSnapshot(snapshotRef.current, refresh);
      if (current.mode === "disconnected-preview") {
        return { mode: current.mode, result: null } as const;
      }
      let result: WorkDesignOosAssistResult;
      try {
        result = await postAdvice(packageRef, {
          ...command,
          sourceRevision: requiredSourceRevision(current),
          taskKind: "tree_advice",
        });
      } catch (error) {
        await refresh().catch(() => undefined);
        throw error;
      }
      rememberAdvisorEvidence(result, setAdvisorEvidence);
      return { mode: current.mode, result } as const;
    },
    [packageRef, refresh],
  );

  const apply = useCallback(
    async (command: Omit<WorkDesignApplyCommand, "advisorEvidence" | "sourceRevision">) => {
      const current = await currentSnapshot(snapshotRef.current, refresh);
      if (current.mode === "disconnected-preview") {
        return { mode: current.mode, result: null } as const;
      }
      if (current.projection?.state === "applied" && current.projection.latest_application) {
        return {
          mode: current.mode,
          result: current.projection.latest_application,
        } as const;
      }
      if (current.projection?.state === "apply-pending") {
        throw new WorkDesignLiveRuntimeError(
          "Work Design apply is pending backend reconciliation.",
          "work_design_apply_pending",
        );
      }
      const response = await fetch(
        `/api/delivery/work-design/${encodeURIComponent(packageRef)}/apply`,
        {
          body: JSON.stringify({
            ...command,
            advisorEvidence,
            sourceRevision: requiredSourceRevision(current),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        await refresh().catch(() => undefined);
        throw workDesignClientError(body);
      }
      const result = assertWorkDesignOosApplyResult(body);
      await refresh().catch(() => undefined);
      return { mode: current.mode, result } as const;
    },
    [advisorEvidence, packageRef, refresh],
  );

  return {
    apply,
    contextAdvice,
    mode: snapshot?.mode ?? "live",
    projection: snapshot?.projection ?? null,
    projectionError: snapshot?.error ?? null,
    projectionStatus: snapshot?.status ?? "offline",
    refresh,
    treeAdvice,
  };
}

async function currentSnapshot(
  current: WorkDesignProjectionSnapshot | null,
  refresh: () => Promise<WorkDesignProjectionSnapshot>,
) {
  const snapshot = current ?? (await refresh());
  if (snapshot.mode === "live" && snapshot.status !== "current") {
    throw new WorkDesignLiveRuntimeError(
      snapshot.error || "Canonical Work Design projection is unavailable.",
      "work_design_projection_unavailable",
    );
  }
  return snapshot;
}

async function postAdvice(
  packageRef: string,
  command: Record<string, unknown>,
) {
  const response = await fetch(
    `/api/delivery/work-design/${encodeURIComponent(packageRef)}/assist`,
    {
      body: JSON.stringify(command),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw workDesignClientError(body);
  return assertWorkDesignOosAssistResult(body);
}

function rememberAdvisorEvidence(
  result: WorkDesignOosAssistResult,
  setAdvisorEvidence: Dispatch<
    SetStateAction<WorkDesignApplyCommand["advisorEvidence"]>
  >,
) {
  setAdvisorEvidence((current) => {
    if (current.some((item) => item.responseId === result.response_id)) return current;
    return [
      ...current,
      {
        gatewayAuditRef: result.evidence.gateway_audit_ref,
        responseId: result.response_id,
      },
    ];
  });
}

function requiredSourceRevision(snapshot: WorkDesignProjectionSnapshot) {
  const revision = snapshot.projection?.source.revision;
  if (!revision) {
    throw new WorkDesignLiveRuntimeError(
      "Canonical Work Design source revision is unavailable.",
      "work_design_source_revision_unavailable",
    );
  }
  return revision;
}

function workDesignClientError(value: unknown) {
  return new WorkDesignLiveRuntimeError(
    isWorkDesignLiveApiError(value)
      ? value.error
      : "Governed Work Design request failed.",
    isWorkDesignLiveApiError(value) ? value.code : undefined,
  );
}
