import type { TerasMetadataItem } from "@/teras";

import type {
  DeliveryCatalogItem,
  DeliveryCatalogValue,
  DeliveryTone,
} from "../../../read-model/index.ts";

import type { DeliveryCatalogMutationMode } from "../../../work-model/catalog/catalog-mutation-types.ts";
import {
  isIterationCatalog,
  isTargetPiCatalog,
  parentTargetPiValueKey,
  principalLookupCatalogId,
} from "../../../work-model/catalog/catalog-selectors.ts";
import {
  catalogRetirementReceiptLabel,
  catalogRetirementRequiresRequest,
} from "../../../work-model/catalog/catalog-retirement-model.ts";

export { catalogRetirementReceiptLabel, catalogRetirementRequiresRequest };

export function catalogItemTone(item: DeliveryCatalogItem): DeliveryTone {
  if (item.console_capability === "owner_routed") {
    return "info";
  }

  if (item.console_capability === "read_only") {
    return "muted";
  }

  switch (item.gap_status) {
    case "backend_created":
    case "console_requestable":
      return "ok";
    case "form_option_missing":
    case "missing_backend_route":
    case "projection_drift":
    case "stale_projection":
      return "warn";
    case "owner_routed":
      return "info";
    case "read_only":
      return "muted";
  }
}

export function catalogCapabilityLabel(
  capability: DeliveryCatalogItem["console_capability"],
) {
  switch (capability) {
    case "create":
      return "Create";
    case "owner_routed":
      return "Owner route";
    case "read_only":
      return "Read only";
    case "request":
      return "Request";
  }
}

export function catalogChangeRule(catalog: DeliveryCatalogItem | null) {
  if (!catalog) {
    return "Select a catalog to inspect its mutation authority.";
  }

  switch (catalog.console_capability) {
    case "create":
      return "Console can prepare a backend-created value draft.";
    case "owner_routed":
      return "Change through the owner route; console only inspects usage here.";
    case "read_only":
      return "Read-only because this value set is owned by a policy, workflow, projection, or backing-system contract.";
    case "request":
      return "Console can prepare a request; backend owner decides durable creation, update, or retirement.";
  }
}

export function catalogPrimaryMutationActionLabel(
  catalog: DeliveryCatalogItem | null,
) {
  if (!catalog) {
    return "Add Value";
  }

  switch (catalog.console_capability) {
    case "create":
      return "Add Value";
    case "request":
      return "Request Value";
    case "owner_routed":
      return "Owner Route";
    case "read_only":
      return "Read Only";
  }
}

export function catalogPrimaryMutationDisabledReason(
  catalog: DeliveryCatalogItem | null,
) {
  if (!catalog) {
    return "Select a catalog before preparing a catalog mutation.";
  }

  if (catalog.console_capability === "owner_routed") {
    if (catalog.catalog_item_id === principalLookupCatalogId) {
      return "Assignable principals are identity and project membership values. Request them through the identity/OpenProject owner route.";
    }

    return "This catalog must be changed through its owner route.";
  }

  if (catalog.console_capability === "read_only") {
    return "This catalog is read-only because it is owned by a policy, workflow, projection, or backing-system contract.";
  }

  return undefined;
}

export function catalogValueChangeRule(
  catalog: DeliveryCatalogItem | null,
  value: DeliveryCatalogValue | null,
) {
  if (!value) {
    return catalogChangeRule(catalog);
  }

  if (value.lifecycle_state === "read_only") {
    return "This value is read-only because it is a policy-fixed, system-projected, or historical compatibility value.";
  }

  if (value.lifecycle_state === "retired") {
    return "This value is retired and remains visible for audit/history only.";
  }

  return catalogChangeRule(catalog);
}

export function catalogLifecycleLabel(
  lifecycleState: DeliveryCatalogValue["lifecycle_state"],
) {
  return lifecycleState.replaceAll("_", " ");
}

export function catalogLifecycleTone(
  lifecycleState: DeliveryCatalogValue["lifecycle_state"],
): DeliveryTone {
  switch (lifecycleState) {
    case "active":
      return "ok";
    case "admitted":
      return "warn";
    case "missing":
      return "danger";
    case "read_only":
    case "retired":
      return "muted";
    case "stale":
      return "stale";
  }
}

export function catalogMutationTitle(
  mode: DeliveryCatalogMutationMode,
  catalog: DeliveryCatalogItem | null,
  value: DeliveryCatalogValue | null,
) {
  const subject = value?.label ?? catalog?.label ?? "Catalog Value";

  switch (mode) {
    case "add":
      if (catalog?.console_capability === "request") {
        return `Request ${catalog.label} Value`;
      }

      return `Add ${catalog?.label ?? "Catalog"} Value`;
    case "edit":
      return `Edit ${subject}`;
    case "retire":
      if (catalogRetirementRequiresRequest(value)) {
        return `Request Retirement for ${subject}`;
      }

      return `Retire ${subject}`;
  }
}

