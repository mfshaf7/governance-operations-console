"use client";

import { useCallback, useState } from "react";

import {
  assertWorkspaceInventoryLifecyclePreparation,
  assertWorkspaceInventoryLifecycleResult,
  assertWorkspaceInventoryPreparation,
  assertWorkspaceInventoryResult,
  assertWorkspaceRegistrySnapshot,
} from "../workspace-registry-contract.ts";
import type {
  WorkspaceInventoryLifecycleAction,
  WorkspaceInventoryLifecyclePreparation,
  WorkspaceInventoryLifecycleResult,
  WorkspaceInventoryPreparation,
  WorkspaceInventoryResult,
  WorkspaceRegistryCandidate,
  WorkspaceRegistryRecord,
  WorkspaceRegistrySnapshot,
} from "../model/workspace-registry-types.ts";

export class WorkspaceRegistryClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

export function useWorkspaceRegistryLiveRuntime() {
  const [snapshot, setSnapshot] = useState<WorkspaceRegistrySnapshot | null>(null);
  const [preparation, setPreparation] =
    useState<WorkspaceInventoryPreparation | null>(null);
  const [result, setResult] = useState<WorkspaceInventoryResult | null>(null);
  const [lifecyclePreparation, setLifecyclePreparation] =
    useState<WorkspaceInventoryLifecyclePreparation | null>(null);
  const [lifecycleResult, setLifecycleResult] =
    useState<WorkspaceInventoryLifecycleResult | null>(null);
  const [error, setError] = useState<WorkspaceRegistryClientError | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    return run(async () => {
      const next = assertWorkspaceRegistrySnapshot(
        await jsonRequest("/api/workspace-registry", {
          cache: "no-store",
          method: "GET",
        }),
      );
      setSnapshot(next);
      return next;
    });
  }, []);

  const prepare = useCallback(async (candidate: WorkspaceRegistryCandidate) => {
    return run(async () => {
      const next = assertWorkspaceInventoryPreparation(
        await jsonRequest("/api/workspace-registry/preparations", {
          body: JSON.stringify({ target: candidate.target }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      );
      setPreparation(next);
      setResult(null);
      return next;
    });
  }, []);

  const submit = useCallback(
    async (candidate: WorkspaceRegistryCandidate, requestId: string) => {
      if (!snapshot || !preparation) {
        throw new WorkspaceRegistryClientError(
          "Review the current Registry projection before promotion.",
          "workspace_registry_review_required",
        );
      }
      return runResult(async () =>
        jsonRequest("/api/workspace-registry/promotions", {
          body: JSON.stringify({
            candidate,
            request_id: requestId,
            reviewed_preparation: preparation,
            reviewed_projection: {
              authority_revision: snapshot.authority_revision,
              projection_digest: snapshot.projection_digest,
            },
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      requestId);
    },
    [preparation, snapshot],
  );

  const prepareLifecycle = useCallback(async (record: WorkspaceRegistryRecord) => {
    return run(async () => {
      const next = assertWorkspaceInventoryLifecyclePreparation(
        await jsonRequest("/api/workspace-registry/lifecycle/preparations", {
          body: JSON.stringify({
            target: { kind: record.kind, name: record.name, record_id: record.id },
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      );
      setLifecyclePreparation(next);
      setLifecycleResult(null);
      return next;
    });
  }, []);

  const submitLifecycle = useCallback(
    async ({
      action,
      approvalRefs,
      impactAcknowledgements,
      reason,
      requestId,
      requestedValue,
    }: {
      action: WorkspaceInventoryLifecycleAction;
      approvalRefs: readonly string[];
      impactAcknowledgements: readonly string[];
      reason: string;
      requestId: string;
      requestedValue: Readonly<Record<string, unknown>> | null;
    }) => {
      if (!snapshot || !lifecyclePreparation) {
        throw new WorkspaceRegistryClientError(
          "Review the current Registry lifecycle preparation before applying an action.",
          "workspace_registry_lifecycle_review_required",
        );
      }
      return runLifecycleResult(
        () =>
          jsonRequest("/api/workspace-registry/lifecycle/requests", {
            body: JSON.stringify({
              action,
              approval_refs: approvalRefs,
              impact_acknowledgements: impactAcknowledgements,
              reason,
              request_id: requestId,
              requested_value: requestedValue,
              reviewed_preparation: lifecyclePreparation,
              reviewed_projection: {
                authority_revision: snapshot.authority_revision,
                projection_digest: snapshot.projection_digest,
              },
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          }),
        requestId,
      );
    },
    [lifecyclePreparation, snapshot],
  );

  const readLifecycle = useCallback(async (requestId: string) => {
    return runLifecycleResult(
      () =>
        jsonRequest(
          `/api/workspace-registry/lifecycle/requests/${encodeURIComponent(requestId)}`,
          { cache: "no-store", method: "GET" },
        ),
      requestId,
    );
  }, []);

  const continueLifecycle = useCallback(async (requestId: string) => {
    return lifecycleCommand(requestId, "continue");
  }, []);

  const cancelLifecycle = useCallback(async (requestId: string) => {
    return lifecycleCommand(requestId, "cancel");
  }, []);

  const read = useCallback(async (requestId: string) => {
    return runResult(
      () =>
        jsonRequest(
          `/api/workspace-registry/promotions/${encodeURIComponent(requestId)}`,
          { cache: "no-store", method: "GET" },
        ),
      requestId,
    );
  }, []);

  const continuePromotion = useCallback(async (requestId: string) => {
    return command(requestId, "continue");
  }, []);

  const cancel = useCallback(async (requestId: string) => {
    return command(requestId, "cancel");
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setLifecyclePreparation(null);
    setLifecycleResult(null);
    setPreparation(null);
    setResult(null);
  }, []);

  async function command(requestId: string, action: "cancel" | "continue") {
    return runResult(
      () =>
        jsonRequest(
          `/api/workspace-registry/promotions/${encodeURIComponent(requestId)}/${action}`,
          {
            body: "{}",
            headers: { "Content-Type": "application/json" },
            method: "POST",
          },
        ),
      requestId,
    );
  }

  async function lifecycleCommand(
    requestId: string,
    action: "cancel" | "continue",
  ) {
    return runLifecycleResult(
      () =>
        jsonRequest(
          `/api/workspace-registry/lifecycle/requests/${encodeURIComponent(requestId)}/${action}`,
          {
            body: "{}",
            headers: { "Content-Type": "application/json" },
            method: "POST",
          },
        ),
      requestId,
    );
  }

  async function runResult(
    operation: () => Promise<unknown>,
    requestId: string,
  ) {
    return run(async () => {
      const next = assertWorkspaceInventoryResult(await operation(), requestId);
      setResult(next);
      if (next.status === "succeeded") {
        await load();
      }
      return next;
    });
  }

  async function runLifecycleResult(
    operation: () => Promise<unknown>,
    requestId: string,
  ) {
    return run(async () => {
      const next = assertWorkspaceInventoryLifecycleResult(
        await operation(),
        requestId,
      );
      setLifecycleResult(next);
      if (next.status === "succeeded") {
        await load();
      }
      return next;
    });
  }

  async function run<T>(operation: () => Promise<T>) {
    setPending(true);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      const failure = normalizeError(caught);
      setError(failure);
      throw failure;
    } finally {
      setPending(false);
    }
  }

  return {
    cancel,
    cancelLifecycle,
    continuePromotion,
    continueLifecycle,
    error,
    lifecyclePreparation,
    lifecycleResult,
    load,
    pending,
    preparation,
    prepare,
    prepareLifecycle,
    read,
    readLifecycle,
    reset,
    result,
    snapshot,
    submit,
    submitLifecycle,
  };
}

export type WorkspaceRegistryLiveRuntime = ReturnType<
  typeof useWorkspaceRegistryLiveRuntime
>;

async function jsonRequest(path: string, init: RequestInit) {
  const response = await fetch(path, init);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw clientError(body);
  return body;
}

function clientError(value: unknown) {
  if (isRecord(value)) {
    return new WorkspaceRegistryClientError(
      typeof value.error === "string"
        ? value.error
        : "Workspace Registry request failed.",
      typeof value.code === "string"
        ? value.code
        : "workspace_registry_request_failed",
      value.retryable === true,
    );
  }
  return new WorkspaceRegistryClientError(
    "Workspace Registry request failed.",
    "workspace_registry_request_failed",
  );
}

function normalizeError(error: unknown) {
  return error instanceof WorkspaceRegistryClientError
    ? error
    : new WorkspaceRegistryClientError(
        error instanceof Error
          ? error.message
          : "Workspace Registry request failed.",
        "workspace_registry_projection_invalid",
      );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
