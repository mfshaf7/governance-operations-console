import { deliveryFieldDisplayLabel } from "../../../read-model/terms/copy.ts";
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
  catalogRetirementBlocked,
} from "../../../work-model/catalog/catalog-retirement-model.ts";

export { catalogRetirementReceiptLabel, catalogRetirementBlocked };

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
      return "Editable";
    case "owner_routed":
      return "System managed";
    case "read_only":
      return "System managed";
    case "request":
      return "Editable";
  }
}

export function catalogChangeRule(catalog: DeliveryCatalogItem | null) {
  if (!catalog) {
    return "Select a catalog to inspect its mutation authority.";
  }

  if (["read_only", "owner_routed"].includes(catalog.console_capability)) {
    switch (catalog.catalog_item_id) {
      case "catalog-lineage-role": return "These roles have matching Delivery validation rules. Select an existing role when planning work; adding a role also requires defining its rules.";
      case "catalog-pi-objective-type": return "Committed and Stretch are the supported objective types. Select a type on a PI Objective; Catalog does not redefine these planning rules.";
      case "catalog-blocker-disposition": return "Remove, Workaround, Accept Risk and Defer are the supported blocker outcomes. Choose one in the blocker workflow; adding a label here would not implement a new outcome.";
      case "catalog-principal-lookup": return "Use Manage Members to add existing users or groups and change their project access. Assignable people are read from OpenProject membership.";
    }
  }
  switch (catalog.console_capability) {
    case "create":
      return "Add and update shared values after review.";
    case "owner_routed":
      return "This value is managed outside Catalog. Review its management information below.";
    case "read_only":
      return "Defined by workspace policy or a connected system. Inspect its values and usage here.";
    case "request":
      return "Changes are applied after you review and submit this form.";
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
      return "Add Value";
    case "owner_routed":
      return "System managed";
    case "read_only":
      return "System managed";
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
      return "Use Manage Members to change project membership. Account creation and invitations remain in OpenProject.";
    }

    return "This catalog must be changed through its workflow route.";
  }

  if (catalog.console_capability === "read_only") {
    return "This catalog is read-only because it is owned by a policy, workflow, projection, or backing-system contract.";
  }

  return undefined;
}

export function catalogValueChangeRule(catalog: DeliveryCatalogItem | null, value: DeliveryCatalogValue | null) {
  if (value?.lifecycle_state === "retired") return "Retired values remain available for history and cannot be edited or selected for new work.";
  if (catalog && ["read_only", "owner_routed"].includes(catalog.console_capability)) return catalogChangeRule(catalog);
  if (value?.lifecycle_state === "read_only") return value.value_key === "Program-wide"
    ? "Built-in placement for work that is not assigned to one planning period. Use it where appropriate; its definition is fixed."
    : "This is a built-in or system-managed value. Its usage is available for inspection.";
  return catalogChangeRule(catalog);
}

export function catalogLifecycleLabel(
  lifecycleState: DeliveryCatalogValue["lifecycle_state"],
) {
  return lifecycleState === "read_only" ? "System managed" : lifecycleState.replaceAll("_", " ");
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
  const subject = value?.label ?? deliveryFieldDisplayLabel(catalog?.label ?? "Catalog Value");

  switch (mode) {
    case "add":
      return `Add ${deliveryFieldDisplayLabel(catalog?.label ?? "Catalog")} Value`;
    case "edit":
      return `Edit ${subject}`;
    case "retire":
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
        return "Add a shared value for use in Delivery. Review the details, then submit to apply it.";
      }

      return "Add a value for use in Delivery.";
    case "edit":
      return "Update this shared value. Existing Delivery records that use it may be affected.";
    case "retire":
      if (catalogRetirementBlocked(value ?? null)) {
        return "This value is still used by Delivery records. Reassign those records before retiring it.";
      }

      return "Retire this unused value. Its history remains available, but it cannot be selected for new work.";
  }
}

export function catalogMutationActionLabel(mode: DeliveryCatalogMutationMode, _value?: DeliveryCatalogValue | null, _catalog?: DeliveryCatalogItem | null) {
  return mode === "add" ? "Add Value" : mode === "edit" ? "Save Changes" : "Retire Value";
}

export function catalogRetirementPath(value: DeliveryCatalogValue | null) {
  if (!value) {
    return "Select a value before choosing a retirement path.";
  }

  if (catalogRetirementBlocked(value)) {
    return `${value.usage_count} records must be reassigned before this value can be retired.`;
  }

  return "Direct retirement is allowed because no projected package currently uses this value.";
}

export function catalogRetirementProjectionCheckpoint(
  value: DeliveryCatalogValue | null,
) {
  if (!value) {
    return "Projection checkpoint cannot run until a value is selected.";
  }

  if (catalogRetirementBlocked(value)) {
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
      value: `${actionLabel} · ${recordedAt} · ${route}`,
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
      label: ["read_only", "owner_routed"].includes(catalog.console_capability) ? "Management" : "Editing",
      value: value.lifecycle_state === "retired" ? "Historical value" : value.lifecycle_state === "read_only" || ["read_only", "owner_routed"].includes(catalog.console_capability) ? "System managed" : catalogCapabilityLabel(catalog.console_capability),
    },
    {
      label: "How changes work",
      value: catalogValueChangeRule(catalog, value),
    },
    { label: "Backend service", value: catalog.create_authority },
    { label: "Backend Route", value: catalog.backend_route },
    { label: "Management route", value: catalog.catalog_item_id === principalLookupCatalogId ? "Catalog → Manage Members" : catalog.owner_route },
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
      label: "Used in Delivery",
      value: value.usage_summary,
    },
  ];
}
