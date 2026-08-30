"use client";

import { useCallback, useState } from "react";

import {
  assertRepositoryLifecycleLiveSnapshot,
  assertRepositoryLifecycleWorkflowResult,
  isRepositoryLifecycleLiveApiError,
} from "./repository-lifecycle-live-contract.ts";
import type {
  RepositoryLifecycleCommandIntent,
  RepositoryLifecycleLiveSnapshot,
  RepositoryLifecycleWorkflowResult,
} from "./repository-lifecycle-live-types.ts";

export class RepositoryLifecycleClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

export function useRepositoryLifecycleLiveRuntime() {
  const [snapshotsByRepositoryId, setSnapshotsByRepositoryId] = useState<
    Readonly<Record<string, RepositoryLifecycleLiveSnapshot>>
  >({});
  const [resultsByRepositoryId, setResultsByRepositoryId] = useState<
    Readonly<Record<string, RepositoryLifecycleWorkflowResult>>
  >({});
  const [errorsByRepositoryId, setErrorsByRepositoryId] = useState<
    Readonly<Record<string, RepositoryLifecycleClientError>>
  >({});
  const [pendingRepositoryId, setPendingRepositoryId] = useState<string | null>(
    null,
  );

  const refresh = useCallback(
    async ({
      provider,
      providerRepositoryId,
      repositoryId,
    }: {
      provider: string;
      providerRepositoryId: string;
      repositoryId: string;
    }) => {
      setErrorsByRepositoryId((current) => withoutKey(current, repositoryId));
      try {
        const response = await fetch(
          lifecycleRepositoryPath(provider, providerRepositoryId),
          { cache: "no-store" },
        );
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw clientError(body);
        const snapshot = assertRepositoryLifecycleLiveSnapshot(body);
        setSnapshotsByRepositoryId((current) => ({
          ...current,
          [repositoryId]: snapshot,
        }));
        return snapshot;
      } catch (error) {
        const failure = normalizeClientError(error);
        setErrorsByRepositoryId((current) => ({
          ...current,
          [repositoryId]: failure,
        }));
        throw failure;
      }
    },
    [],
  );

  const execute = useCallback(async (intent: RepositoryLifecycleCommandIntent) => {
    setPendingRepositoryId(intent.repositoryId);
    setErrorsByRepositoryId((current) => withoutKey(current, intent.repositoryId));
    try {
      const response = await fetch("/api/repositories/lifecycle/requests", {
        body: JSON.stringify(intent),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw clientError(body);
      const result = assertRepositoryLifecycleWorkflowResult(body);
      setResultsByRepositoryId((current) => ({
        ...current,
        [intent.repositoryId]: result,
      }));
      if (result.audit) {
        setSnapshotsByRepositoryId((current) => ({
          ...current,
          [intent.repositoryId]: {
            audit: result.audit,
            error: null,
            mode: "live",
            observedAt: new Date().toISOString(),
            status: "current",
          },
        }));
      }
      return result;
    } catch (error) {
      const failure = normalizeClientError(error);
      setErrorsByRepositoryId((current) => ({
        ...current,
        [intent.repositoryId]: failure,
      }));
      throw failure;
    } finally {
      setPendingRepositoryId(null);
    }
  }, []);

  const read = useCallback(
    async ({
      repositoryId,
      requestId,
    }: {
      repositoryId: string;
      requestId: string;
    }) => {
      setPendingRepositoryId(repositoryId);
      setErrorsByRepositoryId((current) => withoutKey(current, repositoryId));
      try {
        const response = await fetch(
          `/api/repositories/lifecycle/requests/${encodeURIComponent(requestId)}`,
          { cache: "no-store" },
        );
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw clientError(body);
        const result = assertRepositoryLifecycleWorkflowResult(body);
        setResultsByRepositoryId((current) => ({
          ...current,
          [repositoryId]: result,
        }));
        return result;
      } catch (error) {
        const failure = normalizeClientError(error);
        setErrorsByRepositoryId((current) => ({
          ...current,
          [repositoryId]: failure,
        }));
        throw failure;
      } finally {
        setPendingRepositoryId(null);
      }
    },
    [],
  );

  return {
    errorsByRepositoryId,
    execute,
    pendingRepositoryId,
    read,
    refresh,
    resultsByRepositoryId,
    snapshotsByRepositoryId,
  };
}

function lifecycleRepositoryPath(
  provider: string,
  providerRepositoryId: string,
) {
  return `/api/repositories/lifecycle/repositories/${encodeURIComponent(provider)}/${encodeURIComponent(providerRepositoryId)}`;
}

function clientError(value: unknown) {
  return isRepositoryLifecycleLiveApiError(value)
    ? new RepositoryLifecycleClientError(
        value.error,
        value.code,
        value.retryable,
      )
    : new RepositoryLifecycleClientError(
        "Repository lifecycle request failed.",
        "repository_lifecycle_request_failed",
      );
}

function normalizeClientError(error: unknown) {
  return error instanceof RepositoryLifecycleClientError
    ? error
    : new RepositoryLifecycleClientError(
        error instanceof Error
          ? error.message
          : "Repository lifecycle request failed.",
        "repository_lifecycle_projection_invalid",
      );
}

function withoutKey<T>(source: Readonly<Record<string, T>>, key: string) {
  const next = { ...source };
  delete next[key];
  return next;
}