export function catalogMutationDescription(
  mode: DeliveryCatalogMutationMode,
  value?: DeliveryCatalogValue | null,
  catalog?: DeliveryCatalogItem | null,
) {
  switch (mode) {
    case "add":
      if (catalog?.console_capability === "request") {
        return "Prepare a prototype-local catalog request. The backend owner decides durable creation, update, or retirement.";
      }

      return "Prepare a prototype-local catalog value. The real submit path must call the backend route shown below.";
    case "edit":
      return "Prepare a prototype-local catalog value update. The backend owner remains the authority for durable mutation.";
    case "retire":
      if (catalogRetirementRequiresRequest(value ?? null)) {
        return "Prepare a retirement request. Existing package usage must be migrated or explicitly accepted before durable retirement, then projection must resync.";
      }

      return "Prepare a direct retirement draft. Backend acceptance and projection sync must confirm the value is no longer available.";
  }
}

export function catalogMutationActionLabel(
  mode: DeliveryCatalogMutationMode,
  value?: DeliveryCatalogValue | null,
  catalog?: DeliveryCatalogItem | null,
) {
  switch (mode) {
    case "add":
      if (catalog?.console_capability === "request") {
        return "Draft Request";
      }

      return "Draft Add";
    case "edit":
      return "Draft Update";
    case "retire":
      if (catalogRetirementRequiresRequest(value ?? null)) {
        return "Request Retirement";
      }

      return "Draft Retire";
  }
}

export function catalogRetirementActionLabel(
  value: DeliveryCatalogValue | null,
) {
  return catalogRetirementRequiresRequest(value)
    ? "Request Retirement"
    : "Retire";
}

export function catalogRetirementTableActionLabel(
  catalog: DeliveryCatalogItem | null,
  value: DeliveryCatalogValue | null,
) {
  if (catalog?.console_capability === "owner_routed") {
    return "Owner Route";
  }

  if (
    catalog?.console_capability === "read_only" ||
    value?.lifecycle_state === "read_only"
  ) {
    return "Read Only";
  }

  if (value?.lifecycle_state === "retired") {
    return "Retired";
  }

  return catalogRetirementRequiresRequest(value) ? "Request" : "Retire";
}

export function catalogRetirementPath(value: DeliveryCatalogValue | null) {
  if (!value) {
    return "Select a value before choosing a retirement path.";
  }

  if (catalogRetirementRequiresRequest(value)) {
    return `${value.usage_count} projected references require migration, replacement, or accepted historical use before final retirement.`;
  }

  return "Direct retirement is allowed because no projected package currently uses this value.";
}

export function catalogRetirementProjectionCheckpoint(
  value: DeliveryCatalogValue | null,
) {
  if (!value) {
    return "Projection checkpoint cannot run until a value is selected.";
  }

  if (catalogRetirementRequiresRequest(value)) {
    return "Required after migration/backfill and backend acceptance; keep the value available until projection confirms no active dependency.";
  }

  return "Required after backend retirement so catalog values and package projections agree.";
}

export function catalogDraftReceiptMetadata({
  actionLabel,
  linkedRepository,
  recordedAt,
  route,
}: {
  actionLabel: string;
  linkedRepository?: {
    id: string;
    owner: string;
    repoRef: string;
    valueKey: string;
  } | null;
  recordedAt: string;
  route: string;
}): TerasMetadataItem[] {
  return [
    {
      label: "Receipt",
      value: `${actionLabel} at ${recordedAt}; backend route: ${route}`,
    },
    ...(linkedRepository
      ? [
          {
            label: "Linked Repo",
            value: `${linkedRepository.valueKey} / ${linkedRepository.owner}`,
          },
          {
            label: "Repo Ref",
            value: linkedRepository.repoRef,
          },
        ]
      : []),
  ];
}

export function catalogValueMetadata(
  catalog: DeliveryCatalogItem,
  value: DeliveryCatalogValue,
): TerasMetadataItem[] {
  return [
    { label: "Value Key", value: value.value_key },
    { label: "Used By", value: `${value.usage_count} records` },
    ...(isIterationCatalog(catalog)
      ? [
          {
            label: "Target PI Link",
            value: parentTargetPiValueKey(value) ?? "Missing Target PI link",
          },
        ]
      : []),
  ];
}

export function catalogAuthorityMetadata(
  catalog: DeliveryCatalogItem,
  value: DeliveryCatalogValue,
): TerasMetadataItem[] {
  return [
    {
      label: "Backend Capability",
      value: catalogCapabilityLabel(catalog.console_capability),
    },
    {
      label: "Change Rule",
      value: catalogValueChangeRule(catalog, value),
    },
    { label: "Backend Owner", value: catalog.create_authority },
    { label: "Backend Route", value: catalog.backend_route },
    { label: "Owner Route", value: catalog.owner_route },
  ];
}

export function catalogRelatedContextMetadata({
  catalog,
  planningFacetSummary,
  value,
}: {
  catalog: DeliveryCatalogItem;
  planningFacetSummary: string | null;
  value: DeliveryCatalogValue;
}): TerasMetadataItem[] {
  return [
    ...(isTargetPiCatalog(catalog) && planningFacetSummary
      ? [{ label: "Planning Facets", value: planningFacetSummary }]
      : []),
    {
      label: "Usage Before Delete",
      value: value.usage_summary,
    },
  ];
}
