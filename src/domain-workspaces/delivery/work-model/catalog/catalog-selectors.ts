import type {
  DeliveryCatalogItem,
  DeliveryCatalogValue,
} from "../../domain/delivery-types.ts";

const editableGroupIds = [
  "classification",
  "metadata",
  "organization",
  "planning",
];

export const targetPiCatalogId = "catalog-target-pi";
export const piPlanningDateCatalogId = "catalog-pi-planning-date";
export const iterationCatalogId = "catalog-iteration";
export const initiativeFamilyCatalogId = "catalog-initiative-family";
export const deliveryTeamCatalogId = "catalog-delivery-team";
export const ownerRepoCatalogId = "catalog-owner-repo";
export const principalLookupCatalogId = "catalog-principal-lookup";

const targetPiFacetCatalogIds = [piPlanningDateCatalogId];

export function editableCatalogItems(items: DeliveryCatalogItem[]) {
  return items.filter(
    (item) =>
      editableGroupIds.includes(item.group_id) &&
      !targetPiFacetCatalogIds.includes(item.catalog_item_id),
  );
}

export function catalogValuesForItem(
  values: DeliveryCatalogValue[],
  catalogItemId: string,
  search: string,
) {
  const normalizedSearch = search.trim().toLowerCase();

  return values.filter((value) => {
    const matchesCatalog = value.catalog_item_id === catalogItemId;
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [
        value.description,
        value.label,
        value.lifecycle_state,
        value.usage_summary,
        value.value_key,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);

    return matchesCatalog && matchesSearch;
  });
}

export function isTargetPiCatalog(catalog: DeliveryCatalogItem | null) {
  return catalog?.catalog_item_id === targetPiCatalogId;
}

export function isIterationCatalog(catalog: DeliveryCatalogItem | null) {
  return catalog?.catalog_item_id === iterationCatalogId;
}

export function isInitiativeFamilyCatalog(catalog: DeliveryCatalogItem | null) {
  return catalog?.catalog_item_id === initiativeFamilyCatalogId;
}

export function isDeliveryTeamCatalog(catalog: DeliveryCatalogItem | null) {
  return catalog?.catalog_item_id === deliveryTeamCatalogId;
}

export function isOwnerRepoCatalog(catalog: DeliveryCatalogItem | null) {
  return catalog?.catalog_item_id === ownerRepoCatalogId;
}

export function parentTargetPiValueKey(value: DeliveryCatalogValue | null) {
  if (!value) {
    return null;
  }

  if (
    value.parent_catalog_item_id === targetPiCatalogId &&
    value.parent_catalog_value_key
  ) {
    return value.parent_catalog_value_key;
  }

  return null;
}

export function planningFacetCatalogItems(
  items: DeliveryCatalogItem[],
  catalog: DeliveryCatalogItem | null,
) {
  if (!isTargetPiCatalog(catalog)) {
    return [];
  }

  return items.filter((item) =>
    targetPiFacetCatalogIds.includes(item.catalog_item_id),
  );
}

export function planningFacetValuesForTargetPi(
  values: DeliveryCatalogValue[],
  facetCatalogItemId: string,
  targetPiValueKey: string,
) {
  return values.filter(
    (value) =>
      value.catalog_item_id === facetCatalogItemId &&
      parentTargetPiValueKey(value) === targetPiValueKey,
  );
}

export function planningFacetValueSummary(values: DeliveryCatalogValue[]) {
  if (values.length === 0) {
    return "No backend value projected for this Target PI.";
  }

  return values.map((value) => `${value.label}: ${value.value_key}`).join("; ");
}

export function planningWindowForTargetPi(
  values: DeliveryCatalogValue[],
  targetPiValueKey: string | null,
) {
  if (!targetPiValueKey) {
    return {
      endDate: "",
      startDate: "",
      value: null,
    };
  }

  const value =
    values.find(
      (candidate) =>
        candidate.catalog_item_id === piPlanningDateCatalogId &&
        parentTargetPiValueKey(candidate) === targetPiValueKey,
    ) ?? null;
  const [startDate = "", endDate = ""] = value?.value_key.split("..") ?? [];

  return {
    endDate,
    startDate,
    value,
  };
}

export function formatPlanningWindowValueKey(
  startDate: string,
  endDate: string,
) {
  if (!startDate || !endDate) {
    return "";
  }

  return `${startDate}..${endDate}`;
}
