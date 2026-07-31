import type { OperationOwnerRepoCatalogOption } from "@/domain-workspaces/operation-contracts/owner-repository";
import type { TerasMetadataItem } from "@/teras";

import type {
  DeliveryCatalogItem,
  DeliveryCatalogValue,
} from "../../../read-model/index.ts";
import { catalogDraftStandardHelp } from "../../../work-model/catalog/catalog-draft-model.ts";
import {
  isIterationCatalog,
  isTargetPiCatalog,
  parentTargetPiValueKey,
} from "../../../work-model/catalog/catalog-selectors.ts";
import {
  catalogLifecycleLabel,
  catalogRetirementPath,
  catalogRetirementProjectionCheckpoint,
} from "./catalog-display-model.ts";

export function catalogRetirementMetadata({
  catalog,
  planningFacetSummary,
  value,
}: {
  catalog: DeliveryCatalogItem | null;
  planningFacetSummary: string;
  value: DeliveryCatalogValue | null;
}): TerasMetadataItem[] {
  return [
    {
      label: "Value Key",
      value: value?.value_key ?? "No value selected",
    },
    {
      label: "Current State",
      value: value
        ? catalogLifecycleLabel(value.lifecycle_state)
        : "No value selected",
    },
    {
      label: "Used By",
      value: `${value?.usage_count ?? 0} records`,
    },
    ...(isIterationCatalog(catalog)
      ? [
          {
            label: "Target PI Link",
            value: parentTargetPiValueKey(value) ?? "Missing Target PI link",
          },
        ]
      : []),
    ...(isTargetPiCatalog(catalog)
      ? [
          {
            label: "Planning Facets",
            value: planningFacetSummary,
          },
        ]
      : []),
    {
      label: "Usage Before Delete",
      value: value?.usage_summary ?? "No usage summary available",
    },
    {
      label: "Retirement Path",
      value: catalogRetirementPath(value),
    },
    {
      label: "Projection Checkpoint",
      value: catalogRetirementProjectionCheckpoint(value),
    },
    {
      label: "Backend Route",
      value: catalog?.backend_route ?? "No route selected",
    },
    {
      label: "Backend Owner",
      value: catalog?.create_authority ?? "No owner selected",
    },
  ];
}

export function catalogDraftPreviewMetadata({
  catalog,
  derivedValueKey,
  linkedRepository,
  planningFacetSummary,
  standardError,
}: {
  catalog: DeliveryCatalogItem | null;
  derivedValueKey: string;
  linkedRepository?: OperationOwnerRepoCatalogOption | null;
  planningFacetSummary: string;
  standardError: string | null;
}): TerasMetadataItem[] {
  return [
    {
      label: "Derived Value Key",
      value: derivedValueKey || "Derived after required fields pass.",
    },
    {
      label: "Naming Rule",
      value: standardError ?? catalogDraftStandardHelp(catalog),
    },
    {
      label: "Backend Route",
      value: catalog?.backend_route ?? "No route selected",
    },
    {
      label: "Backend Owner",
      value: catalog?.create_authority ?? "No owner selected",
    },
    ...(linkedRepository
      ? [
          {
            label: "Repository Link",
            value: `${linkedRepository.label} / ${linkedRepository.owner}`,
          },
          {
            label: "Repository Ref",
            value: linkedRepository.repoRef,
          },
        ]
      : []),
    ...(isTargetPiCatalog(catalog)
      ? [
          {
            label: "Planning Facets",
            value: planningFacetSummary,
          },
        ]
      : []),
  ];
}

export function catalogTargetPiSelectOptions(
  targetPiValues: DeliveryCatalogValue[],
) {
  if (targetPiValues.length === 0) {
    return [{ label: "No Target PI projected", value: "" }];
  }

  return targetPiValues.map((targetPi) => ({
    label: targetPi.label,
    value: targetPi.value_key,
  }));
}
