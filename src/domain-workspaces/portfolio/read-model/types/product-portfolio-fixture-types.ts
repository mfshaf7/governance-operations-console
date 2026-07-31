import type {
  ProductPortfolioPublicationSummary,
  ProductPortfolioEntry,
  ProductPortfolioSummary,
  ProductPortfolioWorkspaceStatus,
} from "../../domain/product-portfolio-entry-types.ts";
import type {
  ProductAccessClass,
  ProductAvailability,
  ProductFreshness,
  ProductListingState,
  ProductRegistryLifecycle,
} from "../../domain/product-portfolio-vocabulary.ts";
import type {
  ProductPublicationState,
  ProductEntryProjection,
  ProductPortfolioCommand,
  ProductPortfolioProjectionContext,
  ProductPortfolioRequiredAction,
  ProductPublicationProjection,
} from "../../work-model/publication/product-publication-review-types.ts";
import type { ProductPublicationPacket } from "../../work-model/publication/product-publication-types.ts";
import type { ProductPortfolioHistoryEvent } from "./product-portfolio-history-types.ts";

export type ProductPortfolioFixtureProvenance = {
  authorityRefs: string[];
  mode: "authority-snapshot" | "synthetic" | "synthetic-companion";
  syntheticFields: string[];
};

export type ProductPortfolioStatusAxes = {
  access: ProductAccessClass;
  publication: ProductPublicationState;
  availability: ProductAvailability;
  freshness: ProductFreshness;
  listing: ProductListingState;
  maturity: ProductRegistryLifecycle;
};

export type ProductPortfolioFixtureScenario = {
  expected: {
    publicationState: ProductPublicationState;
    allowedCommands: ProductPortfolioCommand[];
    entryProjection: ProductEntryProjection;
    forbiddenCommands: ProductPortfolioCommand[];
    requiredAction: ProductPortfolioRequiredAction;
    statusAxes: ProductPortfolioStatusAxes;
  };
  projectionContext: ProductPortfolioProjectionContext;
  provenance: ProductPortfolioFixtureProvenance;
  publicationPacket: ProductPublicationPacket;
  scenarioId: string;
};

export type ProductPortfolioScenarioProjection = {
  projection: ProductPublicationProjection;
  projectionContext: ProductPortfolioProjectionContext;
  provenance: ProductPortfolioFixtureProvenance;
  publicationPacket: ProductPublicationPacket;
  scenarioId: string;
};

export type ProductPortfolioReadModel = {
  publicationQueue: ProductPortfolioScenarioProjection[];
  publicationRecords: ProductPortfolioScenarioProjection[];
  publicationSources: ProductPortfolioScenarioProjection[];
  publicationSummary: ProductPortfolioPublicationSummary;
  entries: ProductPortfolioEntry[];
  historyByProductId: Record<string, ProductPortfolioHistoryEvent[]>;
  scenarioProjections: ProductPortfolioScenarioProjection[];
  summary: ProductPortfolioSummary;
  workspaceStatus: ProductPortfolioWorkspaceStatus;
};
