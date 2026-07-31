import {
  TerasActionButton,
  TerasRecordCellText,
  TerasRecordStatusStack,
  TerasRecordTable,
  type TerasRecordTableColumn,
  TerasStatusPill,
} from "@/teras";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import {
  productAvailabilityLabel,
  productAvailabilityTone,
  productFormLabel,
  productListingLabel,
  productListingScopeLabel,
  productListingTone,
  productMaturityLabel,
  productMaturityTone,
} from "./products-view-model.ts";

export function ProductPortfolioProductsRegisterTable({
  entries,
  onOpenProduct,
  onSelectProduct,
  selectedProductId,
}: {
  entries: ProductPortfolioEntry[];
  onOpenProduct: (entry: ProductPortfolioEntry) => void;
  onSelectProduct: (entry: ProductPortfolioEntry) => void;
  selectedProductId: string | null;
}) {
  const columns: Array<TerasRecordTableColumn<ProductPortfolioEntry>> = [
    {
      header: "Product",
      intent: "primary",
      key: "product",
      render: (entry) => (
        <TerasRecordCellText
          description={`${entry.identity.productId} / ${productFormLabel(entry)}`}
          meta={`Owner / ${entry.ownership.productOwnerRef}`}
          title={entry.identity.displayName}
          variant="value-stack"
        />
      ),
    },
    {
      header: "Maturity",
      intent: "status",
      key: "maturity",
      render: (entry) => (
        <TerasStatusPill tone={productMaturityTone(entry.maturity.level)}>
          {productMaturityLabel(entry.maturity.level)}
        </TerasStatusPill>
      ),
    },
    {
      header: "Availability",
      intent: "status",
      key: "availability",
      render: (entry) => (
        <TerasStatusPill
          tone={productAvailabilityTone(entry.runtime.availability)}
        >
          {productAvailabilityLabel(entry.runtime.availability)}
        </TerasStatusPill>
      ),
    },
    {
      header: "Listing",
      intent: "status",
      key: "listing",
      render: (entry) => (
        <TerasRecordStatusStack
          meta={productListingScopeLabel(entry.listing.scope)}
          status={
            <TerasStatusPill tone={productListingTone(entry)}>
              {productListingLabel(entry)}
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
            onOpenProduct(entry);
          }}
          size="table-compact"
          emphasis="secondary"
        >
          Open
        </TerasActionButton>
      ),
    },
  ];

  return (
    <TerasRecordTable
      columns={columns}
      fill
      getRowId={(entry) => entry.identity.productId}
      onSelect={onSelectProduct}
      rows={entries}
      selectedRowId={selectedProductId}
    />
  );
}
