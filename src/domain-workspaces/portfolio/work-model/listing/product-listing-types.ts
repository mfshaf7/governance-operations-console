import type { ProductPortfolioEntry } from "../../domain/product-portfolio-entry-types.ts";
import type { ProductListingScope } from "../../domain/product-portfolio-vocabulary.ts";

export type ProductListingPosition =
  { kind: "after"; productId: string } | { kind: "first" } | { kind: "last" };

export type ProductListingDraft =
  | {
      featured: boolean;
      position: ProductListingPosition;
      scope: ProductListingScope;
      state: "listed";
    }
  | {
      featured: false;
      position: null;
      scope: ProductListingScope;
      state: "unlisted";
    };

export type ProductListingCommand = {
  draft: ProductListingDraft;
  expectedPublicationReceiptRef: string;
  idempotencyKey: string;
  productId: string;
  submittedAt: string;
  submittedByRef: string;
};

export type ProductListingValidation = {
  allowed: boolean;
  findings: string[];
};

export type ProductListingReceipt = {
  after: ProductPortfolioEntry["listing"];
  before: ProductPortfolioEntry["listing"];
  commandName: "portfolio.listing.apply";
  idempotencyKey: string;
  productId: string;
  receiptId: string;
  recordedAt: string;
  reorderedProductIds: string[];
  resultState: "updated";
  schemaVersion: 1;
  submittedByRef: string;
  summary: string;
};

export type ProductListingApplyResult = {
  entries: ProductPortfolioEntry[];
  entry: ProductPortfolioEntry;
  receipt: ProductListingReceipt;
};
