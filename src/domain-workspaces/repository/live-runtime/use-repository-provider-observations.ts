"use client";
import { useCallback, useRef, useState } from "react";
import type { RepositoryWorkspaceRecord } from "../domain/repository-types.ts";
import { assertRepositoryProviderLookup, type RepositoryProviderLookup } from "./repository-provider-lookup.ts";

export type RepositoryProviderObservationSnapshot = Readonly<{
  readback: RepositoryProviderLookup | null;
  loading: boolean;
  error: string | null;
  retryable?: boolean;
  code?: string | null;
}>;

// Reuse the existing bounded, read-only provider lookup for one explicitly
// opened History view. No background register scan or provider mutation.
export function useRepositoryProviderObservations() {
  const [snapshots, setSnapshots] = useState<Readonly<Record<string, RepositoryProviderObservationSnapshot>>>({});
  const versions = useRef(new Map<string, number>());
  const refresh = useCallback(async (repository: RepositoryWorkspaceRecord) => {
    const identity = repository.providerIdentity;
    if (!identity) return;
    const version = (versions.current.get(repository.id) ?? 0) + 1;
    versions.current.set(repository.id, version);
    setSnapshots(current => ({ ...current, [repository.id]: { readback: current[repository.id]?.readback ?? null, loading: true, error: null } }));
    try {
      const response = await fetch(`/api/repositories/custody/provider-repository?${new URLSearchParams({ owner: identity.owner, name: identity.name })}`,
        { cache: "no-store", signal: AbortSignal.timeout(15_000) });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const failure = body && typeof body === "object" ? body as { code?: string; retryable?: boolean } : null;
        const transient = failure?.retryable === true || ["repository_provider_unavailable", "repository_provider_rate_limited"].includes(failure?.code ?? "") || (!failure?.code && [408,429,502,503,504].includes(response.status));
        if (versions.current.get(repository.id) === version) setSnapshots(current => ({ ...current, [repository.id]: {
          readback: current[repository.id]?.readback ?? null, loading: false, retryable: transient,
          code: failure?.code ?? null, error: "GitHub status could not be loaded.",
        } }));
        return;
      }
      const readback = assertRepositoryProviderLookup(body);
      if (readback.provider !== identity.provider || readback.provider_repository_id !== identity.repositoryId) {
        throw new Error("The lookup returned a different repository identity. Its status cannot be used for this record.");
      }
      if (versions.current.get(repository.id) === version) setSnapshots(current => ({ ...current, [repository.id]: { readback, loading: false, error: null } }));
    } catch (failure) {
      if (versions.current.get(repository.id) === version) setSnapshots(current => ({ ...current, [repository.id]: {
        readback: current[repository.id]?.readback ?? null, loading: false,
        error: failure instanceof Error ? failure.message : "Current provider status could not be read.",
        retryable: failure instanceof TypeError || (failure instanceof DOMException && ["TimeoutError", "AbortError"].includes(failure.name)),
      } }));
    }
  }, []);
  return { snapshots, refresh };
}
