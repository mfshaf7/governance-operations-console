import type { TerasMetadataItem, TerasTone } from "@/teras";
import { selectProductPortfolioCatalog } from "../../../read-model/selectors/product-portfolio-selectors.ts";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import type {
  PortfolioSegment,
  ProductAvailability,
  ProductForm,
  ProductListingScope,
  ProductRegistryLifecycle,
} from "@/domain-workspaces/portfolio/domain/product-portfolio-vocabulary";

export type ProductPortfolioListingView = "active" | "retired" | "unlisted";
export type ProductPortfolioMaturityFilter = ProductRegistryLifecycle | "all";
export type ProductPortfolioAvailabilityFilter = ProductAvailability | "all";
export type ProductPortfolioScopeFilter = ProductListingScope | "all";

export type ProductPortfolioProductsFilter = {
  availability: ProductPortfolioAvailabilityFilter;
  listingView: ProductPortfolioListingView;
  maturity: ProductPortfolioMaturityFilter;
  query: string;
  scope: ProductPortfolioScopeFilter;
};

export const productPortfolioListingViewOptions = [
  { label: "Active", value: "active" },
  { label: "Unlisted", value: "unlisted" },
  { label: "Retired", value: "retired" },
] satisfies Array<{ label: string; value: ProductPortfolioListingView }>;

export const productPortfolioMaturityOptions = [
  { label: "All maturity", value: "all" },
  { label: "Platform integrated", value: "platform-integrated" },
  { label: "Fully governed", value: "fully-governed" },
] satisfies Array<{ label: string; value: ProductPortfolioMaturityFilter }>;

export const productPortfolioAvailabilityOptions = [
  { label: "All availability", value: "all" },
  { label: "Live", value: "live" },
  { label: "Degraded", value: "degraded" },
  { label: "Offline", value: "offline" },
  { label: "Unknown", value: "unknown" },
  { label: "Not applicable", value: "not-applicable" },
] satisfies Array<{ label: string; value: ProductPortfolioAvailabilityFilter }>;

export const productPortfolioScopeOptions = [
  { label: "All scope", value: "all" },
  { label: "Internal", value: "internal" },
  { label: "Client", value: "client" },
  { label: "Public", value: "public" },
] satisfies Array<{ label: string; value: ProductPortfolioScopeFilter }>;

export function productPortfolioProductsForRegister(
  entries: ProductPortfolioEntry[],
  filter: ProductPortfolioProductsFilter,
) {
  return selectProductPortfolioCatalog(entries, {
    availability:
      filter.availability === "all" ? undefined : [filter.availability],
    listingScopes: filter.scope === "all" ? undefined : [filter.scope],
    listingStates: [listingStateForView(filter.listingView)],
    maturityLevels: filter.maturity === "all" ? undefined : [filter.maturity],
    query: filter.query,
  });
}

export function productPortfolioProductsViewCount(
  entries: ProductPortfolioEntry[],
  listingView: ProductPortfolioListingView,
) {
  const state = listingStateForView(listingView);
  return entries.filter((entry) => entry.listing.state === state).length;
}

export function productMaturityLabel(level: ProductRegistryLifecycle) {
  return level === "fully-governed" ? "Fully governed" : "Platform integrated";
}

export function productMaturityTone(
  level: ProductRegistryLifecycle,
): TerasTone {
  return level === "fully-governed" ? "ok" : "info";
}

export function productAvailabilityLabel(availability: ProductAvailability) {
  switch (availability) {
    case "degraded":
      return "Degraded";
    case "live":
      return "Live";
    case "not-applicable":
      return "Not applicable";
    case "offline":
      return "Offline";
    case "unknown":
      return "Unknown";
  }
}

export function productAvailabilityTone(
  availability: ProductAvailability,
): TerasTone {
  switch (availability) {
    case "live":
      return "ok";
    case "degraded":
      return "warn";
    case "offline":
      return "danger";
    case "unknown":
      return "stale";
    case "not-applicable":
      return "muted";
  }
}

export function productListingLabel(entry: ProductPortfolioEntry) {
  switch (entry.listing.state) {
    case "listed":
      return "Listed";
    case "retired":
      return "Retired";
    case "unlisted":
      return "Unlisted";
  }
}

export function productListingTone(entry: ProductPortfolioEntry): TerasTone {
  return entry.listing.state === "listed" ? "info" : "muted";
}

export function productListingScopeLabel(scope: ProductListingScope) {
  return scope.charAt(0).toUpperCase() + scope.slice(1);
}

export function productPortfolioSegmentLabel(segment: PortfolioSegment) {
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function productFormLabel(entry: ProductPortfolioEntry) {
  return productFormValueLabel(entry.classification.productForm);
}

export function productFormValueLabel(form: ProductForm) {
  return form
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function productSelectedPanelTone(
  entry: ProductPortfolioEntry,
): TerasTone {
  if (entry.listing.state === "retired") return "muted";
  if (entry.provenance.freshness === "stale") return "stale";
  return productAvailabilityTone(entry.runtime.availability);
}

export function productSelectedPanelStatus(entry: ProductPortfolioEntry) {
  if (entry.listing.state === "retired") return "Retired";
  if (entry.provenance.freshness === "stale") return "Evidence stale";
  return productAvailabilityLabel(entry.runtime.availability);
}

export function productSelectedPanelFacts(
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  return [
    { label: "Owner", value: entry.ownership.productOwnerRef },
    { label: "Form", value: productFormLabel(entry) },
    {
      label: "Segment",
      value: productPortfolioSegmentLabel(
        entry.classification.portfolioSegment,
      ),
    },
    { label: "Scope", value: productListingScopeLabel(entry.listing.scope) },
    { label: "Release", value: entry.release?.version ?? "Not versioned" },
    { label: "Endpoint", value: entry.maturity.highestRealEndpoint },
  ];
}

function listingStateForView(view: ProductPortfolioListingView) {
  switch (view) {
    case "active":
      return "listed" as const;
    case "retired":
      return "retired" as const;
    case "unlisted":
      return "unlisted" as const;
  }
}
