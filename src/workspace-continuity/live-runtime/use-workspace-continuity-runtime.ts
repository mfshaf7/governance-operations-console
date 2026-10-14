"use client";

import { useCallback, useState } from "react";

import { assertWorkspaceContinuityProjection } from "../workspace-continuity-contract.ts";
import type { WorkspaceContinuityProjection } from "../workspace-continuity-types.ts";

export class WorkspaceContinuityClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.name = "WorkspaceContinuityClientError";
    this.code = code;
    this.retryable = retryable;
  }
}

export function useWorkspaceContinuityRuntime() {
  const [mode, setMode] = useState<
    "disconnected-preview" | "live" | "loading" | "unavailable"
  >("loading");
  const [projection, setProjection] =
    useState<WorkspaceContinuityProjection | null>(null);
  const [error, setError] = useState<WorkspaceContinuityClientError | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/workspace-continuity", {
        cache: "no-store",
        method: "GET",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw clientError(body);
      const next = assertWorkspaceContinuityProjection(body);
      setProjection(next);
      setMode("live");
      return next;
    } catch (caught) {
      const failure = normalizeError(caught);
      setProjection(null);
      setError(failure);
      setMode(
        failure.code === "workspace_continuity_live_mode_required"
          ? "disconnected-preview"
          : "unavailable",
      );
      throw failure;
    }
  }, []);

  return { error, load, mode, projection };
}

export type WorkspaceContinuityRuntime = ReturnType<
  typeof useWorkspaceContinuityRuntime
>;

function clientError(value: unknown) {
  if (isRecord(value)) {
    return new WorkspaceContinuityClientError(
      typeof value.error === "string"
        ? value.error
        : "Workspace continuity request failed.",
      typeof value.code === "string"
        ? value.code
        : "workspace_continuity_request_failed",
      value.retryable === true,
    );
  }
  return new WorkspaceContinuityClientError(
    "Workspace continuity request failed.",
    "workspace_continuity_request_failed",
  );
}

function normalizeError(error: unknown) {
  return error instanceof WorkspaceContinuityClientError
    ? error
    : new WorkspaceContinuityClientError(
        error instanceof Error
          ? error.message
          : "Workspace continuity projection is invalid.",
        "workspace_continuity_projection_invalid",
      );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
