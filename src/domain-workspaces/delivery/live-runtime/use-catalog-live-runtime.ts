"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { DeliveryCatalogReadModel } from "../read-model/index.ts";
import type { CatalogDraftApplyResult } from "../work-model/catalog/catalog-mutation-types.ts";
import {
  assertCatalogOosMutationResult,
  assertCatalogRepositoryReadiness,
  assertCatalogProjectionSnapshot,
  catalogReadModelFromProjection,
  isCatalogLiveApiError,
} from "./catalog-live-contract.ts";
import type {
  CatalogMutationCommand,
  CatalogProjectionSnapshot,
} from "./catalog-live-types.ts";

export class CatalogLiveRuntimeError extends Error {
  readonly code: string;

  constructor(message: string, code = "catalog_live_request_failed") {
    super(message);
    this.code = code;
  }
}

export function useCatalogLiveRuntime() {
  const [snapshot, setSnapshot] = useState<CatalogProjectionSnapshot | null>(null);
  const snapshotRef = useRef<CatalogProjectionSnapshot | null>(null);
  const [recoveryRequired, setRecoveryRequired] = useState(false);
  const pendingCommands = useRef(new Map<string, { catalogItemId: string; command: CatalogMutationCommand & { acceptanceId: string; acceptedAt: string } }>());
  const pendingRefresh = useRef<Promise<CatalogProjectionSnapshot> | null>(null);

  const refresh = useCallback(async () => {
    if (pendingRefresh.current) return pendingRefresh.current;
    const operation = fetch("/api/delivery/catalog/projection", { cache: "no-store" })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw catalogClientError(body);
        return assertCatalogProjectionSnapshot(body);
      })
      .then((next) => {
        snapshotRef.current = next;
        setSnapshot(next);
        return next;
      })
      .catch(error => {
        const next: CatalogProjectionSnapshot = { mode: "live", status: "offline", observedAt: new Date().toISOString(),
          projection: snapshotRef.current?.projection ?? null, error: error instanceof Error ? error.message : "Catalog values could not be loaded." };
        snapshotRef.current = next; setSnapshot(next); throw error;
      })
      .finally(() => {
        pendingRefresh.current = null;
      });
    pendingRefresh.current = operation;
    return operation;
  }, []);

  useEffect(() => {
    void refresh().catch((error) => {
      const next: CatalogProjectionSnapshot = {
        error: error instanceof Error ? error.message : "Catalog projection failed.",
        mode: "live",
        observedAt: new Date().toISOString(),
        projection: null,
        status: "offline",
      };
      snapshotRef.current = next;
      setSnapshot(next);
    });
  }, [refresh]);

  const mutate = useCallback(
    async (
      catalogItemId: string,
      command: CatalogMutationCommand & {
        acceptanceId: string;
        acceptedAt: string;
      },
    ): Promise<CatalogDraftApplyResult | null> => {
      const pending = pendingCommands.current.get(command.acceptanceId)?.command;
      const current = snapshotRef.current ?? await refresh();
      if (current.mode === "disconnected-preview") return null;
      if (!pending && (current.status !== "current" || current.projection?.projection_status !== "ready" ||
          current.projection.source_revision !== command.expectedSourceRevision)) {
        throw new CatalogLiveRuntimeError("Reload current Catalog values and review this change again.", "source_revision_stale");
      }
      let accepted = pending;
      if (!accepted) {
        const repositoryReadiness = command.draft.linkedRepository
          ? await requestCatalogRepositoryReadiness(command.draft.linkedRepository.valueKey)
          : null;
        accepted = { ...command, repositoryReadiness };
        pendingCommands.current.set(command.acceptanceId, { catalogItemId, command: accepted });
      }
      let result;
      try {
        const response = await fetch(`/api/delivery/catalog/${encodeURIComponent(catalogItemId)}/mutations`, {
          body: JSON.stringify(accepted), headers: { "Content-Type": "application/json" }, method: "POST",
        });
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status < 500) {
            pendingCommands.current.delete(command.acceptanceId); setRecoveryRequired(false);
            await refresh().catch(() => undefined);
          }
          throw catalogClientError(body);
        }
        result = assertCatalogOosMutationResult(body);
      } catch (error) {
        if (pendingCommands.current.has(command.acceptanceId)) {
          setRecoveryRequired(true);
          const next: CatalogProjectionSnapshot = { ...current, status: "offline", error: "The change outcome is unconfirmed. Retry the same change to recover its original result." };
          snapshotRef.current = next; setSnapshot(next);
        }
        throw error;
      }
      pendingCommands.current.delete(command.acceptanceId); setRecoveryRequired(false);
      let next = await refresh().catch(() => null);
      if (!next?.projection || next.status !== "current") {
        // OOS already attests canonical readback in this applied receipt. Retain
        // that outcome even if the subsequent list read fails. Other values
        // stay visibly stale and no new change is enabled.
        const prior = current.projection!;
        const changed = [result.value, ...result.related_values];
        const ids = new Set(changed.map(value => value.catalog_value_id));
        next = { mode: "live", status: "offline", observedAt: new Date().toISOString(),
          error: "Change applied. The latest value list could not be refreshed. Retry loading before another change.",
          projection: { ...prior, source_revision: result.source_revision, projection_status: "stale", projected_at: result.applied_at,
            values: [...prior.values.filter(value => !ids.has(value.catalog_value_id)), ...changed] } };
        snapshotRef.current = next; setSnapshot(next);
      }
      const readModel = catalogReadModelFromProjection(next.projection!);
      return {
        catalogValues: readModel.values,
        localDraftReceipt: {
          canonical: true,
          actionLabel: `${command.mode === "retire" ? "Retired" : command.mode === "edit" ? "Updated" : "Added"} ${result.value.label}`,
          linkedRepository: command.draft.linkedRepository,
          recordedAt: result.applied_at,
          route: result.receipt.ref,
          valueId: result.value.catalog_value_id,
        },
        search: "",
        selectedValueId: result.value.catalog_value_id,
      };
    },
    [refresh],
  );

  const readModel: DeliveryCatalogReadModel | null = snapshot?.projection
    ? catalogReadModelFromProjection(snapshot.projection)
    : null;

  return {
    recover: async () => { const saved = pendingCommands.current.values().next().value; return saved ? mutate(saved.catalogItemId, saved.command) : null; },
    recoveryRequired,
    loading: snapshot === null,
    mode: snapshot?.mode ?? "live",
    mutate,
    projection: snapshot?.projection ?? null,
    projectionError: snapshot?.error ?? null,
    projectionStatus: snapshot?.status ?? "offline",
    readModel,
    refresh,
  };
}

function catalogClientError(value: unknown) {
  return new CatalogLiveRuntimeError(
    isCatalogLiveApiError(value) ? value.error : "Governed Catalog request failed.",
    isCatalogLiveApiError(value) ? value.code : undefined,
  );
}

export async function requestCatalogRepositoryReadiness(repoName: string) {
  const response = await fetch("/api/delivery/catalog/repository-readiness", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({repoName}),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw catalogClientError(body);
  const reference = assertCatalogRepositoryReadiness(body?.repository_readiness_reference);
  if (reference.repo_name !== repoName || reference.repo_ref !== `repo://${repoName}`) throw new CatalogLiveRuntimeError("Repository readiness returned a different repository.");
  return reference;
}
