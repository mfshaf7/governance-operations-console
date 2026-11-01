"use client";

import { useMemo } from "react";
import type { ProductPortfolioEntry } from "../../../domain/product-portfolio-entry-types.ts";
import type { useProductPublicationLiveRuntime } from "../../../live-runtime/use-product-publication-live-runtime.ts";
import type { ProductPublicationPreparation } from "../../../live-runtime/product-publication-preparation.ts";
import { preparePreviewPublication } from "../../../local-runtime/product-publication-preview.ts";
import { OwnerPublicationSurface, useOwnerPublicationState } from "./owner-publication-surface.tsx";

// Explicit disconnected development preview only. Reuses the normal operator
// component, with no owner submit/read function and no successful fake receipt.
export function OwnerPublicationPreview({ entries, runtime, state }: {
  entries: ProductPortfolioEntry[]; runtime: ReturnType<typeof useProductPublicationLiveRuntime>;
  state: ReturnType<typeof useOwnerPublicationState>;
}) {
  const products = useMemo(() => entries.map(entry => ({
    product_id: `product:${entry.identity.productId}`, name: entry.identity.displayName,
  })), [entries]);
  const previewRuntime = { ...runtime, mode: { mode: "disconnected-preview" as const, reason_code: "design_preview" },
    pending: false, error: null,
    async prepare(productId: string): Promise<ProductPublicationPreparation> {
      if (!products.some(product => product.product_id === productId)) throw new Error("Select an example product.");
      return preparePreviewPublication(entries, productId);
    },
    async read(): Promise<never> { throw new Error("Owner request recovery is unavailable in design preview."); },
    async submit(): Promise<never> { throw new Error("Publishing is disabled in design preview."); },
    async refreshMode() { return { mode: "disconnected-preview" as const, reason_code: "design_preview" }; },
  };
  return <OwnerPublicationSurface runtime={previewRuntime} state={state} products={products} productsError={null}
    authorityRevision={"0".repeat(40)} previewMode onRetryProducts={() => undefined} onApplied={() => undefined} />;
}
