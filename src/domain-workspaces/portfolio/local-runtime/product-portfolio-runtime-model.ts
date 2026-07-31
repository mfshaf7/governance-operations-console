import type { OperationRuntimeSource } from "../../operation-runtime/operation-runtime-types.ts";

import type { ProductSourceVersion } from "../domain/product-portfolio-vocabulary.ts";
import type { ProductPortfolioScenarioProjection } from "../read-model/types/product-portfolio-fixture-types.ts";
import type {
  ProductPublicationDecisionApplyResult,
  ProductPublicationDecisionDraft,
  ProductPublicationDecisionReceipt,
} from "../work-model/publication/product-publication-decision-types.ts";
import type {
  ProductListingApplyResult,
  ProductListingCommand,
  ProductListingReceipt,
} from "../work-model/listing/product-listing-types.ts";

export type ProductPortfolioPublicationRuntimeCommand = {
  decidedAt: string;
  decidedByRef: string;
  domainIdempotencyKey: string;
  draft: ProductPublicationDecisionDraft;
  expectedPublicationReceiptRef: string;
  kind: "apply-publication";
  packetId: string;
  scenarioId: string;
};

export type ProductPortfolioPublicationCaptureRuntimeCommand = {
  capturedByRef: string;
  expectedPublicationReceiptRef: string;
  kind: "capture-publication";
  sourceId: string;
};

export type ProductPortfolioPublicationCaptureSubmission = {
  capturedAt: string;
  capturedByRef: string;
  expectedPublicationReceiptRef: string;
  sourceId: string;
};

export type ProductPortfolioPublicationSubmission = {
  decidedAt: string;
  decidedByRef: string;
  draft: ProductPublicationDecisionDraft;
  idempotencyKey: string;
  record: ProductPortfolioScenarioProjection;
};

export type ProductPortfolioListingRuntimeCommand = {
  command: Omit<ProductListingCommand, "submittedAt">;
  kind: "apply-listing";
};

export type ProductPortfolioRuntimeCommand =
  | ProductPortfolioPublicationCaptureRuntimeCommand
  | ProductPortfolioPublicationRuntimeCommand
  | ProductPortfolioListingRuntimeCommand;

export type ProductPortfolioRuntimeRun =
  | {
      kind: "capture";
      source: ProductPortfolioScenarioProjection;
      summary: string;
    }
  | {
      kind: "publication";
      result: ProductPublicationDecisionApplyResult;
      summary: string;
    }
  | {
      kind: "listing";
      result: ProductListingApplyResult;
      summary: string;
    };

export type ProductPublicationCaptureLocalReceipt = {
  capturedByRef: string;
  commandName: "portfolio.publication.capture";
  idempotencyKey: string;
  kind: "capture";
  packetId: string;
  productId: string;
  publicationReceiptRef: string;
  receiptId: string;
  recordedAt: string;
  resultState: "captured";
  schemaVersion: 1;
  sourceId: string;
  sourceVersions: ProductSourceVersion[];
  summary: string;
};

export type ProductPortfolioRuntimeReceipt =
  | ProductPublicationCaptureLocalReceipt
  | ProductPublicationDecisionReceipt
  | ProductListingReceipt;

export type ProductPortfolioPublicationCaptureResult = {
  receipt: ProductPublicationCaptureLocalReceipt;
  source: ProductPortfolioScenarioProjection;
};

export type ProductPortfolioListingApplication = {
  command: ProductListingCommand;
  receipt: ProductListingReceipt;
  result: ProductListingApplyResult;
};

export function productPortfolioPublicationCaptureIdempotencyKey(
  sourceId: string,
  publicationReceiptRef: string,
) {
  return `portfolio-publication-capture:${sourceId}:${publicationReceiptRef}`;
}

export const productPortfolioRuntimeSource = {
  authority: "prototype-local",
  mode: "local",
  sourceOwner: "product-portfolio-operation",
} satisfies OperationRuntimeSource & { mode: "local" };
