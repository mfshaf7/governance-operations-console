import type {
  DeliveryCatalogItem,
  DeliveryCatalogValue,
} from "../../../read-model/index.ts";

import {
  TerasActionButton,
  TerasActionRow,
  TerasEmptyState,
  TerasContentTray,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasTrayStack,
} from "@/teras";

import {
  catalogAuthorityMetadata,
  catalogDraftReceiptMetadata,
  catalogLifecycleLabel,
  catalogLifecycleTone,
  catalogRelatedContextMetadata,
  catalogRetirementActionLabel,
  catalogValueMutationDisabledReason,
  catalogValueMetadata,
  type CatalogLocalDraftReceipt,
} from "./catalog-view-model.ts";

export function CatalogInspectorPanel({
  activeCatalog,
  canEditSelectedValue,
  canRetireSelectedValue,
  onEdit,
  onRetire,
  selectedDraftReceipt,
  selectedTargetPiPlanningFacetSummary,
  selectedValue,
}: {
  activeCatalog: DeliveryCatalogItem | null;
  canEditSelectedValue: boolean;
  canRetireSelectedValue: boolean;
  onEdit: (value: DeliveryCatalogValue) => void;
  onRetire: (value: DeliveryCatalogValue) => void;
  selectedDraftReceipt: CatalogLocalDraftReceipt | null;
  selectedTargetPiPlanningFacetSummary: string | null;
  selectedValue: DeliveryCatalogValue | null;
}) {
  return (
    <TerasPanel
      density="normal"
      frame="padded"
      treatment="rail"
      layout="header-body-footer"
      overflow="hidden"
      spacing="compact"
      tone={
        selectedValue
          ? catalogLifecycleTone(selectedValue.lifecycle_state)
          : "muted"
      }
    >
      {selectedValue && activeCatalog ? (
        <>
          <TerasPanelHeader
            kicker={activeCatalog.label}
            statusLabel={catalogLifecycleLabel(selectedValue.lifecycle_state)}
            statusTone={catalogLifecycleTone(selectedValue.lifecycle_state)}
            title={selectedValue.label}
            description={selectedValue.description}
          />

          <TerasTrayStack scroll>
            {selectedDraftReceipt ? (
              <TerasContentTray kicker="Local Draft">
                <TerasMetadataList
                  items={catalogDraftReceiptMetadata(selectedDraftReceipt)}
                />
              </TerasContentTray>
            ) : null}

            <TerasContentTray kicker="Value">
              <TerasMetadataList
                items={catalogValueMetadata(activeCatalog, selectedValue)}
              />
            </TerasContentTray>

            <TerasContentTray kicker="Authority">
              <TerasMetadataList
                items={catalogAuthorityMetadata(activeCatalog, selectedValue)}
              />
            </TerasContentTray>

            <TerasContentTray kicker="Related Context">
              <TerasMetadataList
                items={catalogRelatedContextMetadata({
                  catalog: activeCatalog,
                  planningFacetSummary: selectedTargetPiPlanningFacetSummary,
                  value: selectedValue,
                })}
              />
            </TerasContentTray>
          </TerasTrayStack>

          <TerasActionRow spacing="compact">
            <TerasActionButton
              disabled={!canRetireSelectedValue}
              onClick={() => onRetire(selectedValue)}
              title={catalogValueMutationDisabledReason(
                activeCatalog,
                selectedValue,
                "retire",
              )}
              emphasis="secondary"
            >
              {catalogRetirementActionLabel(selectedValue)}
            </TerasActionButton>
            <TerasActionButton
              disabled={!canEditSelectedValue}
              onClick={() => onEdit(selectedValue)}
              title={catalogValueMutationDisabledReason(
                activeCatalog,
                selectedValue,
                "edit",
              )}
              emphasis="primary"
            >
              Edit
            </TerasActionButton>
          </TerasActionRow>
        </>
      ) : (
        <TerasEmptyState>
          Select a current value to inspect or modify it.
        </TerasEmptyState>
      )}
    </TerasPanel>
  );
}
