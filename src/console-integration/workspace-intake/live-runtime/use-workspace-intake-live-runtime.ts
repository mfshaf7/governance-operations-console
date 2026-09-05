"use client";

import { useCallback, useState } from "react";

import {
  assertWorkspaceIntakePreparation,
  assertWorkspaceIntakeResult,
} from "../workspace-intake-live-contract.ts";
import type {
  WorkspaceIntakeCandidate,
  WorkspaceIntakeDecision,
  WorkspaceIntakePreparation,
  WorkspaceIntakeResult,
} from "../workspace-intake-live-types.ts";

export class WorkspaceIntakeClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

export function useWorkspaceIntakeLiveRuntime() {
  const [preparation, setPreparation] =
    useState<WorkspaceIntakePreparation | null>(null);
  const [result, setResult] = useState<WorkspaceIntakeResult | null>(null);
  const [error, setError] = useState<WorkspaceIntakeClientError | null>(null);
  const [pending, setPending] = useState(false);

  const prepare = useCallback(async (candidate: WorkspaceIntakeCandidate) => {
    return run(async () => {
      const body = await jsonRequest("/api/workspace-intake/preparations", {
        body: JSON.stringify({ target: candidate.target }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const next = assertWorkspaceIntakePreparation(body);
      setPreparation(next);
      setResult(null);
      return next;
    });
  }, []);

  const submit = useCallback(
    async ({
      candidate,
      decision,
      requestId,
    }: {
      candidate: WorkspaceIntakeCandidate;
      decision: WorkspaceIntakeDecision;
      requestId: string;
    }) => {
      if (!preparation) {
        throw new WorkspaceIntakeClientError(
          "Review current Workspace Intake authority before submission.",
          "workspace_intake_preparation_required",
        );
      }
      return run(async () => {
        const body = await jsonRequest("/api/workspace-intake/requests", {
          body: JSON.stringify({
            candidate,
            decision,
            request_id: requestId,
            reviewed_preparation: preparation,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const next = assertWorkspaceIntakeResult(body, requestId);
        setResult(next);
        return next;
      });
    },
    [preparation],
  );

  const read = useCallback(async (requestId: string) => {
    return runResult(requestId, "GET");
  }, []);

  const continueRequest = useCallback(async (requestId: string) => {
    return runResult(requestId, "POST", "continue");
  }, []);

  const cancel = useCallback(async (requestId: string) => {
    return runResult(requestId, "POST", "cancel");
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

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

  async function runResult(
    requestId: string,
    method: "GET" | "POST",
    action?: "cancel" | "continue",
  ) {
    return run(async () => {
      const suffix = action ? `/${action}` : "";
      const body = await jsonRequest(
        `/api/workspace-intake/requests/${encodeURIComponent(requestId)}${suffix}`,
        method === "GET"
          ? { cache: "no-store", method }
          : {
              body: "{}",
              headers: { "Content-Type": "application/json" },
              method,
            },
      );
      const next = assertWorkspaceIntakeResult(body, requestId);
      setResult(next);
      return next;
    });
  }

  return {
    cancel,
    continueRequest,
    error,
    pending,
    preparation,
    prepare,
    read,
    reset,
    result,
    submit,
  };
}

async function jsonRequest(path: string, init: RequestInit) {
  const response = await fetch(path, init);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw clientError(body);
  return body;
}

function clientError(value: unknown) {
  if (isRecord(value)) {
    return new WorkspaceIntakeClientError(
      typeof value.error === "string"
        ? value.error
        : "Workspace Intake request failed.",
      typeof value.code === "string"
        ? value.code
        : "workspace_intake_request_failed",
      value.retryable === true,
    );
  }
  return new WorkspaceIntakeClientError(
    "Workspace Intake request failed.",
    "workspace_intake_request_failed",
  );
}

function normalizeError(error: unknown) {
  return error instanceof WorkspaceIntakeClientError
    ? error
    : new WorkspaceIntakeClientError(
        error instanceof Error ? error.message : "Workspace Intake request failed.",
        "workspace_intake_projection_invalid",
      );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
