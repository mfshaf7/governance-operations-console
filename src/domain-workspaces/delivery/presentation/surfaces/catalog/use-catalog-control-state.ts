"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  DeliveryCatalogValue,
  DeliveryReadModel,
} from "../../../read-model/index.ts";
import {
  getDeliveryCatalogRuntimeCapabilities,
  submitCatalogMutationCommand,
} from "../../../local-runtime/commands/catalog-mutation-runtime.ts";
import { useCatalogLiveRuntime } from "../../../live-runtime/use-catalog-live-runtime.ts";
import { catalogUnavailableReadModel } from "../../../live-runtime/catalog-live-contract.ts";

import { repositoryOwnerRepoCatalogOptions } from "@/domain-workspaces/operation-integrations/repository-owner-repo-catalog-projection";
import {
  canDraftCatalogMutation,
  canDraftCatalogValueMutation,
  catalogValuesForItem,
  editableCatalogItems,
  planningFacetCatalogItems,
  planningFacetValueSummary,
  planningFacetValuesForTargetPi,
  targetPiCatalogId,
  type CatalogLocalDraftReceipt,
  type CatalogMutationDraft,
  type CatalogMutationSubmit,
} from "./catalog-view-model.ts";
export function useCatalogControlState(model: DeliveryReadModel) {
  const localRuntimeCapabilities = getDeliveryCatalogRuntimeCapabilities();
  const liveRuntime = useCatalogLiveRuntime();
  const pendingAcceptanceRef = useRef<{
    acceptanceId: string;
    acceptedAt: string;
    draftKey: string;
  } | null>(null);
  const sourceCatalog = liveRuntime.loading
    ? model.catalog
    : liveRuntime.mode === "disconnected-preview"
      ? model.catalog
      : liveRuntime.projectionStatus === "current" && liveRuntime.readModel
        ? liveRuntime.readModel
        : catalogUnavailableReadModel();
  const canSubmit =
    liveRuntime.mode === "disconnected-preview"
      ? localRuntimeCapabilities.canSubmit
      : liveRuntime.projectionStatus === "current" &&
        liveRuntime.readModel !== null;
  const sourceKey = `${liveRuntime.mode}:${sourceCatalog.source_revision ?? sourceCatalog.generated_at}`;
  const [catalogValues, setCatalogValues] = useState(sourceCatalog.values);
  const catalogs = useMemo(
    () => editableCatalogItems(sourceCatalog.items),
    [sourceCatalog.items],
  );
  const [activeCatalogId, setActiveCatalogId] = useState("catalog-target-pi");
  const [search, setSearch] = useState("");
  const [selectedValueId, setSelectedValueId] = useState(
    "catalog-value-target-pi-2026-03",
  );
  const [mutationDraft, setMutationDraft] =
    useState<CatalogMutationDraft | null>(null);
  const [localDraftReceipt, setLocalDraftReceipt] =
    useState<CatalogLocalDraftReceipt | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    setCatalogValues(sourceCatalog.values);
    setLocalDraftReceipt(null);
    setMutationError(null);
    const nextCatalogs = editableCatalogItems(sourceCatalog.items);
    const nextActiveCatalog =
      nextCatalogs.find((catalog) => catalog.catalog_item_id === activeCatalogId) ??
      nextCatalogs[0] ??
      null;
    if (nextActiveCatalog) {
      setActiveCatalogId(nextActiveCatalog.catalog_item_id);
      const nextValue = sourceCatalog.values.find(
        (value) =>
          value.catalog_item_id === nextActiveCatalog.catalog_item_id,
      );
      setSelectedValueId(nextValue?.catalog_value_id ?? "");
    }
  }, [sourceKey]);

  const activeCatalog =
    catalogs.find((catalog) => catalog.catalog_item_id === activeCatalogId) ??
    catalogs[0] ??
    null;
  const visibleValues = useMemo(
    () =>
      activeCatalog
        ? catalogValuesForItem(
            catalogValues,
            activeCatalog.catalog_item_id,
            search,
          )
        : [],
    [activeCatalog, catalogValues, search],
  );
  const targetPiValues = useMemo(
    () => catalogValuesForItem(catalogValues, targetPiCatalogId, ""),
    [catalogValues],
  );
  const planningFacetCatalogs = useMemo(
    () => planningFacetCatalogItems(sourceCatalog.items, activeCatalog),
    [activeCatalog, sourceCatalog.items],
  );
  const ownerRepoOptions = useMemo(
    () => repositoryOwnerRepoCatalogOptions(),
    [],
  );
  const selectedValue =
    visibleValues.find((value) => value.catalog_value_id === selectedValueId) ??
    visibleValues[0] ??
    null;
  const mutationValue = mutationDraft?.valueId
    ? (catalogValues.find(
        (value) => value.catalog_value_id === mutationDraft.valueId,
      ) ?? null)
    : null;
  const canMutateActiveCatalog =
    canSubmit && canDraftCatalogMutation(activeCatalog);
  const selectedDraftReceipt =
    selectedValue &&
    localDraftReceipt?.valueId === selectedValue.catalog_value_id
      ? localDraftReceipt
      : null;
  const canEditSelectedValue =
    canSubmit && canDraftCatalogValueMutation(activeCatalog, selectedValue, "edit");
  const canRetireSelectedValue =
    canSubmit && canDraftCatalogValueMutation(activeCatalog, selectedValue, "retire");
  const selectedTargetPiPlanningFacetSummary =
    selectedValue && planningFacetCatalogs.length > 0
      ? planningFacetCatalogs
          .map((catalog) => {
            const relatedValues = planningFacetValuesForTargetPi(
              catalogValues,
              catalog.catalog_item_id,
              selectedValue.value_key,
            );

            return `${catalog.label}: ${planningFacetValueSummary(relatedValues)}`;
          })
          .join(" · ")
      : null;
  const mutationPlanningFacetSummary =
    mutationValue && planningFacetCatalogs.length > 0
      ? planningFacetCatalogs
          .map((catalog) => {
            const relatedValues = planningFacetValuesForTargetPi(
              catalogValues,
              catalog.catalog_item_id,
              mutationValue.value_key,
            );

            return `${catalog.label}: ${planningFacetValueSummary(relatedValues)}`;
          })
          .join(" · ")
      : "PI Planning Date is managed as a Target PI facet through the platform/OpenProject owner route.";
  const canEditCatalogValue = useCallback(
    (value: DeliveryCatalogValue) =>
      canSubmit && canDraftCatalogValueMutation(activeCatalog, value, "edit"),
    [activeCatalog, canSubmit],
  );
  const canRetireCatalogValue = useCallback(
    (value: DeliveryCatalogValue) =>
      canSubmit && canDraftCatalogValueMutation(activeCatalog, value, "retire"),
    [activeCatalog, canSubmit],
  );
  const openAddDraft = useCallback(
    () => {
      setMutationError(null);
      setMutationDraft({ mode: "add", valueId: null });
    },
    [],
  );
  const openEditDraft = useCallback(
    (value: DeliveryCatalogValue) => {
      setMutationError(null);
      setMutationDraft({ mode: "edit", valueId: value.catalog_value_id });
    },
    [],
  );
  const openRetireDraft = useCallback(
    (value: DeliveryCatalogValue) => {
      setMutationError(null);
      setMutationDraft({ mode: "retire", valueId: value.catalog_value_id });
    },
    [],
  );

  function switchCatalog(catalogId: string) {
    setActiveCatalogId(catalogId);
    const firstValue = catalogValues.find(
      (value) => value.catalog_item_id === catalogId,
    );
    setSelectedValueId(firstValue?.catalog_value_id ?? "");
  }

  async function submitCatalogDraft({
    description,
    label,
    linkedRepository,
    parentCatalogValueKey,
    planningWindowEndDate,
    planningWindowStartDate,
    valueKey,
  }: CatalogMutationSubmit) {
    if (!canSubmit || !activeCatalog || !mutationDraft) {
      return;
    }

    const draft = {
      description,
      label,
      linkedRepository,
      parentCatalogValueKey,
      planningWindowEndDate,
      planningWindowStartDate,
      valueKey,
    };
    const draftKey = JSON.stringify({
      catalogItemId: activeCatalog.catalog_item_id,
      draft,
      mutationDraft,
      sourceRevision: sourceCatalog.source_revision,
    });
    if (pendingAcceptanceRef.current?.draftKey !== draftKey) {
      pendingAcceptanceRef.current = {
        acceptanceId: `catalog-acceptance:${crypto.randomUUID()}`,
        acceptedAt: new Date().toISOString(),
        draftKey,
      };
    }
    const acceptance = pendingAcceptanceRef.current;
    setMutationError(null);
    let result;
    try {
      result =
        liveRuntime.mode === "disconnected-preview"
          ? await submitCatalogMutationCommand({
              activeCatalog,
              catalogValues,
              draft,
              mutationDraft,
            })
          : await liveRuntime.mutate(activeCatalog.catalog_item_id, {
              acceptanceId: acceptance.acceptanceId,
              acceptedAt: acceptance.acceptedAt,
              draft,
              mode: mutationDraft.mode,
              targetValueId: mutationDraft.valueId,
            });
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "Catalog mutation failed.",
      );
      return;
    }

    if (!result) {
      return;
    }

    setCatalogValues(result.catalogValues);
    setSelectedValueId(result.selectedValueId);
    setSearch(result.search);
    setLocalDraftReceipt(result.localDraftReceipt);
    setMutationDraft(null);
    pendingAcceptanceRef.current = null;
  }

  return {
    activeCatalog,
    canEditCatalogValue,
    canEditSelectedValue,
    canMutateActiveCatalog,
    canRetireCatalogValue,
    canRetireSelectedValue,
    catalogValues,
    catalogs,
    closeMutationDraft: () => {
      setMutationDraft(null);
      setMutationError(null);
    },
    mutationDraft,
    mutationPlanningFacetSummary,
    mutationError,
    mutationValue,
    openAddDraft,
    openEditDraft,
    openRetireDraft,
    ownerRepoOptions,
    projectionError: liveRuntime.projectionError,
    runtimeMode: liveRuntime.mode,
    runtimeStatus: liveRuntime.projectionStatus,
    search,
    selectedDraftReceipt,
    selectedTargetPiPlanningFacetSummary,
    selectedValue,
    selectValue: (value: DeliveryCatalogValue) =>
      setSelectedValueId(value.catalog_value_id),
    setSearch,
    submitCatalogDraft,
    switchCatalog,
    targetPiValues,
    visibleValues,
  };
}
