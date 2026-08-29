"use client";

import { useCallback, useState } from "react";

import {
  assertRepositoryCustodyWorkflowResult,
  isRepositoryCustodyLiveApiError,
} from "./repository-custody-live-contract.ts";
import type {
  RepositoryCustodyLinkIntent,
  RepositoryCustodyWorkflowResult,
} from "./repository-custody-live-types.ts";

export class RepositoryCustodyClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

export function useRepositoryCustodyLiveRuntime() {
  const [resultsByRepositoryId, setResultsByRepositoryId] = useState<
    Readonly<Record<string, RepositoryCustodyWorkflowResult>>
  >({});
  const [errorsByRepositoryId, setErrorsByRepositoryId] = useState<
    Readonly<Record<string, RepositoryCustodyClientError>>
  >({});
  const [pendingRepositoryId, setPendingRepositoryId] = useState<string | null>(
    null,
  );

  const link = useCallback(async (intent: RepositoryCustodyLinkIntent) => {
    setPendingRepositoryId(intent.repositoryId);
    setErrorsByRepositoryId((current) => withoutKey(current, intent.repositoryId));
    try {
      const response = await fetch("/api/repositories/custody/requests", {
        body: JSON.stringify(intent),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw clientError(body);
      const result = assertRepositoryCustodyWorkflowResult(body);
      setResultsByRepositoryId((current) => ({
        ...current,
        [intent.repositoryId]: result,
      }));
      return result;
    } catch (error) {
      const failure =
        error instanceof RepositoryCustodyClientError
          ? error
          : new RepositoryCustodyClientError(
              error instanceof Error
                ? error.message
                : "Repository custody request failed.",
              "repository_custody_projection_invalid",
              false,
            );
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
    async ({ repositoryId, requestId }: { repositoryId: string; requestId: string }) => {
      setPendingRepositoryId(repositoryId);
      setErrorsByRepositoryId((current) => withoutKey(current, repositoryId));
      try {
        const response = await fetch(
          `/api/repositories/custody/requests/${encodeURIComponent(requestId)}`,
          { cache: "no-store" },
        );
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw clientError(body);
        const result = assertRepositoryCustodyWorkflowResult(body);
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
    link,
    pendingRepositoryId,
    read,
    resultsByRepositoryId,
  };
}

function clientError(value: unknown) {
  return isRepositoryCustodyLiveApiError(value)
    ? new RepositoryCustodyClientError(
        value.error,
        value.code,
        value.retryable,
      )
    : new RepositoryCustodyClientError(
        "Repository custody request failed.",
        "repository_custody_request_failed",
        false,
      );
}

function normalizeClientError(error: unknown) {
  return error instanceof RepositoryCustodyClientError
    ? error
    : new RepositoryCustodyClientError(
        error instanceof Error
          ? error.message
          : "Repository custody request failed.",
        "repository_custody_projection_invalid",
        false,
      );
}

function withoutKey<T>(source: Readonly<Record<string, T>>, key: string) {
  const next = { ...source };
  delete next[key];
  return next;
}
