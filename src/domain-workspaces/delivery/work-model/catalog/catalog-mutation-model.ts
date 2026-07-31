import type {
  DeliveryCatalogItem,
  DeliveryCatalogValue,
} from "../../domain/delivery-types.ts";
import type {
  CatalogDraftApplyResult,
  CatalogMutationDraft,
  CatalogMutationSubmit,
  DeliveryCatalogMutationMode,
} from "./catalog-mutation-types.ts";
import {
  formatPlanningWindowValueKey,
  isIterationCatalog,
  isOwnerRepoCatalog,
  isTargetPiCatalog,
  parentTargetPiValueKey,
  piPlanningDateCatalogId,
  targetPiCatalogId,
} from "./catalog-selectors.ts";
import {
  catalogRetirementReceiptLabel,
  catalogRetirementRequiresRequest,
} from "./catalog-retirement-model.ts";

export function canDraftCatalogMutation(catalog: DeliveryCatalogItem | null) {
  return (
    catalog !== null &&
    catalog.console_capability !== "read_only" &&
    catalog.console_capability !== "owner_routed"
  );
}

export function canDraftCatalogValueMutation(
  catalog: DeliveryCatalogItem | null,
  value: DeliveryCatalogValue | null,
  mode: Extract<DeliveryCatalogMutationMode, "edit" | "retire">,
) {
  if (!canDraftCatalogMutation(catalog) || value === null) {
    return false;
  }

  if (value.lifecycle_state === "read_only") {
    return false;
  }

  if (mode === "retire" && value.lifecycle_state === "retired") {
    return false;
  }

  return value.lifecycle_state !== "retired";
}

export function catalogValueMutationDisabledReason(
  catalog: DeliveryCatalogItem | null,
  value: DeliveryCatalogValue | null,
  mode: Extract<DeliveryCatalogMutationMode, "edit" | "retire">,
) {
  if (canDraftCatalogValueMutation(catalog, value, mode)) {
    return undefined;
  }

  if (!catalog) {
    return "Select a catalog before drafting a mutation.";
  }

  if (catalog.console_capability === "read_only") {
    return "This catalog is read-only in the console.";
  }

  if (catalog.console_capability === "owner_routed") {
    return "This catalog must be changed through the owner route.";
  }

  if (!value) {
    return "Select a value before drafting a mutation.";
  }

  if (value.lifecycle_state === "read_only") {
    return "This value is read-only in the console.";
  }

  if (value.lifecycle_state === "retired") {
    return mode === "retire"
      ? "This value is already retired."
      : "Retired values cannot be edited in the console.";
  }

  return "This value cannot be changed from the console.";
}

