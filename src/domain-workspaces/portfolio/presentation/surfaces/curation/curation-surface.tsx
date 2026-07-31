"use client";

import { TerasSelectorValueInspectorLayout } from "@/teras";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import type {
  ProductListingApplyResult,
  ProductListingCommand,
  ProductListingReceipt,
} from "../../../work-model/listing/product-listing-types.ts";
import { ProductPortfolioCurationInspectorPanel } from "./curation-inspector-panel.tsx";
import { ProductPortfolioCurationSelectorPanel } from "./curation-selector-panel.tsx";
import { ProductPortfolioCurationValuesPanel } from "./curation-values-panel.tsx";
import { ProductListingEditDialog } from "./listing-edit-dialog.tsx";
import { useProductPortfolioCurationController } from "./use-curation-controller.ts";

export function ProductPortfolioCurationSurface({
  entries,
  focusedProductId,
  listingReceipts,
  onApplyListing,
}: {
  entries: ProductPortfolioEntry[];
  focusedProductId?: string | null;
  listingReceipts: ProductListingReceipt[];
  onApplyListing: (
    command: ProductListingCommand,
  ) => Promise<ProductListingApplyResult>;
}) {
  const controller = useProductPortfolioCurationController({
    entries,
    focusedProductId,
    onApplyListing,
  });

  return (
    <TerasSelectorValueInspectorLayout
      data-product-portfolio-curation="true"
      selector={
        <ProductPortfolioCurationSelectorPanel
          activeViewId={controller.activeViewId}
          entries={entries}
          onViewChange={controller.setActiveViewId}
        />
      }
      values={
        <ProductPortfolioCurationValuesPanel
          activeViewId={controller.activeViewId}
          entries={controller.visibleEntries}
          onQueryChange={controller.setQuery}
          onSelect={controller.selectEntry}
          query={controller.query}
          selectedEntry={controller.selectedEntry}
          sourceEntries={entries}
        />
      }
      inspector={
        <ProductPortfolioCurationInspectorPanel
          entries={entries}
          listingReceipts={listingReceipts}
          onEdit={controller.openEdit}
          selectedEntry={controller.selectedEntry}
        />
      }
    >
      {controller.editingEntry ? (
        <ProductListingEditDialog
          entries={entries}
          entry={controller.editingEntry}
          key={controller.editingEntry.identity.productId}
          onApply={controller.applyListing}
          onClose={controller.closeEdit}
        />
      ) : null}
    </TerasSelectorValueInspectorLayout>
  );
}
