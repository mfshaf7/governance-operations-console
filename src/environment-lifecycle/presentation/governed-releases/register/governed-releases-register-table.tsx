import {
  TerasActionButton,
  TerasRecordCellText,
  TerasRecordTable,
  TerasStatusPill,
  type TerasRecordTableColumn,
} from "@/teras";

import type { ProductReleaseCapability } from "../../../model/product-release-capability";
import { productReleaseMaturityLabels } from "../governed-releases-labels";

type GovernedReleaseRegisterRow = ProductReleaseCapability &
  Readonly<{ onInspect: () => void }>;

const columns: Array<TerasRecordTableColumn<GovernedReleaseRegisterRow>> = [
  {
    header: "Product",
    intent: "primary",
    key: "product",
    render: (product) => (
      <TerasRecordCellText
        meta={product.productId}
        title={product.productLabel}
      />
    ),
  },
  {
    header: "Maturity",
    intent: "status",
    key: "maturity",
    render: (product) => (
      <TerasStatusPill
        size="compact"
        tone={product.maturity === "fully-governed" ? "ok" : "info"}
      >
        {productReleaseMaturityLabels[product.maturity]}
      </TerasStatusPill>
    ),
  },
  {
    header: "Platform owner",
    intent: "secondary",
    key: "owner",
    render: (product) => (
      <TerasRecordCellText
        meta={product.securityOwner}
        title={product.platformOwner}
      />
    ),
  },
  {
    header: "Highest endpoint",
    intent: "technical",
    key: "endpoint",
    render: (product) => (
      <TerasRecordCellText
        meta={product.source.source}
        title={product.highestRealEndpoint}
      />
    ),
  },
  {
    align: "end",
    header: "Action",
    intent: "action",
    key: "action",
    render: (product) => (
      <TerasActionButton
        aria-label={`Inspect ${product.productId}`}
        emphasis="secondary"
        onClick={(event) => {
          event.stopPropagation();
          product.onInspect();
        }}
        size="table-compact"
      >
        Inspect
      </TerasActionButton>
    ),
  },
];

export function GovernedReleasesRegisterTable({
  onInspect,
  onSelect,
  products,
  selectedProductId,
}: {
  onInspect: (product: ProductReleaseCapability) => void;
  onSelect: (product: ProductReleaseCapability) => void;
  products: ProductReleaseCapability[];
  selectedProductId: string | null;
}) {
  const rows: GovernedReleaseRegisterRow[] = products.map((product) => ({
    ...product,
    onInspect: () => onInspect(product),
  }));

  return (
    <TerasRecordTable
      columns={columns}
      fill
      getRowId={(product) => product.productId}
      onSelect={onSelect}
      rows={rows}
      selectedRowId={selectedProductId}
    />
  );
}
