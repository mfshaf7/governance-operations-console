"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  DeliveryCatalogValue,
  DeliveryReadModel,
} from "../../../read-model/index.ts";
import {
  getDeliveryCatalogRuntimeCapabilities,
  submitCatalogMutationCommand,
} from "../../../local-runtime/commands/catalog-mutation-runtime.ts";

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
  const runtimeCapabilities = getDeliveryCatalogRuntimeCapabilities();
  const [catalogValues, setCatalogValues] = useState(model.catalog.values);
  const catalogs = useMemo(
    () => editableCatalogItems(model.catalog.items),
    [model.catalog.items],
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
    () => planningFacetCatalogItems(model.catalog.items, activeCatalog),
    [activeCatalog, model.catalog.items],
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
    runtimeCapabilities.canSubmit && canDraftCatalogMutation(activeCatalog);
  const selectedDraftReceipt =
    selectedValue &&
    localDraftReceipt?.valueId === selectedValue.catalog_value_id
      ? localDraftReceipt
      : null;
  const canEditSelectedValue =
    runtimeCapabilities.canSubmit &&
    canDraftCatalogValueMutation(activeCatalog, selectedValue, "edit");
  const canRetireSelectedValue =
    runtimeCapabilities.canSubmit &&
    canDraftCatalogValueMutation(activeCatalog, selectedValue, "retire");
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
      runtimeCapabilities.canSubmit &&
      canDraftCatalogValueMutation(activeCatalog, value, "edit"),
    [activeCatalog, runtimeCapabilities.canSubmit],
  );
  const canRetireCatalogValue = useCallback(
    (value: DeliveryCatalogValue) =>
      runtimeCapabilities.canSubmit &&
      canDraftCatalogValueMutation(activeCatalog, value, "retire"),
    [activeCatalog, runtimeCapabilities.canSubmit],
  );
  const openAddDraft = useCallback(
    () => setMutationDraft({ mode: "add", valueId: null }),
    [],
  );
  const openEditDraft = useCallback(
    (value: DeliveryCatalogValue) =>
      setMutationDraft({ mode: "edit", valueId: value.catalog_value_id }),
    [],
  );
  const openRetireDraft = useCallback(
    (value: DeliveryCatalogValue) =>
      setMutationDraft({ mode: "retire", valueId: value.catalog_value_id }),
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
    parentCatalogValueKey,
    planningWindowEndDate,
    planningWindowStartDate,
    valueKey,
  }: CatalogMutationSubmit) {
    if (!runtimeCapabilities.canSubmit) {
      return;
    }

    const result = await submitCatalogMutationCommand({
      activeCatalog,
      catalogValues,
      draft: {
        description,
        label,
        parentCatalogValueKey,
        planningWindowEndDate,
        planningWindowStartDate,
        valueKey,
      },
      mutationDraft,
    });

    if (!result) {
      return;
    }

    setCatalogValues(result.catalogValues);
    setSelectedValueId(result.selectedValueId);
    setSearch(result.search);
    setLocalDraftReceipt(result.localDraftReceipt);
    setMutationDraft(null);
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
    closeMutationDraft: () => setMutationDraft(null),
    mutationDraft,
    mutationPlanningFacetSummary,
    mutationValue,
    openAddDraft,
    openEditDraft,
    openRetireDraft,
    ownerRepoOptions,
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
