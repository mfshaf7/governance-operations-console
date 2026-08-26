"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { DeliveryCatalogReadModel } from "../read-model/index.ts";
import type { CatalogDraftApplyResult } from "../work-model/catalog/catalog-mutation-types.ts";
import {
  assertCatalogOosMutationResult,
  assertCatalogProjectionSnapshot,
  catalogReadModelFromProjection,
  catalogRepositoryReadiness,
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
      const current = await currentSnapshot(snapshotRef.current, refresh);
      if (current.mode === "disconnected-preview") return null;
      const repositoryReadiness = command.draft.linkedRepository
        ? catalogRepositoryReadiness(
            current.projection?.values.find(
              (value) =>
                value.value_key === command.draft.linkedRepository?.valueKey &&
                value.repository_binding?.repo_ref ===
                  `repo://${command.draft.linkedRepository.valueKey}`,
            ),
          )
        : null;
      const response = await fetch(
        `/api/delivery/catalog/${encodeURIComponent(catalogItemId)}/mutations`,
        {
          body: JSON.stringify({ ...command, repositoryReadiness }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        await refresh().catch(() => undefined);
        throw catalogClientError(body);
      }
      const result = assertCatalogOosMutationResult(body);
      const next = await refresh();
      if (
        !next.projection ||
        next.projection.source_revision !== result.source_revision ||
        !next.projection.values.some(
          (value) =>
            value.catalog_value_id === result.value.catalog_value_id &&
            value.catalog_item_id === result.value.catalog_item_id &&
            value.value_key === result.value.value_key,
        )
      ) {
        throw new CatalogLiveRuntimeError(
          "Catalog mutation completed but exact canonical readback is unavailable.",
          "catalog_readback_unavailable",
        );
      }
      const readModel = catalogReadModelFromProjection(next.projection);
      return {
        catalogValues: readModel.values,
        localDraftReceipt: {
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

async function currentSnapshot(
  current: CatalogProjectionSnapshot | null,
  refresh: () => Promise<CatalogProjectionSnapshot>,
) {
  const snapshot = current ?? (await refresh());
  if (snapshot.mode === "live" && snapshot.status !== "current") {
    throw new CatalogLiveRuntimeError(
      snapshot.error || "Canonical Catalog projection is unavailable.",
      "catalog_projection_unavailable",
    );
  }
  return snapshot;
}

function catalogClientError(value: unknown) {
  return new CatalogLiveRuntimeError(
    isCatalogLiveApiError(value) ? value.error : "Governed Catalog request failed.",
    isCatalogLiveApiError(value) ? value.code : undefined,
  );
}
