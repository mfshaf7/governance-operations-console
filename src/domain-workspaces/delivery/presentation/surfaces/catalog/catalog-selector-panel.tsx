import type {
  DeliveryCatalogItem,
  DeliveryCatalogValue,
} from "../../../read-model/index.ts";

import {
  TerasSelectorRailList,
  TerasPanel,
  TerasPanelHeader,
  TerasRailButton,
} from "@/teras";

export function CatalogSelectorPanel({
  activeCatalog,
  catalogValues,
  catalogs,
  onSwitchCatalog,
}: {
  activeCatalog: DeliveryCatalogItem | null;
  catalogValues: DeliveryCatalogValue[];
  catalogs: DeliveryCatalogItem[];
  onSwitchCatalog: (catalogId: string) => void;
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
        kicker="Delivery Catalog"
        statusLabel="local"
        statusTone="warn"
        title="Metadata Catalogs"
        description="Select a catalog, review its current values, then add, edit, or retire values through the backend-owned route."
      />

      <TerasSelectorRailList>
        {catalogs.map((catalog) => {
          const valueCount = catalogValues.filter(
            (value) => value.catalog_item_id === catalog.catalog_item_id,
          ).length;

          return (
            <TerasRailButton
              current={
                catalog.catalog_item_id === activeCatalog?.catalog_item_id
              }
              detail={catalog.description}
              key={catalog.catalog_item_id}
              label={catalog.label}
              metricLabel="values"
              metricValue={valueCount}
              onClick={() => onSwitchCatalog(catalog.catalog_item_id)}
              tone="warn"
              variant="metric-split"
            />
          );
        })}
      </TerasSelectorRailList>
    </TerasPanel>
  );
}
