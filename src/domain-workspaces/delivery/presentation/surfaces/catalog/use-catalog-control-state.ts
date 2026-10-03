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
import {
  catalogRepositoryReadiness,
  catalogUnavailableReadModel,
} from "../../../live-runtime/catalog-live-contract.ts";
import type { CatalogDeliveryLinkTarget } from "../../../live-runtime/catalog-live-types.ts";
import { useDeliveryChangeLiveRuntime } from "../../../live-runtime/use-delivery-change-live-runtime.ts";
import type { DeliveryChangeResult } from "../../../live-runtime/delivery-change-live-types.ts";

import { repositoryOwnerRepoCatalogOptions } from "@/domain-workspaces/operation-integrations/repository-owner-repo-catalog-projection";
import {
  canDraftCatalogMutation,
  canDraftCatalogValueMutation,
  catalogValuesForItem,
  editableCatalogItems,
  isOwnerRepoCatalog,
  planningFacetCatalogItems,
  planningFacetValueSummary,
  planningFacetValuesForTargetPi,
  targetPiCatalogId,
  type CatalogLocalDraftReceipt,
  type CatalogMutationDraft,
  type CatalogMutationSubmit,
} from "./catalog-view-model.ts";
export function useCatalogControlState(
  model: DeliveryReadModel,
  deliveryLinkTarget: CatalogDeliveryLinkTarget | null = null,
) {
  const localRuntimeCapabilities = getDeliveryCatalogRuntimeCapabilities();
  const liveRuntime = useCatalogLiveRuntime();
  const deliveryChangeRuntime = useDeliveryChangeLiveRuntime(
    deliveryLinkTarget?.deliveryId ?? null,
  );
  const pendingAcceptanceRef = useRef<{
    acceptanceId: string;
    acceptedAt: string;
    draftKey: string;
  } | null>(null);
  const repositoryLinkAcceptanceRef = useRef<{
    acceptanceId: string;
    acceptedAt: string;
    key: string;
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
  const [repositoryLinkOpen, setRepositoryLinkOpen] = useState(false);
  const [repositoryLinkNote, setRepositoryLinkNote] = useState("");
  const [repositoryLinkError, setRepositoryLinkError] = useState<string | null>(
    null,
  );
  const [repositoryLinkPending, setRepositoryLinkPending] = useState(false);
  const [repositoryLinkResult, setRepositoryLinkResult] =
    useState<DeliveryChangeResult | null>(null);

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
  const selectedOwnerRepository = selectedValue
    ? (ownerRepoOptions.find(
        (option) => option.valueKey === selectedValue.value_key,
      ) ?? null)
    : null;
  const selectedOwnerRepositoryReadiness = catalogRepositoryReadiness(
    liveRuntime.projection?.values.find(
      (value) =>
        value.catalog_value_id === selectedValue?.catalog_value_id &&
        value.catalog_item_id === selectedValue?.catalog_item_id,
    ),
  );
  const repositoryLinkBlockedReason = !deliveryLinkTarget
    ? "Open Catalog from an Execution Board Owner Repo action to link a work item."
    : liveRuntime.mode !== "live" || liveRuntime.projectionStatus !== "current"
      ? "Canonical Catalog truth is unavailable."
      : deliveryChangeRuntime.mode !== "live" ||
          deliveryChangeRuntime.projectionStatus !== "current"
        ? "Canonical Delivery change truth is unavailable."
        : !isOwnerRepoCatalog(activeCatalog)
          ? "Select the Owner Repo Catalog."
          : !selectedValue
            ? "Select an Owner Repo value."
            : !selectedOwnerRepository
              ? "The Catalog value does not match an admitted Repository record."
              : !selectedOwnerRepositoryReadiness
                ? "The selected Owner Repo has no current WGCF readiness receipt."
                : null;
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

  useEffect(() => {
    if (!deliveryLinkTarget) return;
    const ownerRepoCatalog = catalogs.find(isOwnerRepoCatalog);
    if (!ownerRepoCatalog) return;
    setActiveCatalogId(ownerRepoCatalog.catalog_item_id);
    const firstValue = sourceCatalog.values.find(
      (value) => value.catalog_item_id === ownerRepoCatalog.catalog_item_id,
    );
    setSelectedValueId(firstValue?.catalog_value_id ?? "");
    setSearch("");
    setRepositoryLinkOpen(false);
    setRepositoryLinkNote("");
    setRepositoryLinkError(null);
    setRepositoryLinkResult(null);
    repositoryLinkAcceptanceRef.current = null;
  }, [catalogs, deliveryLinkTarget, sourceKey]);

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

  async function submitRepositoryLink() {
    if (
      repositoryLinkBlockedReason ||
      !deliveryLinkTarget ||
      !activeCatalog ||
      !selectedValue ||
      !selectedOwnerRepository ||
      !selectedOwnerRepositoryReadiness ||
      !repositoryLinkNote.trim()
    ) {
      return;
    }

    setRepositoryLinkPending(true);
    setRepositoryLinkError(null);
    try {
      const acceptanceKey = JSON.stringify({
        catalogItemId: activeCatalog.catalog_item_id,
        note: repositoryLinkNote.trim(),
        readinessReceipt: selectedOwnerRepositoryReadiness.receipt.uri,
        target: deliveryLinkTarget,
        valueId: selectedValue.catalog_value_id,
      });
      if (repositoryLinkAcceptanceRef.current?.key !== acceptanceKey) {
        repositoryLinkAcceptanceRef.current = {
          acceptanceId: `catalog-acceptance:${crypto.randomUUID()}`,
          acceptedAt: new Date().toISOString(),
          key: acceptanceKey,
        };
      }
      const acceptance = repositoryLinkAcceptanceRef.current;
      const result = await deliveryChangeRuntime.apply(
        {
          payload: {
            catalog_item_id: activeCatalog.catalog_item_id,
            catalog_request: {
              acceptanceId: acceptance.acceptanceId,
              acceptedAt: acceptance.acceptedAt,
              draft: {
                description: selectedValue.description,
                label: selectedValue.label,
                linkedRepository: selectedOwnerRepository,
                parentCatalogValueKey:
                  selectedValue.parent_catalog_value_key ?? null,
                valueKey: selectedValue.value_key,
              },
              mode: "edit",
              repositoryReadiness: selectedOwnerRepositoryReadiness,
              targetValueId: selectedValue.catalog_value_id,
            },
            owner_repo: selectedValue.value_key,
            work_item_id: deliveryLinkTarget.workItemId,
          },
          type: "link_repository",
        },
        repositoryLinkNote.trim(),
      );
      if (!result) {
        throw new Error(
          "Repository linking requires the configured live Delivery path.",
        );
      }
      setRepositoryLinkResult(result);
      if (result.status === "applied") {
        repositoryLinkAcceptanceRef.current = null;
      }
      if (result.status !== "applied") {
        setRepositoryLinkError(
          `Repository link ${result.status.replace("_", " ")}. ${result.next_action.label}.`,
        );
      }
      await liveRuntime.refresh();
    } catch (error) {
      setRepositoryLinkError(
        error instanceof Error
          ? error.message
          : "Repository link command failed.",
      );
    } finally {
      setRepositoryLinkPending(false);
    }
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
    repositoryLink: {
      blockedReason: repositoryLinkBlockedReason,
      close: () => setRepositoryLinkOpen(false),
      error: repositoryLinkError,
      note: repositoryLinkNote,
      onNoteChange: setRepositoryLinkNote,
      onOpen: () => {
        setRepositoryLinkError(null);
        setRepositoryLinkResult(null);
        setRepositoryLinkOpen(true);
      },
      onSubmit: submitRepositoryLink,
      open: repositoryLinkOpen,
      pending: repositoryLinkPending,
      readiness: selectedOwnerRepositoryReadiness,
      repository: selectedOwnerRepository,
      result: repositoryLinkResult,
      target: deliveryLinkTarget,
    },
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
