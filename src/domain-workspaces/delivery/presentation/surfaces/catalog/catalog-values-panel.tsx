import type {
  DeliveryCatalogItem,
  DeliveryCatalogValue,
} from "../../../read-model/index.ts";

import {
  TerasActionButton,
  TerasEmptyState,
  TerasFilterBar,
  TerasPanel,
  TerasPanelHeader,
} from "@/teras";

import { CatalogValuesTable } from "./catalog-current-values.tsx";
import {
  catalogPrimaryMutationActionLabel,
  catalogPrimaryMutationDisabledReason,
} from "./catalog-view-model.ts";

export function CatalogValuesPanel({
  activeCatalog,
  canEdit,
  canMutate,
  canRetire,
  catalogValues,
  emptyMessage,
  onAdd,
  onEdit,
  onRetire,
  onSearchChange,
  onSelect,
  search,
  selectedValue,
  visibleValues,
}: {
  activeCatalog: DeliveryCatalogItem | null;
  canEdit: (value: DeliveryCatalogValue) => boolean;
  canMutate: boolean;
  canRetire: (value: DeliveryCatalogValue) => boolean;
  catalogValues: DeliveryCatalogValue[];
  emptyMessage?: string;
  onAdd: () => void;
  onEdit: (value: DeliveryCatalogValue) => void;
  onRetire: (value: DeliveryCatalogValue) => void;
  onSearchChange: (value: string) => void;
  onSelect: (value: DeliveryCatalogValue) => void;
  search: string;
  selectedValue: DeliveryCatalogValue | null;
  visibleValues: DeliveryCatalogValue[];
}) {
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
        kicker={activeCatalog?.label ?? "Catalog"}
        title="Current Values"
        description={
          activeCatalog
            ? activeCatalog.description
            : "Select a catalog to manage its backend-controlled values."
        }
      />

      <TerasFilterBar
        action={
          <TerasActionButton
            disabled={!canMutate}
            onClick={onAdd}
            title={
              canMutate
                ? undefined
                : catalogPrimaryMutationDisabledReason(activeCatalog)
            }
            emphasis="secondary"
          >
            {catalogPrimaryMutationActionLabel(activeCatalog)}
          </TerasActionButton>
        }
        search={{
          ariaLabel: "Search current catalog values",
          onValueChange: onSearchChange,
          placeholder: "Search current values...",
          value: search,
        }}
      />

      {visibleValues.length > 0 ? (
        <CatalogValuesTable
          activeCatalog={activeCatalog}
          canEdit={canEdit}
          canRetire={canRetire}
          catalogValues={catalogValues}
          onEdit={onEdit}
          onRetire={onRetire}
          onSelect={onSelect}
          rows={visibleValues}
          selectedRowId={selectedValue?.catalog_value_id ?? null}
        />
      ) : (
        <TerasEmptyState fill>
          {emptyMessage ?? "No current values match this catalog and search."}
        </TerasEmptyState>
      )}
    </TerasPanel>
  );
}
