import type { ProductPortfolioHistoryEvent } from "../read-model/types/product-portfolio-history-types.ts";
import type { ProductPublicationDecisionReceipt } from "../work-model/publication/product-publication-decision-types.ts";
import type { ProductListingReceipt } from "../work-model/listing/product-listing-types.ts";
import type { ProductPublicationCaptureLocalReceipt } from "./product-portfolio-runtime-model.ts";

export function productPortfolioRuntimeHistoryEvents({
  publicationReceipts,
  captureReceipts,
  listingReceipts,
}: {
  publicationReceipts: ProductPublicationDecisionReceipt[];
  captureReceipts: ProductPublicationCaptureLocalReceipt[];
  listingReceipts: ProductListingReceipt[];
}): ProductPortfolioHistoryEvent[] {
  return [
    ...captureReceipts.map(productPublicationCaptureHistoryEvent),
    ...publicationReceipts.map(productPublicationDecisionHistoryEvent),
    ...listingReceipts.map(productListingHistoryEvent),
  ];
}

function productPublicationCaptureHistoryEvent(
  receipt: ProductPublicationCaptureLocalReceipt,
): ProductPortfolioHistoryEvent {
  return {
    eventId: receipt.receiptId,
    kind: "publication-capture",
    occurredAt: receipt.recordedAt,
    productId: receipt.productId,
    receiptRef: receipt.receiptId,
    sourceMode: "prototype-local",
    sourceRef: receipt.publicationReceiptRef,
    state: receipt.resultState,
    summary: receipt.summary,
  };
}

function productPublicationDecisionHistoryEvent(
  receipt: ProductPublicationDecisionReceipt,
): ProductPortfolioHistoryEvent {
  return {
    eventId: receipt.receiptId,
    kind: "publication-decision",
    occurredAt: receipt.recordedAt,
    productId: receipt.productId,
    receiptRef: receipt.receiptId,
    sourceMode: "prototype-local",
    sourceRef: receipt.publicationReceiptRef,
    state: receipt.resultState,
    summary: receipt.summary,
  };
}

function productListingHistoryEvent(
  receipt: ProductListingReceipt,
): ProductPortfolioHistoryEvent {
  return {
    eventId: receipt.receiptId,
    kind: "listing-update",
    occurredAt: receipt.recordedAt,
    productId: receipt.productId,
    receiptRef: receipt.receiptId,
    sourceMode: "prototype-local",
    sourceRef: receipt.idempotencyKey,
    state: receipt.after.state,
    summary: receipt.summary,
  };
}
