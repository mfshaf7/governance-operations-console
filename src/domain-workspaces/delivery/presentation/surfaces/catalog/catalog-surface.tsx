"use client";

import type { DeliveryReadModel } from "../../../read-model/index.ts";
import type { CatalogDeliveryLinkTarget } from "../../../live-runtime/catalog-live-types.ts";

import { TerasSelectorValueInspectorLayout } from "@/teras";

import { CatalogInspectorPanel } from "./catalog-inspector-panel.tsx";
import { CatalogMutationDialog } from "./catalog-mutation-dialog.tsx";
import { CatalogRepositoryLinkDialog } from "./catalog-repository-link-dialog.tsx";
import { CatalogSelectorPanel } from "./catalog-selector-panel.tsx";
import { CatalogValuesPanel } from "./catalog-values-panel.tsx";
import { useCatalogControlState } from "./use-catalog-control-state.ts";

export function DeliveryCatalogSurface({
  deliveryLinkTarget = null,
  model,
}: {
  deliveryLinkTarget?: CatalogDeliveryLinkTarget | null;
  model: DeliveryReadModel;
}) {
  const catalogState = useCatalogControlState(model, deliveryLinkTarget);

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
          deliveryLinkTarget={catalogState.repositoryLink.target}
          linkBlockedReason={catalogState.repositoryLink.blockedReason}
          onEdit={catalogState.openEditDraft}
          onLinkToDelivery={catalogState.repositoryLink.onOpen}
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
      <CatalogRepositoryLinkDialog
        blockedReason={catalogState.repositoryLink.blockedReason}
        error={catalogState.repositoryLink.error}
        note={catalogState.repositoryLink.note}
        onClose={catalogState.repositoryLink.close}
        onNoteChange={catalogState.repositoryLink.onNoteChange}
        onSubmit={catalogState.repositoryLink.onSubmit}
        open={catalogState.repositoryLink.open}
        pending={catalogState.repositoryLink.pending}
        readiness={catalogState.repositoryLink.readiness}
        repository={catalogState.repositoryLink.repository}
        result={catalogState.repositoryLink.result}
        target={catalogState.repositoryLink.target}
        value={catalogState.selectedValue}
      />
    </TerasSelectorValueInspectorLayout>
  );
}
