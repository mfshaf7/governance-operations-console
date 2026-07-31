import {
  TerasActionButton,
  TerasActionRow,
  TerasContentTray,
  TerasEmptyState,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasTrayStack,
} from "@/teras";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import type { ProductListingReceipt } from "../../../work-model/listing/product-listing-types.ts";
import {
  productCurationContextFacts,
  productCurationLatestReceipt,
  productCurationListingFacts,
  productCurationPolicyFacts,
  productCurationSelectionTone,
} from "./curation-view-model.ts";

export function ProductPortfolioCurationInspectorPanel({
  entries,
  listingReceipts,
  onEdit,
  selectedEntry,
}: {
  entries: ProductPortfolioEntry[];
  listingReceipts: ProductListingReceipt[];
  onEdit: (entry: ProductPortfolioEntry) => void;
  selectedEntry: ProductPortfolioEntry | null;
}) {
  const tone = selectedEntry
    ? productCurationSelectionTone(selectedEntry)
    : "muted";
  const latestReceipt = selectedEntry
    ? productCurationLatestReceipt(
        listingReceipts,
        selectedEntry.identity.productId,
      )
    : null;

  return (
    <TerasPanel
      density="normal"
      frame="padded"
      treatment="rail"
      layout="header-body-footer"
      overflow="hidden"
      spacing="compact"
      tone={tone}
    >
      {selectedEntry ? (
        <>
          <TerasPanelHeader
            description={selectedEntry.identity.summary}
            kicker="Selected Listing"
            statusLabel={
              selectedEntry.listing.featured ? "Featured" : "Standard"
            }
            statusTone={tone}
            title={selectedEntry.identity.displayName}
          />

          <TerasTrayStack scroll>
            {latestReceipt ? (
              <TerasContentTray kicker="Local Receipt">
                <TerasMetadataList
                  items={[
                    { label: "Result", value: latestReceipt.summary },
                    { label: "Receipt", value: latestReceipt.receiptId },
                    {
                      label: "Reordered",
                      value: String(latestReceipt.reorderedProductIds.length),
                    },
                    { label: "Recorded", value: latestReceipt.recordedAt },
                  ]}
                />
              </TerasContentTray>
            ) : null}

            <TerasContentTray kicker="Listing">
              <TerasMetadataList
                items={productCurationListingFacts(entries, selectedEntry)}
              />
            </TerasContentTray>

            <TerasContentTray kicker="Access Policy">
              <TerasMetadataList
                items={productCurationPolicyFacts(selectedEntry)}
              />
            </TerasContentTray>

            <TerasContentTray kicker="Product Context">
              <TerasMetadataList
                items={productCurationContextFacts(selectedEntry)}
              />
            </TerasContentTray>
          </TerasTrayStack>

          <TerasActionRow spacing="compact">
            <TerasActionButton
              onClick={() => onEdit(selectedEntry)}
              emphasis="primary"
            >
              Edit Listing
            </TerasActionButton>
          </TerasActionRow>
        </>
      ) : (
        <TerasEmptyState>
          Select a current listing to inspect or modify it.
        </TerasEmptyState>
      )}
    </TerasPanel>
  );
}
