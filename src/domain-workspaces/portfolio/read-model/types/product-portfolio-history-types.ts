import type {
  ProductAvailability,
  ProductListingState,
} from "../../domain/product-portfolio-vocabulary.ts";
import type {
  ProductPublicationState,
  ProductEntryProjection,
} from "../../work-model/publication/product-publication-review-types.ts";

export type ProductPortfolioHistoryEventKind =
  | "publication-capture"
  | "publication-decision"
  | "listing-update"
  | "product-publication"
  | "release"
  | "runtime-observation";

export type ProductPortfolioHistoryEventState =
  | ProductPublicationState
  | ProductAvailability
  | ProductEntryProjection
  | ProductListingState
  | "recorded"
  | "released";

export type ProductPortfolioHistoryEvent = Readonly<{
  eventId: string;
  kind: ProductPortfolioHistoryEventKind;
  occurredAt: string;
  productId: string;
  receiptRef: string | null;
  sourceMode: "prototype-local" | "source-projection";
  sourceRef: string;
  state: ProductPortfolioHistoryEventState;
  summary: string;
}>;
