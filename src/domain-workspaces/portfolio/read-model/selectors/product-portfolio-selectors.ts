import type {
  PortfolioSegment,
  ProductAvailability,
  ProductForm,
  ProductListingScope,
  ProductListingState,
  ProductRegistryLifecycle,
} from "../../domain/product-portfolio-vocabulary.ts";
import type {
  ProductPortfolioPublicationSummary,
  ProductPortfolioEntry,
  ProductPortfolioSummary,
  ProductPortfolioWorkspaceStatus,
} from "../../domain/product-portfolio-entry-types.ts";
import type {
  ProductPortfolioReadModel,
  ProductPortfolioScenarioProjection,
} from "../types/product-portfolio-fixture-types.ts";
import type { ProductPortfolioHistoryEvent } from "../types/product-portfolio-history-types.ts";
import { selectProductPortfolioHistoryByProductId } from "./product-portfolio-history-selectors.ts";

export type ProductPortfolioCatalogFilter = {
  availability?: ProductAvailability[];
  forms?: ProductForm[];
  listingScopes?: ProductListingScope[];
  listingStates?: ProductListingState[];
  maturityLevels?: ProductRegistryLifecycle[];
  query?: string;
  segments?: PortfolioSegment[];
};

export function selectProductPortfolioEntries(
  scenarioProjections: ProductPortfolioScenarioProjection[],
): ProductPortfolioEntry[] {
  const entriesByProduct = new Map<string, ProductPortfolioEntry>();

  for (const scenario of scenarioProjections) {
    if (scenario.projection.entry !== null) {
      entriesByProduct.set(
        scenario.projection.entry.identity.productId,
        scenario.projection.entry,
      );
    }
  }

  return [...entriesByProduct.values()].sort(
    (left, right) =>
      Number(right.listing.featured) - Number(left.listing.featured) ||
      left.listing.sortOrder - right.listing.sortOrder ||
      left.identity.displayName.localeCompare(right.identity.displayName),
  );
}

export function selectProductPortfolioCatalog(
  entries: ProductPortfolioEntry[],
  filter: ProductPortfolioCatalogFilter = {},
): ProductPortfolioEntry[] {
  const query = filter.query?.trim().toLocaleLowerCase() ?? "";
  const listingStates = filter.listingStates ?? ["listed"];

  return entries.filter((entry) => {
    const searchable = [
      entry.identity.displayName,
      entry.identity.summary,
      entry.identity.productId,
      entry.ownership.productOwnerRef,
      ...entry.classification.tags,
    ]
      .join(" ")
      .toLocaleLowerCase();

    return (
      listingStates.includes(entry.listing.state) &&
      (filter.segments === undefined ||
        filter.segments.includes(entry.classification.portfolioSegment)) &&
      (filter.forms === undefined ||
        filter.forms.includes(entry.classification.productForm)) &&
      (filter.listingScopes === undefined ||
        filter.listingScopes.includes(entry.listing.scope)) &&
      (filter.availability === undefined ||
        filter.availability.includes(entry.runtime.availability)) &&
      (filter.maturityLevels === undefined ||
        filter.maturityLevels.includes(entry.maturity.level)) &&
      (query.length === 0 || searchable.includes(query))
    );
  });
}

export function selectProductPortfolioPublicationQueue(
  scenarioProjections: ProductPortfolioScenarioProjection[],
): ProductPortfolioScenarioProjection[] {
  return scenarioProjections.filter(
    (scenario) =>
      scenario.projection.publicationState === "captured" ||
      scenario.projection.publicationState === "needs-review",
  );
}

export function selectProductPortfolioPublicationRecords(
  scenarioProjections: ProductPortfolioScenarioProjection[],
): ProductPortfolioScenarioProjection[] {
  return scenarioProjections.filter(
    (scenario) => scenario.publicationPacket.publicationKind === "new-product",
  );
}

export function selectProductPortfolioPublicationSummary(
  publicationRecords: ProductPortfolioScenarioProjection[],
): ProductPortfolioPublicationSummary {
  return {
    published: publicationRecords.filter(
      (record) => record.projection.publicationState === "published",
    ).length,
    captured: publicationRecords.filter(
      (record) => record.projection.publicationState === "captured",
    ).length,
    needsReview: publicationRecords.filter(
      (record) => record.projection.publicationState === "needs-review",
    ).length,
    rejected: publicationRecords.filter(
      (record) => record.projection.publicationState === "rejected",
    ).length,
  };
}

export function selectProductPortfolioSummary(
  entries: ProductPortfolioEntry[],
): ProductPortfolioSummary {
  return {
    listed: entries.filter((entry) => entry.listing.state === "listed").length,
    managed: entries.length,
    retired: entries.filter((entry) => entry.listing.state === "retired")
      .length,
    unlisted: entries.filter((entry) => entry.listing.state === "unlisted")
      .length,
  };
}

export function selectProductPortfolioWorkspaceStatus(
  entries: ProductPortfolioEntry[],
  publicationQueue: ProductPortfolioScenarioProjection[],
): ProductPortfolioWorkspaceStatus {
  const degradedProducts = entries.filter(
    (entry) =>
      entry.runtime.availability === "degraded" ||
      entry.runtime.availability === "offline",
  ).length;
  const staleProducts = entries.filter(
    (entry) => entry.provenance.freshness === "stale",
  ).length;
  const attention =
    publicationQueue.length > 0 || degradedProducts > 0 || staleProducts > 0;

  return {
    publicationQueue: publicationQueue.length,
    degradedProducts,
    staleProducts,
    state: attention ? "attention" : "healthy",
  };
}

export function selectProductPortfolioEntryById(
  entries: ProductPortfolioEntry[],
  productId: string,
): ProductPortfolioEntry | null {
  return (
    entries.find((entry) => entry.identity.productId === productId) ?? null
  );
}

export function productPortfolioReadModelFromProjections(
  scenarioProjections: ProductPortfolioScenarioProjection[],
  publicationSources: ProductPortfolioScenarioProjection[] = [],
  additionalHistoryEvents: ProductPortfolioHistoryEvent[] = [],
): ProductPortfolioReadModel {
  const entries = selectProductPortfolioEntries(scenarioProjections);
  const publicationRecords =
    selectProductPortfolioPublicationRecords(scenarioProjections);
  const publicationQueue = selectProductPortfolioPublicationQueue(publicationRecords);

  return {
    publicationQueue,
    publicationRecords,
    publicationSources,
    publicationSummary: selectProductPortfolioPublicationSummary(publicationRecords),
    entries,
    historyByProductId: selectProductPortfolioHistoryByProductId(
      scenarioProjections,
      additionalHistoryEvents,
    ),
    scenarioProjections,
    summary: selectProductPortfolioSummary(entries),
    workspaceStatus: selectProductPortfolioWorkspaceStatus(
      entries,
      publicationQueue,
    ),
  };
}
