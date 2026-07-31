import { TerasActionButton, TerasSelectedPanel } from "@/teras";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import {
  productSelectedPanelFacts,
  productSelectedPanelStatus,
  productSelectedPanelTone,
} from "./products-view-model.ts";

export function ProductPortfolioProductsSelectedPanel({
  entry,
  onOpenProduct,
}: {
  entry: ProductPortfolioEntry;
  onOpenProduct: (entry: ProductPortfolioEntry) => void;
}) {
  const tone = productSelectedPanelTone(entry);

  return (
    <TerasSelectedPanel
      action={{
        description:
          "Review product identity, operating state, release evidence, and history.",
        kicker: "Product Access",
        node: (
          <TerasActionButton
            data-product-portfolio-open-dashboard="true"
            onClick={() => onOpenProduct(entry)}
            emphasis="primary"
          >
            Open Product
          </TerasActionButton>
        ),
        title: "Product Dashboard",
      }}
      description={entry.identity.summary}
      facts={productSelectedPanelFacts(entry)}
      kicker="Selected Product"
      selected
      status={{
        label: productSelectedPanelStatus(entry),
        tone,
      }}
      title={entry.identity.displayName}
      tone={tone}
      variant="rich"
    />
  );
}
