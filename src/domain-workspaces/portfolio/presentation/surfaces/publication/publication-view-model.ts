import type { TerasMetadataItem, TerasTone } from "@/teras";
import type { ProductPortfolioScenarioProjection } from "../../../read-model/types/product-portfolio-fixture-types.ts";
import type {
  ProductPublicationRequirement,
  ProductPublicationState,
} from "../../../work-model/publication/product-publication-review-types.ts";
import {
  productFormValueLabel,
  productListingScopeLabel,
} from "../products/products-view-model.ts";

export type ProductPublicationRegisterViewId = "open" | "resolved";

export const productPublicationRegisterViews = [
  { label: "Open", value: "open" },
  { label: "Resolved", value: "resolved" },
] satisfies Array<{ label: string; value: ProductPublicationRegisterViewId }>;

export function productPublicationRecordsForRegister(
  records: ProductPortfolioScenarioProjection[],
  viewId: ProductPublicationRegisterViewId,
  query = "",
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return records
    .filter((record) =>
      viewId === "open"
        ? productPublicationRecordIsOpen(record)
        : !productPublicationRecordIsOpen(record),
    )
    .filter((record) => {
      if (!normalizedQuery) return true;

      return [
        productPublicationRecordName(record),
        record.publicationPacket.product.productId,
        record.publicationPacket.packetId,
        record.publicationPacket.owners.productOwnerRef,
        record.projection.publicationState,
        ...record.projection.requirements.map(
          (requirement) => requirement.ownerRef,
        ),
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    })
    .sort(comparePublicationRecords);
}

export function productPublicationRegisterViewCount(
  records: ProductPortfolioScenarioProjection[],
  viewId: ProductPublicationRegisterViewId,
) {
  return records.filter((record) =>
    viewId === "open"
      ? productPublicationRecordIsOpen(record)
      : !productPublicationRecordIsOpen(record),
  ).length;
}

export function productPublicationRecordIsOpen(
  record: ProductPortfolioScenarioProjection,
) {
  return (
    record.projection.publicationState === "captured" ||
    record.projection.publicationState === "needs-review"
  );
}

export function productPublicationRecordName(
  record: ProductPortfolioScenarioProjection,
) {
  const displayName = record.publicationPacket.manifest.displayName.trim();
  return displayName || titleCase(record.publicationPacket.product.productId);
}

export function productPublicationRecordDescription(
  record: ProductPortfolioScenarioProjection,
) {
  const summary = record.publicationPacket.manifest.summary.trim();
  if (summary) return summary;

  return "The product-owned manifest must be repaired before publication.";
}

export function productPublicationStateLabel(state: ProductPublicationState) {
  switch (state) {
    case "published":
      return "Published";
    case "captured":
      return "Captured";
    case "needs-review":
      return "Needs review";
    case "rejected":
      return "Rejected";
  }
}

export function productPublicationStateTone(
  state: ProductPublicationState,
): TerasTone {
  switch (state) {
    case "published":
      return "ok";
    case "captured":
      return "info";
    case "needs-review":
      return "warn";
    case "rejected":
      return "muted";
  }
}

export function productPublicationRequirementCounts(
  requirements: ProductPublicationRequirement[],
) {
  return {
    conflict: requirements.filter(
      (requirement) => requirement.state === "conflict",
    ).length,
    missing: requirements.filter(
      (requirement) => requirement.state === "missing",
    ).length,
    satisfied: requirements.filter(
      (requirement) => requirement.state === "satisfied",
    ).length,
    total: requirements.length,
  };
}

export function productPublicationCheckSummary(
  record: ProductPortfolioScenarioProjection,
) {
  const counts = productPublicationRequirementCounts(
    record.projection.requirements,
  );

  return counts.satisfied === counts.total
    ? `${counts.total}/${counts.total} clear`
    : `${counts.satisfied}/${counts.total} clear`;
}

export function productPublicationSelectedFacts(
  record: ProductPortfolioScenarioProjection,
): TerasMetadataItem[] {
  const packet = record.publicationPacket;
  const counts = productPublicationRequirementCounts(
    record.projection.requirements,
  );

  return [
    { label: "Product ID", value: packet.product.productId },
    {
      label: "Product Form",
      value: productFormValueLabel(packet.classification.productForm),
    },
    { label: "Product Owner", value: packet.owners.productOwnerRef },
    {
      label: "Requested Scope",
      value: productListingScopeLabel(packet.listing.requestedScope),
    },
    {
      label: "Checks",
      value: `${counts.satisfied}/${counts.total} satisfied`,
    },
    { label: "Packet", value: packet.packetId },
  ];
}

export function productPublicationActionModel(
  record: ProductPortfolioScenarioProjection,
) {
  switch (record.projection.publicationState) {
    case "captured":
      return {
        description:
          "Review source-backed requirements, choose the publication outcome, and record a local receipt.",
        label: "Review Publication",
        title: "Publication review",
      };
    case "needs-review":
      return {
        description:
          "Inspect unresolved requirements, route source repairs, or reject the publication with a controlled reason.",
        label: "Review Requirements",
        title: "Requirement review",
      };
    case "published":
      return {
        description:
          "Open the published managed product in its stable Product Dashboard.",
        label: "Open Product",
        title: "Product Dashboard",
      };
    case "rejected":
      if (record.projection.entry) {
        return {
          description:
            "This publication duplicates an existing managed product.",
          label: "Open Existing Product",
          title: "Existing product",
        };
      }
      return {
        description:
          "Review the recorded rejection outcome and immutable publication receipt.",
        label: "View Decision",
        title: "Publication result",
      };
  }
}

export function productPublicationRecordCanOpenProduct(
  record: ProductPortfolioScenarioProjection,
) {
  return (
    record.projection.entry !== null &&
    (record.projection.publicationState === "published" ||
      record.projection.requiredAction.kind === "open-existing-product")
  );
}

export function productPublicationRequirementLabel(
  requirement: ProductPublicationRequirement,
) {
  return titleCase(requirement.code);
}

export function productPublicationRequirementTone(
  requirement: ProductPublicationRequirement,
): TerasTone {
  switch (requirement.state) {
    case "satisfied":
      return "ok";
    case "conflict":
      return "warn";
    case "missing":
      return "danger";
  }
}

export function productPublicationRequirementStatus(
  requirement: ProductPublicationRequirement,
) {
  switch (requirement.state) {
    case "satisfied":
      return "Satisfied";
    case "conflict":
      return "Conflict";
    case "missing":
      return "Missing";
  }
}

export function productPublicationRequirementDetail(
  requirement: ProductPublicationRequirement,
) {
  switch (requirement.state) {
    case "satisfied":
      return requirement.evidenceRefs.length > 0
        ? `${requirement.evidenceRefs.length} source reference${
            requirement.evidenceRefs.length === 1 ? "" : "s"
          } recorded.`
        : `Verified by ${requirement.ownerRef}.`;
    case "conflict":
      return requirement.code === "listing-scope"
        ? "Requested listing scope exceeds the verified access contract."
        : `Resolve the conflicting source value with ${requirement.ownerRef}.`;
    case "missing":
      return `Required evidence is missing from ${requirement.ownerRef}.`;
  }
}

function comparePublicationRecords(
  left: ProductPortfolioScenarioProjection,
  right: ProductPortfolioScenarioProjection,
) {
  return (
    publicationStateOrder(left.projection.publicationState) -
      publicationStateOrder(right.projection.publicationState) ||
    productPublicationRecordName(left).localeCompare(
      productPublicationRecordName(right),
    )
  );
}

function publicationStateOrder(state: ProductPublicationState) {
  switch (state) {
    case "needs-review":
      return 0;
    case "captured":
      return 1;
    case "published":
      return 2;
    case "rejected":
      return 3;
  }
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
