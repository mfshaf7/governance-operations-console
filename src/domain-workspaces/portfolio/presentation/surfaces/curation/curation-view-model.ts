import type { TerasMetadataItem, TerasTone } from "@/teras";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import type { ProductListingScope } from "@/domain-workspaces/portfolio/domain/product-portfolio-vocabulary";
import type {
  ProductListingCommand,
  ProductListingDraft,
  ProductListingPosition,
  ProductListingReceipt,
} from "../../../work-model/listing/product-listing-types.ts";
import {
  productAvailabilityLabel,
  productAvailabilityTone,
  productFormLabel,
  productListingLabel,
  productListingScopeLabel,
  productListingTone,
} from "../products/products-view-model.ts";

export type ProductPortfolioCurationViewId =
  "all-active" | "client" | "featured" | "internal" | "public" | "unlisted";

export type ProductPortfolioCurationView = {
  description: string;
  id: ProductPortfolioCurationViewId;
  label: string;
};

export const productPortfolioCurationViews: ProductPortfolioCurationView[] = [
  {
    description: "Every current catalog listing.",
    id: "all-active",
    label: "All Active",
  },
  {
    description: "Promoted products in the featured group.",
    id: "featured",
    label: "Featured",
  },
  {
    description: "Workspace-internal product listings.",
    id: "internal",
    label: "Internal",
  },
  {
    description: "Client-scoped product listings.",
    id: "client",
    label: "Client",
  },
  {
    description: "Public product listings.",
    id: "public",
    label: "Public",
  },
  {
    description: "Managed products omitted from the catalog.",
    id: "unlisted",
    label: "Unlisted",
  },
];

