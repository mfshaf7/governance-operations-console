"use client";

import { useEffect, useState } from "react";

import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import type {
  ProductListingApplyResult,
  ProductListingCommand,
} from "../../../work-model/listing/product-listing-types.ts";
import {
  productCurationViewAfterApply,
  productPortfolioCurationEntries,
  productPortfolioCurationViewForEntry,
  type ProductPortfolioCurationViewId,
} from "./curation-view-model.ts";

export function useProductPortfolioCurationController({
  entries,
  focusedProductId,
  onApplyListing,
}: {
  entries: ProductPortfolioEntry[];
  focusedProductId?: string | null;
  onApplyListing: (
    command: ProductListingCommand,
  ) => Promise<ProductListingApplyResult>;
}) {
  const [activeViewId, setActiveViewId] =
    useState<ProductPortfolioCurationViewId>("all-active");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    focusedProductId ?? null,
  );
  const visibleEntries = productPortfolioCurationEntries(
    entries,
    activeViewId,
    query,
  );
  const selectedEntry =
    visibleEntries.find(
      (entry) => entry.identity.productId === selectedProductId,
    ) ??
    visibleEntries[0] ??
    null;
  const editingEntry =
    entries.find((entry) => entry.identity.productId === editingProductId) ??
    null;

  useEffect(() => {
    if (!focusedProductId) return;

    const focusedEntry = entries.find(
      (entry) => entry.identity.productId === focusedProductId,
    );
    if (!focusedEntry || focusedEntry.listing.state === "retired") return;

    setActiveViewId(productPortfolioCurationViewForEntry(focusedEntry));
    setSelectedProductId(focusedProductId);
  }, [entries, focusedProductId]);

  async function applyListing(command: ProductListingCommand) {
    const result = await onApplyListing(command);

    setSelectedProductId(result.entry.identity.productId);
    setActiveViewId((currentViewId) =>
      productCurationViewAfterApply(currentViewId, result.entry),
    );
    return result;
  }

  return {
    activeViewId,
    closeEdit: () => setEditingProductId(null),
    editingEntry,
    applyListing,
    openEdit: (entry: ProductPortfolioEntry) =>
      setEditingProductId(entry.identity.productId),
    query,
    selectEntry: (entry: ProductPortfolioEntry) =>
      setSelectedProductId(entry.identity.productId),
    selectedEntry,
    setActiveViewId,
    setQuery,
    visibleEntries,
  };
}
