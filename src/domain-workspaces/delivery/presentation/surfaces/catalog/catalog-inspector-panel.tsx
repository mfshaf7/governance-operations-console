import { deliveryFieldDisplayLabel } from "../../../read-model/terms/copy.ts";
import type {
  DeliveryCatalogItem,
  DeliveryCatalogValue,
} from "../../../read-model/index.ts";
import type { CatalogDeliveryLinkTarget } from "../../../live-runtime/catalog-live-types.ts";

import {
  TerasActionButton,
  TerasActionRow,
  TerasEmptyState,
  TerasContentTray,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasTrayStack,
  TerasTechnicalDetails,
} from "@/teras";

import {
  catalogAuthorityMetadata,
  catalogDraftReceiptMetadata,
  catalogLifecycleLabel,
  catalogLifecycleTone,
  catalogRelatedContextMetadata,
  canDraftCatalogValueMutation,
  isOwnerRepoCatalog,
  catalogValueMutationDisabledReason,
  catalogValueMetadata,
  type CatalogLocalDraftReceipt,
} from "./catalog-view-model.ts";

export function CatalogInspectorPanel({
  activeCatalog,
  preview = false,
  canEditSelectedValue,
  canRetireSelectedValue,
  deliveryLinkTarget,
  linkBlockedReason,
  onLinkToDelivery,
  onEdit,
  onRetire,
  selectedDraftReceipt,
  selectedTargetPiPlanningFacetSummary,
  selectedValue,
}: {
  activeCatalog: DeliveryCatalogItem | null;
  preview?: boolean;
  canEditSelectedValue: boolean;
  canRetireSelectedValue: boolean;
  deliveryLinkTarget: CatalogDeliveryLinkTarget | null;
  linkBlockedReason: string | null;
  onLinkToDelivery: () => void;
  onEdit: (value: DeliveryCatalogValue) => void;
  onRetire: (value: DeliveryCatalogValue) => void;
  selectedDraftReceipt: CatalogLocalDraftReceipt | null;
  selectedTargetPiPlanningFacetSummary: string | null;
  selectedValue: DeliveryCatalogValue | null;
}) {
  const canShowEdit = canDraftCatalogValueMutation(activeCatalog, selectedValue, "edit");
  const canShowRetire = canDraftCatalogValueMutation(activeCatalog, selectedValue, "retire");
  const showLink = Boolean(deliveryLinkTarget && isOwnerRepoCatalog(activeCatalog));
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
            kicker={deliveryFieldDisplayLabel(activeCatalog.label)}
            statusLabel={catalogLifecycleLabel(selectedValue.lifecycle_state)}
            statusTone={catalogLifecycleTone(selectedValue.lifecycle_state)}
            title={selectedValue.label}
            description={selectedValue.description}
          />

          <TerasTrayStack scroll>
            {selectedDraftReceipt ? (
              <TerasContentTray kicker={selectedDraftReceipt.canonical ? "Change applied" : "Preview result"} description={selectedDraftReceipt.actionLabel}>
                <TerasMetadataList items={[{label:"Recorded", value:selectedDraftReceipt.recordedAt}]} />
                <TerasTechnicalDetails items={catalogDraftReceiptMetadata(selectedDraftReceipt)} />
              </TerasContentTray>
            ) : null}

            <TerasContentTray kicker="Value">
              <TerasMetadataList
                items={catalogValueMetadata(activeCatalog, selectedValue)}
              />
            </TerasContentTray>

            <TerasContentTray kicker="Changes">
              {["read_only", "owner_routed"].includes(activeCatalog.console_capability) || ["read_only", "retired"].includes(selectedValue.lifecycle_state) ? (
                <TerasTechnicalDetails items={catalogAuthorityMetadata(activeCatalog, selectedValue).slice(1)} />
              ) : <>
                <TerasMetadataList items={catalogAuthorityMetadata(activeCatalog, selectedValue).slice(0, 2)} />
                <TerasTechnicalDetails items={catalogAuthorityMetadata(activeCatalog, selectedValue).slice(2)} />
              </>}
            </TerasContentTray>

            <TerasContentTray kicker="Usage">
              <TerasMetadataList
                items={catalogRelatedContextMetadata({
                  catalog: activeCatalog,
                  planningFacetSummary: selectedTargetPiPlanningFacetSummary,
                  value: selectedValue,
                })}
              />
            </TerasContentTray>
          </TerasTrayStack>

          {linkBlockedReason && showLink ? <TerasContentTray kicker="Before linking" description={linkBlockedReason} /> : null}
          {showLink || canShowEdit || canShowRetire ? <TerasActionRow spacing="compact">
            {showLink ? (
              <TerasActionButton
                disabled={Boolean(linkBlockedReason) && !preview}
                emphasis="primary"
                onClick={onLinkToDelivery}
                title={linkBlockedReason ?? undefined}
              >
                Link to Work Item
              </TerasActionButton>
            ) : null}
            {canShowRetire ? (
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
              Retire
            </TerasActionButton>
            ) : null}
            {canShowEdit ? (
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
            ) : null}
          </TerasActionRow> : null}
        </>
      ) : (
        <TerasEmptyState>
          Select a current value to inspect or modify it.
        </TerasEmptyState>
      )}
    </TerasPanel>
  );
}