export function applyCatalogMutationDraft({
  activeCatalog,
  catalogValues,
  draft,
  localIdSeed,
  mutationDraft,
  recordedAt,
}: {
  activeCatalog: DeliveryCatalogItem | null;
  catalogValues: DeliveryCatalogValue[];
  draft: CatalogMutationSubmit;
  localIdSeed: string;
  mutationDraft: CatalogMutationDraft | null;
  recordedAt: string;
}): CatalogDraftApplyResult | null {
  if (!activeCatalog || !mutationDraft) {
    return null;
  }
  const catalog = activeCatalog;

  function resultFor({
    actionLabel,
    nextCatalogValues,
    valueId,
  }: {
    actionLabel: string;
    nextCatalogValues: DeliveryCatalogValue[];
    valueId: string;
  }): CatalogDraftApplyResult {
    return {
      catalogValues: nextCatalogValues,
      localDraftReceipt: {
        actionLabel,
        linkedRepository: draft.linkedRepository ?? null,
        recordedAt,
        route: catalog.backend_route,
        valueId,
      },
      search: "",
      selectedValueId: valueId,
    };
  }

  if (mutationDraft.mode === "add") {
    const parentTargetPiKey =
      isIterationCatalog(catalog) && draft.parentCatalogValueKey
        ? draft.parentCatalogValueKey
        : null;
    const planningWindowValueKey = isTargetPiCatalog(catalog)
      ? formatPlanningWindowValueKey(
          draft.planningWindowStartDate ?? "",
          draft.planningWindowEndDate ?? "",
        )
      : "";
    const ownerRepoRequest = isOwnerRepoCatalog(catalog)
      ? (draft.linkedRepository ?? null)
      : null;
    const newValue: DeliveryCatalogValue = {
      catalog_item_id: catalog.catalog_item_id,
      catalog_value_id: `catalog-value-local-${localIdSeed}`,
      description: draft.description,
      evidence_refs: [
        "prototype-local://delivery-catalog/draft",
        ...(draft.linkedRepository ? [draft.linkedRepository.repoRef] : []),
      ],
      label: draft.label,
      last_projected_at: null,
      lifecycle_state: "admitted",
      parent_catalog_item_id: parentTargetPiKey ? targetPiCatalogId : null,
      parent_catalog_value_key: parentTargetPiKey,
      tone: catalog.gap_status === "missing_backend_route" ? "warn" : "ok",
      usage_count: 0,
      usage_summary: ownerRepoRequest
        ? `Linked to Repository record ${ownerRepoRequest.id}; sync is required before Execution can apply this owner_repo value.`
        : "New value is not used by any projected Delivery package yet.",
      value_key: draft.valueKey,
    };
    const newPlanningWindowValue: DeliveryCatalogValue | null =
      planningWindowValueKey
        ? {
            catalog_item_id: piPlanningDateCatalogId,
            catalog_value_id: `catalog-value-local-pi-window-${localIdSeed}`,
            description: `Prototype-local planning date window for ${draft.valueKey}.`,
            evidence_refs: ["prototype-local://delivery-catalog/draft"],
            label: `${draft.valueKey} Planning Window`,
            last_projected_at: null,
            lifecycle_state: "admitted",
            parent_catalog_item_id: targetPiCatalogId,
            parent_catalog_value_key: draft.valueKey,
            tone: "warn",
            usage_count: 0,
            usage_summary:
              "Planning window staged locally; backend owner route must persist the PI date range.",
            value_key: planningWindowValueKey,
          }
        : null;
    const nextCatalogValues = newPlanningWindowValue
      ? [...catalogValues, newValue, newPlanningWindowValue]
      : [...catalogValues, newValue];

    return resultFor({
      actionLabel: "Add staged",
      nextCatalogValues,
      valueId: newValue.catalog_value_id,
    });
  }

  if (mutationDraft.mode === "edit" && mutationDraft.valueId) {
    const currentValue =
      catalogValues.find(
        (value) => value.catalog_value_id === mutationDraft.valueId,
      ) ?? null;
    const previousValueKey = currentValue?.value_key ?? draft.valueKey;
    const ownerRepoRequest = isOwnerRepoCatalog(catalog)
      ? (draft.linkedRepository ?? null)
      : null;
    const planningWindowValueKey = isTargetPiCatalog(catalog)
      ? formatPlanningWindowValueKey(
          draft.planningWindowStartDate ?? "",
          draft.planningWindowEndDate ?? "",
        )
      : "";
    let planningWindowUpdated = false;
    const updatedValues = catalogValues.map((value): DeliveryCatalogValue => {
      if (value.catalog_value_id === mutationDraft.valueId) {
        return {
          ...value,
          description: draft.description,
          evidence_refs: ownerRepoRequest
            ? [
                "prototype-local://delivery-catalog/draft",
                ownerRepoRequest.repoRef,
              ]
            : value.evidence_refs,
          label: draft.label,
          last_projected_at: null,
          lifecycle_state: "admitted",
          parent_catalog_item_id:
            isIterationCatalog(catalog) && draft.parentCatalogValueKey
              ? targetPiCatalogId
              : value.parent_catalog_item_id,
          parent_catalog_value_key:
            isIterationCatalog(catalog) && draft.parentCatalogValueKey
              ? draft.parentCatalogValueKey
              : value.parent_catalog_value_key,
          tone: "warn",
          usage_summary: ownerRepoRequest
            ? `Linked to Repository record ${ownerRepoRequest.id}; sync is required before Execution can apply this owner_repo value.`
            : "Prototype-local edit is staged for backend submission.",
          value_key: draft.valueKey,
        };
      }

      if (
        planningWindowValueKey &&
        value.catalog_item_id === piPlanningDateCatalogId &&
        parentTargetPiValueKey(value) === previousValueKey
      ) {
        planningWindowUpdated = true;
        return {
          ...value,
          description: `Prototype-local planning date window for ${draft.valueKey}.`,
          label: `${draft.valueKey} Planning Window`,
          last_projected_at: null,
          lifecycle_state: "admitted",
          parent_catalog_item_id: targetPiCatalogId,
          parent_catalog_value_key: draft.valueKey,
          tone: "warn",
          usage_summary:
            "Planning window edit is staged for backend submission.",
          value_key: planningWindowValueKey,
        };
      }

      return value;
    });
    const appendedPlanningWindowValue: DeliveryCatalogValue | null =
      planningWindowValueKey && !planningWindowUpdated
        ? {
            catalog_item_id: piPlanningDateCatalogId,
            catalog_value_id: `catalog-value-local-pi-window-${localIdSeed}`,
            description: `Prototype-local planning date window for ${draft.valueKey}.`,
            evidence_refs: ["prototype-local://delivery-catalog/draft"],
            label: `${draft.valueKey} Planning Window`,
            last_projected_at: null,
            lifecycle_state: "admitted",
            parent_catalog_item_id: targetPiCatalogId,
            parent_catalog_value_key: draft.valueKey,
            tone: "warn",
            usage_count: 0,
            usage_summary:
              "Planning window staged locally; backend owner route must persist the PI date range.",
            value_key: planningWindowValueKey,
          }
        : null;
    const nextCatalogValues = appendedPlanningWindowValue
      ? [...updatedValues, appendedPlanningWindowValue]
      : updatedValues;

    return resultFor({
      actionLabel: "Update staged",
      nextCatalogValues,
      valueId: mutationDraft.valueId,
    });
  }

  if (mutationDraft.mode === "retire" && mutationDraft.valueId) {
    const selectedValue =
      catalogValues.find(
        (value) => value.catalog_value_id === mutationDraft.valueId,
      ) ?? null;
    const nextCatalogValues = catalogValues.map(
      (value): DeliveryCatalogValue =>
        value.catalog_value_id === mutationDraft.valueId
          ? {
              ...value,
              last_projected_at: null,
              lifecycle_state: catalogRetirementRequiresRequest(value)
                ? value.lifecycle_state
                : "retired",
              tone: catalogRetirementRequiresRequest(value) ? "warn" : "muted",
              usage_summary: catalogRetirementRequiresRequest(value)
                ? `${value.usage_count} projected references require migration, replacement, or accepted historical use before final retirement. Projection sync must confirm the catalog and package read models agree.`
                : "No projected references block retirement. Projection sync must confirm the final catalog state.",
            }
          : value,
    );

    return resultFor({
      actionLabel: catalogRetirementReceiptLabel(selectedValue),
      nextCatalogValues,
      valueId: mutationDraft.valueId,
    });
  }

  return null;
}
