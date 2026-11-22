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
  iterationCatalogId,
  parentTargetPiValueKey,
  planningWindowForTargetPi,
  piPlanningDateCatalogId,
  targetPiCatalogId,
} from "./catalog-selectors.ts";
import { iterationWindows, overlappingPlanningIncrement } from "./planning-calendar.ts";
import {
  catalogRetirementReceiptLabel,
  catalogRetirementBlocked,
} from "./catalog-retirement-model.ts";

export function canDraftCatalogMutation(catalog: DeliveryCatalogItem | null) {
  return (
    catalog !== null &&
    !isIterationCatalog(catalog) &&
    !["read_only", "retired", "stale", "missing"].includes(catalog.lifecycle_state) &&
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

  if (["read_only", "stale", "missing"].includes(value.lifecycle_state) || (mode === "retire" && value.usage_count > 0)) {
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

  if (mode === "retire" && value && value.usage_count > 0) return `Used by ${value.usage_count} records. Reassign their values before retiring this one.`;
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
  if (isIterationCatalog(catalog)) return null;
  const editsCalendar = isTargetPiCatalog(catalog) && mutationDraft.mode !== "retire";
  const generatesCalendar = draft.iterationLengthDays !== undefined || draft.iterationCount !== undefined;
  const startDate = draft.planningWindowStartDate ?? "";
  const calendarWindows = generatesCalendar
    ? iterationWindows(startDate, draft.iterationLengthDays ?? 0, draft.iterationCount ?? 0) : [];
  if (generatesCalendar && (!editsCalendar || !calendarWindows.length)) {
    throw new Error("Choose a start date, number of iterations and iteration length.");
  }
  const endDate = calendarWindows.at(-1)?.end_date ?? draft.planningWindowEndDate ?? "";
  if (generatesCalendar && draft.planningWindowEndDate && draft.planningWindowEndDate !== endDate) {
    throw new Error("The end date must match the number and length of full iterations.");
  }
  if (editsCalendar) {
    const pi = mutationDraft.valueId
      ? catalogValues.find(value => value.catalog_value_id === mutationDraft.valueId)?.value_key ?? "" : draft.valueKey;
    const previous = planningWindowForTargetPi(catalogValues, pi);
    if (!generatesCalendar && (mutationDraft.mode === "add" ||
        (startDate && startDate !== previous.startDate) ||
        (endDate && endDate !== previous.endDate))) {
      throw new Error("Save an iteration calendar to create a PI or change its dates.");
    }
    const hasDatedIterations = catalogValues.some(value => value.catalog_item_id === iterationCatalogId &&
      value.parent_catalog_value_key === pi && value.lifecycle_state !== "retired" && value.iteration_window);
    if (hasDatedIterations && (pi !== draft.valueKey || (generatesCalendar && (startDate !== previous.startDate || endDate !== previous.endDate)))) {
      throw new Error("This PI already has dated iterations. Keep its recorded name and date window.");
    }
    const overlap = generatesCalendar ? overlappingPlanningIncrement(startDate, endDate, pi, catalogValues) : null;
    if (overlap) throw new Error(`These dates overlap the calendar for ${overlap}.`);
  }

  function resultFor({
    actionLabel,
    nextCatalogValues,
    valueId,
  }: {
    actionLabel: string;
    nextCatalogValues: DeliveryCatalogValue[];
    valueId: string;
  }): CatalogDraftApplyResult {
    if (calendarWindows.length) {
      nextCatalogValues = [...nextCatalogValues];
      for (const window of calendarWindows) {
        const label = `Iteration ${window.sequence}`;
        const key = `${draft.valueKey} / ${label}`;
        const existingIndex = nextCatalogValues.findIndex(value => value.catalog_item_id === iterationCatalogId && value.value_key === key);
        const existing = nextCatalogValues[existingIndex];
        if (existing && (existing.lifecycle_state === "retired" || (existing.iteration_window &&
          (existing.iteration_window.start_date !== window.start_date || existing.iteration_window.end_date !== window.end_date)))) {
          throw new Error(`${key} already has a different calendar or status.`);
        }
        const value: DeliveryCatalogValue = {
          ...(existing ?? {
          catalog_item_id: iterationCatalogId,
          catalog_value_id: `catalog-value-local-${localIdSeed}-iteration-${window.sequence}`,
          description: "",
          evidence_refs: [],
          last_projected_at: null,
          lifecycle_state: "active",
          tone: "ok",
          usage_count: 0,
          usage_summary: "No Delivery records use this value.",
          value_key: key,
          }),
          label,
          parent_catalog_item_id: targetPiCatalogId,
          parent_catalog_value_key: draft.valueKey,
          iteration_window: window,
        };
        if (existing) nextCatalogValues[existingIndex] = value;
        else nextCatalogValues.push(value);
      }
    }
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
    const planningWindowValueKey = isTargetPiCatalog(catalog)
      ? formatPlanningWindowValueKey(
          startDate,
          endDate,
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
      parent_catalog_item_id: null,
      parent_catalog_value_key: null,
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
    const previousWindow = planningWindowForTargetPi(catalogValues, previousValueKey);
    const planningWindowValueKey = isTargetPiCatalog(catalog) && (generatesCalendar || previousValueKey !== draft.valueKey)
      ? formatPlanningWindowValueKey(startDate || previousWindow.startDate, endDate || previousWindow.endDate)
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
    if (!selectedValue || catalogRetirementBlocked(selectedValue)) return null;
    const nextCatalogValues = catalogValues.map(
      (value): DeliveryCatalogValue =>
        value.catalog_value_id === mutationDraft.valueId
          ? {
              ...value,
              last_projected_at: null,
              lifecycle_state: "retired",
              tone: "muted",
              usage_summary: "Retired in this preview; no canonical records were changed.",
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