export function productPortfolioCurationEntries(
  entries: ProductPortfolioEntry[],
  viewId: ProductPortfolioCurationViewId,
  query = "",
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return entries
    .filter((entry) => productMatchesCurationView(entry, viewId))
    .filter((entry) => {
      if (!normalizedQuery) return true;

      return [
        entry.identity.displayName,
        entry.identity.productId,
        entry.identity.summary,
        entry.ownership.productOwnerRef,
        entry.listing.scope,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    })
    .sort(compareProductListings);
}

export function productPortfolioCurationViewCount(
  entries: ProductPortfolioEntry[],
  viewId: ProductPortfolioCurationViewId,
) {
  return entries.filter((entry) => productMatchesCurationView(entry, viewId))
    .length;
}

export function productPortfolioCurationViewForEntry(
  entry: ProductPortfolioEntry,
): ProductPortfolioCurationViewId {
  return entry.listing.state === "unlisted" ? "unlisted" : "all-active";
}

export function productCurationViewAfterApply(
  currentViewId: ProductPortfolioCurationViewId,
  entry: ProductPortfolioEntry,
) {
  return productMatchesCurationView(entry, currentViewId)
    ? currentViewId
    : productPortfolioCurationViewForEntry(entry);
}

export function productCurationLatestReceipt(
  receipts: ProductListingReceipt[],
  productId: string,
) {
  return [...receipts]
    .filter((receipt) => receipt.productId === productId)
    .sort(
      (left, right) =>
        right.recordedAt.localeCompare(left.recordedAt) ||
        right.receiptId.localeCompare(left.receiptId),
    )[0] ?? null;
}

export function productCurationPlacementLabel(entry: ProductPortfolioEntry) {
  if (entry.listing.state !== "listed") return "Not listed";
  return entry.listing.featured ? "Featured" : "Standard";
}

export function productCurationPlacementTone(
  entry: ProductPortfolioEntry,
): TerasTone {
  if (entry.listing.state !== "listed") return "muted";
  return entry.listing.featured ? "warn" : "info";
}

export function productCurationPositionLabel(
  entries: ProductPortfolioEntry[],
  entry: ProductPortfolioEntry,
) {
  const position = productListingPositionForEntry(entries, entry);

  if (!position) return "Not listed";
  if (position.kind === "first") return "First";
  if (position.kind === "last") return "Last";

  const anchor = entries.find(
    (candidate) => candidate.identity.productId === position.productId,
  );
  return anchor ? `After ${anchor.identity.displayName}` : "Last";
}

export function productCurationListingFacts(
  entries: ProductPortfolioEntry[],
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  return [
    {
      label: "State",
      tone: productListingTone(entry),
      value: productListingLabel(entry),
    },
    {
      label: "Scope",
      value: productListingScopeLabel(entry.listing.scope),
    },
    {
      label: "Placement",
      tone: productCurationPlacementTone(entry),
      value: productCurationPlacementLabel(entry),
    },
    {
      label: "Position",
      value: productCurationPositionLabel(entries, entry),
    },
  ];
}

export function productCurationPolicyFacts(
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  return [
    {
      label: "Permitted Scopes",
      value: entry.security.permittedListingScopes
        .map(productListingScopeLabel)
        .join(", "),
    },
    {
      label: "Access Class",
      value: titleCase(entry.experience.accessClass),
    },
    {
      label: "Access Contract",
      value: entry.security.accessContractRef,
    },
    {
      label: "Publication Receipt",
      value: entry.provenance.publicationReceiptRef,
    },
  ];
}

export function productCurationContextFacts(
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  return [
    { label: "Form", value: productFormLabel(entry) },
    {
      label: "Availability",
      tone: productAvailabilityTone(entry.runtime.availability),
      value: productAvailabilityLabel(entry.runtime.availability),
    },
    { label: "Owner", value: entry.ownership.productOwnerRef },
  ];
}

export function productCurationScopeOptions(entry: ProductPortfolioEntry) {
  return entry.security.permittedListingScopes.map((scope) => ({
    label: productListingScopeLabel(scope),
    value: scope,
  }));
}

export function productCurationAnchorEntries(
  entries: ProductPortfolioEntry[],
  entry: ProductPortfolioEntry,
  featured: boolean,
) {
  return entries
    .filter(
      (candidate) =>
        candidate.identity.productId !== entry.identity.productId &&
        candidate.listing.state === "listed" &&
        candidate.listing.featured === featured,
    )
    .sort(compareProductListings);
}

export function productListingDraftForEntry(
  entries: ProductPortfolioEntry[],
  entry: ProductPortfolioEntry,
): ProductListingDraft {
  if (entry.listing.state !== "listed") {
    return {
      featured: false,
      position: null,
      scope: entry.listing.scope,
      state: "unlisted",
    };
  }

  return {
    featured: entry.listing.featured,
    position: productListingPositionForEntry(entries, entry) ?? {
      kind: "last",
    },
    scope: entry.listing.scope,
    state: "listed",
  };
}

export function productListingDraftEquals(
  left: ProductListingDraft,
  right: ProductListingDraft,
) {
  return listingDraftKey(left) === listingDraftKey(right);
}

export function createProductListingCommand({
  draft,
  entry,
  submittedAt,
  submittedByRef,
}: {
  draft: ProductListingDraft;
  entry: ProductPortfolioEntry;
  submittedAt: string;
  submittedByRef: string;
}): ProductListingCommand {
  return {
    draft,
    expectedPublicationReceiptRef: entry.provenance.publicationReceiptRef,
    idempotencyKey: [
      "portfolio-listing",
      entry.identity.productId,
      entry.provenance.publicationReceiptRef,
      listingDraftKey(draft),
    ]
      .join(":")
      .toLocaleLowerCase()
      .replace(/[^a-z0-9:.-]+/g, "-"),
    productId: entry.identity.productId,
    submittedAt,
    submittedByRef,
  };
}

export function productCurationSelectionTone(
  entry: ProductPortfolioEntry,
): TerasTone {
  if (entry.listing.state === "unlisted") return "muted";
  if (entry.runtime.availability === "degraded") return "warn";
  if (entry.runtime.availability === "offline") return "danger";
  return entry.listing.featured ? "warn" : "info";
}

function productMatchesCurationView(
  entry: ProductPortfolioEntry,
  viewId: ProductPortfolioCurationViewId,
) {
  if (entry.listing.state === "retired") return false;

  switch (viewId) {
    case "all-active":
      return entry.listing.state === "listed";
    case "featured":
      return entry.listing.state === "listed" && entry.listing.featured;
    case "internal":
    case "client":
    case "public":
      return entry.listing.state === "listed" && entry.listing.scope === viewId;
    case "unlisted":
      return entry.listing.state === "unlisted";
  }
}

function productListingPositionForEntry(
  entries: ProductPortfolioEntry[],
  entry: ProductPortfolioEntry,
): ProductListingPosition | null {
  if (entry.listing.state !== "listed") return null;

  const cohort = entries
    .filter(
      (candidate) =>
        candidate.listing.state === "listed" &&
        candidate.listing.featured === entry.listing.featured,
    )
    .sort(compareProductListings);
  const index = cohort.findIndex(
    (candidate) => candidate.identity.productId === entry.identity.productId,
  );

  if (index <= 0) return { kind: "first" };
  if (index === cohort.length - 1) return { kind: "last" };
  return {
    kind: "after",
    productId: cohort[index - 1].identity.productId,
  };
}

function compareProductListings(
  left: ProductPortfolioEntry,
  right: ProductPortfolioEntry,
) {
  return (
    Number(right.listing.featured) - Number(left.listing.featured) ||
    left.listing.sortOrder - right.listing.sortOrder ||
    left.identity.displayName.localeCompare(right.identity.displayName)
  );
}

function listingDraftKey(draft: ProductListingDraft) {
  const position =
    draft.state === "listed"
      ? draft.position.kind === "after"
        ? `after-${draft.position.productId}`
        : draft.position.kind
      : "none";

  return [
    draft.state,
    draft.scope,
    draft.featured ? "featured" : "standard",
    position,
  ].join("-");
}

function titleCase(value: ProductListingScope | string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
