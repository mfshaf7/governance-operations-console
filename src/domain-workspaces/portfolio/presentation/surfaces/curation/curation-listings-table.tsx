import {
  TerasActionButton,
  TerasRecordCellText,
  TerasRecordStatusStack,
  TerasRecordTable,
  type TerasRecordTableColumn,
  TerasStatusPill,
} from "@/teras";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import { productListingScopeLabel } from "../products/products-view-model.ts";
import {
  productCurationPlacementLabel,
  productCurationPlacementTone,
  productCurationPositionLabel,
} from "./curation-view-model.ts";

export function ProductPortfolioCurationListingsTable({
  entries,
  onSelect,
  selectedProductId,
  sourceEntries,
}: {
  entries: ProductPortfolioEntry[];
  onSelect: (entry: ProductPortfolioEntry) => void;
  selectedProductId: string | null;
  sourceEntries: ProductPortfolioEntry[];
}) {
  const columns: Array<TerasRecordTableColumn<ProductPortfolioEntry>> = [
    {
      header: "Product",
      intent: "primary",
      key: "product",
      render: (entry) => (
        <TerasRecordCellText
          description={entry.identity.productId}
          title={entry.identity.displayName}
          variant="value-stack"
        />
      ),
    },
    {
      header: "Scope",
      intent: "status",
      key: "scope",
      render: (entry) => (
        <TerasStatusPill tone="info">
          {productListingScopeLabel(entry.listing.scope)}
        </TerasStatusPill>
      ),
    },
    {
      header: "Placement",
      intent: "secondary",
      key: "placement",
      render: (entry) => (
        <TerasRecordStatusStack
          meta={productCurationPositionLabel(sourceEntries, entry)}
          status={
            <TerasStatusPill tone={productCurationPlacementTone(entry)}>
              {productCurationPlacementLabel(entry)}
            </TerasStatusPill>
          }
        />
      ),
    },
    {
      header: "Action",
      intent: "action",
      key: "action",
      render: (entry) => (
        <TerasActionButton
          onClick={(event) => {
            event.stopPropagation();
            onSelect(entry);
          }}
          size="table-compact"
          emphasis="secondary"
        >
          Select
        </TerasActionButton>
      ),
    },
  ];

  return (
    <TerasRecordTable
      columns={columns}
      fill
      getRowId={(entry) => entry.identity.productId}
      onSelect={onSelect}
      rows={entries}
      selectedRowId={selectedProductId}
    />
  );
}
