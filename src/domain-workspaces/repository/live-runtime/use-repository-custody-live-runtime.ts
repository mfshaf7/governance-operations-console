"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readRepositoryCustodyRegister } from "./repository-custody-live-readback.ts";
import { useRepositoryCustodyPages } from "./use-repository-custody-pages.ts";

import {
  assertRepositoryCustodyWorkflowResult,
  isRepositoryCustodyLiveApiError,
} from "./repository-custody-live-contract.ts";
import type {
  RepositoryCustodyLinkIntent,
  RepositoryCustodyWorkflowResult,
  RepositoryProvisionIntent,
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
  const catalog = useRepositoryCustodyPages({view: "register"}, true);
  const history = useRepositoryCustodyPages({view: "requests"});
  const retainedResults = history.records;
  const sourceStatus = catalog.status, sourceError = catalog.error, sourceRetryable = catalog.retryable;
  const refresh = catalog.refresh;
  const [commandResults, setCommandResults] = useState<Record<string, RepositoryCustodyWorkflowResult>>({});
  const rememberResult = useCallback((result: RepositoryCustodyWorkflowResult) => {
    setCommandResults(current => ({...current, [result.request.request_id]: result}));
  }, []);
  const registerResults = useMemo(() => {
    const successful = [...catalog.records, ...Object.values(commandResults)].filter(result => result.status === "succeeded" && result.provider_readback);
    successful.sort((a,b) => (a.receipt?.completed_at ?? a.request.requested_at).localeCompare(b.receipt?.completed_at ?? b.request.requested_at) || a.request.request_id.localeCompare(b.request.request_id));
    return [...new Map(successful.map(result => [result.provider_readback!.repository_identity.provider_repository_id, result])).values()];
  }, [catalog.records, commandResults]);
  const [resultsByRepositoryId, setResultsByRepositoryId] = useState<
    Readonly<Record<string, RepositoryCustodyWorkflowResult>>
  >({});
  const [errorsByRepositoryId, setErrorsByRepositoryId] = useState<
    Readonly<Record<string, RepositoryCustodyClientError>>
  >({});
  const [pendingRepositoryId, setPendingRepositoryId] = useState<string | null>(
    null,
  );
  const [provisioningErrorsByRequestId, setProvisioningErrorsByRequestId] =
    useState<Readonly<Record<string, RepositoryCustodyClientError>>>({});
  const [provisioningResultsByRequestId, setProvisioningResultsByRequestId] =
    useState<Readonly<Record<string, RepositoryCustodyWorkflowResult>>>({});
  const [pendingProvisioningRequestId, setPendingProvisioningRequestId] =
    useState<string | null>(null);

  useEffect(() => {
    const records = [...registerResults, ...history.records].sort((a,b) => a.request.requested_at.localeCompare(b.request.requested_at) || a.request.request_id.localeCompare(b.request.request_id));
    const provisions: Record<string, RepositoryCustodyWorkflowResult> = {}, links: Record<string, RepositoryCustodyWorkflowResult> = {};
    for (const record of records) {
      if (record.request.action === "provision-new") provisions[record.request.request_id] = record;
      else if (record.provider_readback) links[`repo-provider-${record.provider_readback.repository_identity.provider_repository_id}`] = record;
    }
    setProvisioningResultsByRequestId(current => ({...current, ...provisions}));
    setResultsByRepositoryId(current => ({...current, ...links}));
  }, [registerResults, history.records]);
  const findByProvider = useCallback(async (providerRepositoryId: string) => {
    const page = await readRepositoryCustodyRegister(fetch, {view: "register", providerRepositoryId});
    for (const result of page.records) rememberResult(result);
    return page.records;
  }, [rememberResult]);

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
      rememberResult(result);
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
        rememberResult(result);
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

  const provision = useCallback(async (intent: RepositoryProvisionIntent | { requestId: string; resume: true }) => {
    setPendingProvisioningRequestId(intent.requestId);
    setProvisioningErrorsByRequestId((current) =>
      withoutKey(current, intent.requestId),
    );
    try {
      const response = await fetch("/api/repositories/provisioning/requests", {
        body: JSON.stringify(intent),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw clientError(body);
      const result = assertRepositoryCustodyWorkflowResult(body);
      if (result.request.action !== "provision-new") {
        throw new RepositoryCustodyClientError(
          "Repository provisioning returned the wrong workflow action.",
          "repository_provisioning_action_mismatch",
          false,
        );
      }
      rememberResult(result);
      setProvisioningResultsByRequestId((current) => ({
        ...current,
        [intent.requestId]: result,
      }));
      return result;
    } catch (error) {
      const failure = normalizeClientError(error);
      setProvisioningErrorsByRequestId((current) => ({
        ...current,
        [intent.requestId]: failure,
      }));
      throw failure;
    } finally {
      setPendingProvisioningRequestId(null);
    }
  }, []);

  const readProvisioning = useCallback(async (requestId: string) => {
    setPendingProvisioningRequestId(requestId);
    setProvisioningErrorsByRequestId((current) => withoutKey(current, requestId));
    try {
      const response = await fetch(
        `/api/repositories/provisioning/requests/${encodeURIComponent(requestId)}`,
        { cache: "no-store" },
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw clientError(body);
      const result = assertRepositoryCustodyWorkflowResult(body);
      if (result.request.action !== "provision-new") {
        throw new RepositoryCustodyClientError(
          "Repository provisioning projection returned the wrong workflow action.",
          "repository_provisioning_action_mismatch",
          false,
        );
      }
      rememberResult(result);
      setProvisioningResultsByRequestId((current) => ({
        ...current,
        [requestId]: result,
      }));
      return result;
    } catch (error) {
      const failure = normalizeClientError(error);
      setProvisioningErrorsByRequestId((current) => ({
        ...current,
        [requestId]: failure,
      }));
      throw failure;
    } finally {
      setPendingProvisioningRequestId(null);
    }
  }, []);

  return {
    retainedResults,
    registerResults,
    catalog,
    history,
    findByProvider,
    refresh,
    sourceStatus,
    sourceError,
    sourceRetryable,
    errorsByRepositoryId,
    link,
    pendingRepositoryId,
    pendingProvisioningRequestId,
    provision,
    provisioningErrorsByRequestId,
    provisioningResultsByRequestId,
    read,
    readProvisioning,
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
