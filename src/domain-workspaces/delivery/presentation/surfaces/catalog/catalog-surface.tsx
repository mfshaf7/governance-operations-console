"use client";

import type { DeliveryReadModel } from "../../../read-model/index.ts";

import { TerasSelectorValueInspectorLayout } from "@/teras";

import { CatalogInspectorPanel } from "./catalog-inspector-panel.tsx";
import { CatalogMutationDialog } from "./catalog-mutation-dialog.tsx";
import { CatalogSelectorPanel } from "./catalog-selector-panel.tsx";
import { CatalogValuesPanel } from "./catalog-values-panel.tsx";
import { useCatalogControlState } from "./use-catalog-control-state.ts";

export function DeliveryCatalogSurface({
  model,
}: {
  model: DeliveryReadModel;
}) {
  const catalogState = useCatalogControlState(model);

  return (
    <TerasSelectorValueInspectorLayout
      data-delivery-catalog="catalog"
      selector={
        <CatalogSelectorPanel
          activeCatalog={catalogState.activeCatalog}
          catalogValues={catalogState.catalogValues}
          catalogs={catalogState.catalogs}
          onSwitchCatalog={catalogState.switchCatalog}
          runtimeMode={catalogState.runtimeMode}
          runtimeStatus={catalogState.runtimeStatus}
        />
      }
      values={
        <CatalogValuesPanel
          activeCatalog={catalogState.activeCatalog}
          canEdit={catalogState.canEditCatalogValue}
          canMutate={catalogState.canMutateActiveCatalog}
          canRetire={catalogState.canRetireCatalogValue}
          catalogValues={catalogState.catalogValues}
          emptyMessage={catalogState.projectionError ?? undefined}
          onAdd={catalogState.openAddDraft}
          onEdit={catalogState.openEditDraft}
          onRetire={catalogState.openRetireDraft}
          onSearchChange={catalogState.setSearch}
          onSelect={catalogState.selectValue}
          search={catalogState.search}
          selectedValue={catalogState.selectedValue}
          visibleValues={catalogState.visibleValues}
        />
      }
      inspector={
        <CatalogInspectorPanel
          activeCatalog={catalogState.activeCatalog}
          canEditSelectedValue={catalogState.canEditSelectedValue}
          canRetireSelectedValue={catalogState.canRetireSelectedValue}
          onEdit={catalogState.openEditDraft}
          onRetire={catalogState.openRetireDraft}
          selectedDraftReceipt={catalogState.selectedDraftReceipt}
          selectedTargetPiPlanningFacetSummary={
            catalogState.selectedTargetPiPlanningFacetSummary
          }
          selectedValue={catalogState.selectedValue}
        />
      }
    >
      <CatalogMutationDialog
        catalog={catalogState.activeCatalog}
        catalogValues={catalogState.catalogValues}
        mode={catalogState.mutationDraft?.mode ?? null}
        mutationError={catalogState.mutationError}
        onClose={catalogState.closeMutationDraft}
        onSubmit={catalogState.submitCatalogDraft}
        open={Boolean(catalogState.mutationDraft)}
        ownerRepoOptions={catalogState.ownerRepoOptions}
        planningFacetSummary={catalogState.mutationPlanningFacetSummary}
        targetPiValues={catalogState.targetPiValues}
        value={catalogState.mutationValue}
      />
    </TerasSelectorValueInspectorLayout>
  );
}
