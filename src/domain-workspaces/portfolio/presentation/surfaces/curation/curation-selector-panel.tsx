import {
  TerasPanel,
  TerasPanelHeader,
  TerasRailButton,
  TerasSelectorRailList,
} from "@/teras";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import {
  productPortfolioCurationViewCount,
  productPortfolioCurationViews,
  type ProductPortfolioCurationViewId,
} from "./curation-view-model.ts";

export function ProductPortfolioCurationSelectorPanel({
  activeViewId,
  entries,
  onViewChange,
}: {
  activeViewId: ProductPortfolioCurationViewId;
  entries: ProductPortfolioEntry[];
  onViewChange: (viewId: ProductPortfolioCurationViewId) => void;
}) {
  return (
    <TerasPanel
      frame="flush"
      treatment="state"
      density="normal"
      layout="header-body"
      overflow="hidden"
      tone="warn"
    >
      <TerasPanelHeader
        description="Select one listing cohort, then inspect or change its Portfolio-owned catalog placement."
        kicker="Curation Views"
        statusLabel="local"
        statusTone="warn"
        title="Listing cohorts"
      />

      <TerasSelectorRailList>
        {productPortfolioCurationViews.map((view) => (
          <TerasRailButton
            current={view.id === activeViewId}
            detail={view.description}
            key={view.id}
            label={view.label}
            metricLabel="products"
            metricValue={productPortfolioCurationViewCount(entries, view.id)}
            onClick={() => onViewChange(view.id)}
            tone="warn"
            variant="metric-split"
          />
        ))}
      </TerasSelectorRailList>
    </TerasPanel>
  );
}
