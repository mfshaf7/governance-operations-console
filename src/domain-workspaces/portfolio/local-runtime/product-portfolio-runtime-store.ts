import { createLocalOperationProjectionStore } from "../../operation-runtime/local-operation-projection-store.ts";

import type { ProductPublicationDecisionReceipt } from "../work-model/publication/product-publication-decision-types.ts";
import {
  productPortfolioRuntimeSource,
  type ProductPublicationCaptureLocalReceipt,
  type ProductPortfolioListingApplication,
} from "./product-portfolio-runtime-model.ts";

type ProductPortfolioRuntimeProjectionState = {
  publicationReceipts: ProductPublicationDecisionReceipt[];
  captureReceipts: ProductPublicationCaptureLocalReceipt[];
  listingApplications: ProductPortfolioListingApplication[];
};

export type ProductPortfolioRuntimeProjectionSnapshot =
  ProductPortfolioRuntimeProjectionState;

const productPortfolioRuntimeProjectionStore =
  createLocalOperationProjectionStore<
    ProductPortfolioRuntimeProjectionState,
    ProductPortfolioRuntimeProjectionSnapshot
  >({
    initialState: {
      publicationReceipts: [],
      captureReceipts: [],
      listingApplications: [],
    },
    projectSnapshot: (state) => state,
    runtimeSource: productPortfolioRuntimeSource,
  });

export function subscribeProductPortfolioRuntimeProjection(
  listener: () => void,
) {
  return productPortfolioRuntimeProjectionStore.subscribe(listener);
}

export function getProductPortfolioRuntimeProjectionSnapshot() {
  return productPortfolioRuntimeProjectionStore.getSnapshot();
}

export function recordProductPortfolioPublicationCaptureReceipt(
  receipt: ProductPublicationCaptureLocalReceipt,
) {
  productPortfolioRuntimeProjectionStore.updateState((currentState) => {
    if (
      currentState.captureReceipts.some(
        (candidate) => candidate.receiptId === receipt.receiptId,
      )
    ) {
      return currentState;
    }

    return {
      ...currentState,
      captureReceipts: [...currentState.captureReceipts, receipt],
    };
  });
}

export function recordProductPortfolioPublicationReceipt(
  receipt: ProductPublicationDecisionReceipt,
) {
  productPortfolioRuntimeProjectionStore.updateState((currentState) => {
    if (
      currentState.publicationReceipts.some(
        (candidate) => candidate.receiptId === receipt.receiptId,
      )
    ) {
      return currentState;
    }

    return {
      ...currentState,
      publicationReceipts: [...currentState.publicationReceipts, receipt],
    };
  });
}

export function recordProductPortfolioListingApplication(
  application: ProductPortfolioListingApplication,
) {
  productPortfolioRuntimeProjectionStore.updateState((currentState) => {
    if (
      currentState.listingApplications.some(
        (candidate) =>
          candidate.receipt.receiptId === application.receipt.receiptId,
      )
    ) {
      return currentState;
    }

    return {
      ...currentState,
      listingApplications: [...currentState.listingApplications, application],
    };
  });
}
