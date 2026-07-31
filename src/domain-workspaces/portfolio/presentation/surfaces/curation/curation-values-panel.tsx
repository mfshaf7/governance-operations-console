import {
  TerasEmptyState,
  TerasFilterBar,
  TerasPanel,
  TerasPanelHeader,
} from "@/teras";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import { ProductPortfolioCurationListingsTable } from "./curation-listings-table.tsx";
import {
  productPortfolioCurationViews,
  type ProductPortfolioCurationViewId,
} from "./curation-view-model.ts";

export function ProductPortfolioCurationValuesPanel({
  activeViewId,
  entries,
  onQueryChange,
  onSelect,
  query,
  selectedEntry,
  sourceEntries,
}: {
  activeViewId: ProductPortfolioCurationViewId;
  entries: ProductPortfolioEntry[];
  onQueryChange: (value: string) => void;
  onSelect: (entry: ProductPortfolioEntry) => void;
  query: string;
  selectedEntry: ProductPortfolioEntry | null;
  sourceEntries: ProductPortfolioEntry[];
}) {
  const activeView = productPortfolioCurationViews.find(
    (view) => view.id === activeViewId,
  );

  return (
    <TerasPanel
      frame="flush"
      treatment="state"
      density="normal"
      layout="header-toolbar-body"
      overflow="hidden"
      tone="warn"
    >
      <TerasPanelHeader
        description={
          activeView?.description ??
          "Review the current Portfolio listing cohort."
        }
        kicker={activeView?.label ?? "Curation"}
        statusLabel={`${entries.length} shown`}
        statusTone="info"
        title="Current listings"
      />

      <TerasFilterBar
        search={{
          ariaLabel: "Search current product listings",
          onValueChange: onQueryChange,
          placeholder: "Search product, id, owner, or scope...",
          value: query,
        }}
      />

      {entries.length > 0 ? (
        <ProductPortfolioCurationListingsTable
          entries={entries}
          onSelect={onSelect}
          selectedProductId={selectedEntry?.identity.productId ?? null}
          sourceEntries={sourceEntries}
        />
      ) : (
        <TerasEmptyState fill>
          No product listing matches this curation view and search.
        </TerasEmptyState>
      )}
    </TerasPanel>
  );
}
