"use client";

import { useEffect, useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasContentTray,
  TerasEmptyState,
  TerasMetadataList,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
  TerasPrimarySideLayout,
  TerasSegmentedControl,
  TerasStatusPill,
  TerasSummaryCard,
  TerasSummaryCardGrid,
  TerasTimeline,
  TerasTimelineItem,
  TerasTrayStack,
  TerasZone,
} from "@/teras";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import type { ProductPortfolioHistoryEvent } from "@/domain-workspaces/portfolio/read-model/types/product-portfolio-history-types";
import {
  formatProductTimestamp,
  productDashboardAccessLabel,
  productDashboardAccessTone,
  productDashboardCanOpenTarget,
  productDashboardHistoryRows,
  productDashboardIdentityFacts,
  productDashboardMaturityFacts,
  productDashboardOwnershipFacts,
  productDashboardPrimaryTargetFacts,
  productDashboardProfileFacts,
  productDashboardReleaseFacts,
  productDashboardRetainedReferences,
  productDashboardRuntimeFacts,
  productDashboardSecurityFacts,
  productDashboardSourceFacts,
  productDashboardSourceVersionFacts,
  productDashboardSummaryCards,
  productDashboardTabs,
  type ProductDashboardTabId,
} from "./product-dashboard-view-model.ts";
import {
  productSelectedPanelStatus,
  productSelectedPanelTone,
} from "../products-view-model.ts";

export function ProductDashboardModal({
  entry,
  historyEvents,
  onClose,
  onManageListing,
  onOpenPrimaryTarget,
}: {
  entry: ProductPortfolioEntry | null;
  historyEvents: ProductPortfolioHistoryEvent[];
  onClose: () => void;
  onManageListing: (entry: ProductPortfolioEntry) => void;
  onOpenPrimaryTarget: (entry: ProductPortfolioEntry) => void;
}) {
  const [activeTab, setActiveTab] = useState<ProductDashboardTabId>("overview");

  useEffect(() => {
    setActiveTab("overview");
  }, [entry?.identity.productId]);

  if (!entry) {
    return null;
  }

  const productTone = productSelectedPanelTone(entry);
  const productStatus = productSelectedPanelStatus(entry);
  const accessTone = productDashboardAccessTone(entry);
  const canOpenTarget = productDashboardCanOpenTarget(entry);
  const canManageListing = entry.listing.state !== "retired";

  return (
    <TerasModalShell
      bodyLayout="fill"
      description="Stable product cockpit for identity, operating posture, release evidence, listing, and recorded history."
      footer={
        <TerasActionButton onClick={onClose} emphasis="secondary">
          Back to Products
        </TerasActionButton>
      }
      kicker="Product Portfolio"
      onClose={onClose}
      height="fill"
      surfaceId="product-dashboard"
      title="Product Dashboard"
      width="large"
    >
      <TerasPrimarySideLayout
        data-product-dashboard={entry.identity.productId}
        primaryTop={
          <TerasZone fit="content">
            <TerasPanel frame="padded" treatment="rail" tone={productTone}>
              <TerasPanelHeader
                actions={
                  <TerasStatusPill tone={productTone}>
                    {productStatus}
                  </TerasStatusPill>
                }
                actionsLayout="inline"
                description={entry.identity.summary}
                kicker="Managed Product"
                title={entry.identity.displayName}
              />
              <TerasMetadataList
                items={productDashboardIdentityFacts(entry)}
                shape="line"
                topOffset="compact"
                treatment="chip"
                wrap
              />
            </TerasPanel>

            <TerasSummaryCardGrid columns={5}>
              {productDashboardSummaryCards(entry).map((card) => (
                <TerasSummaryCard
                  key={card.label}
                  label={card.label}
                  tone={card.tone}
                  value={card.value}
                  variant="dense"
                />
              ))}
            </TerasSummaryCardGrid>
          </TerasZone>
        }
        primaryMain={
          <TerasZone fit="fill">
            <TerasSegmentedControl
              ariaLabel="Select Product Dashboard section"
              layout="fill"
              onValueChange={setActiveTab}
              options={productDashboardTabs}
              value={activeTab}
            />
            <ProductDashboardTabContent
              activeTab={activeTab}
              entry={entry}
              historyEvents={historyEvents}
            />
          </TerasZone>
        }
        sideFill={
          <TerasZone fit="content">
            <TerasPanel
              frame="padded"
              treatment="rail"
              fit="content"
              spacing="normal"
              tone={accessTone}
            >
              <TerasPanelHeader
                actions={
                  <TerasStatusPill tone={accessTone}>
                    {productDashboardAccessLabel(entry)}
                  </TerasStatusPill>
                }
                actionsLayout="inline"
                description="Open the verified primary product experience published by its owner."
                kicker="Product Access"
                title={entry.experience.primaryTarget.label}
              />
              <TerasMetadataList
                items={productDashboardPrimaryTargetFacts(entry)}
              />
              <TerasActionRow spacing="normal">
                <TerasActionButton
                  disabled={!canOpenTarget}
                  onClick={() => onOpenPrimaryTarget(entry)}
                  title={
                    canOpenTarget
                      ? undefined
                      : "A verified direct target is not available."
                  }
                  emphasis="primary"
                >
                  Open Product
                </TerasActionButton>
              </TerasActionRow>
            </TerasPanel>

            <TerasPanel
              frame="padded"
              treatment="rail"
              fit="content"
              spacing="normal"
              tone={canManageListing ? "warn" : "muted"}
            >
              <TerasPanelHeader
                description={
                  canManageListing
                    ? "Change catalog visibility, permitted scope, placement, and relative order in Curation."
                    : "Retired product listings remain read-only."
                }
                kicker="Portfolio Listing"
                title={canManageListing ? "Manage listing" : "Listing retired"}
              />
              <TerasActionRow spacing="normal">
                <TerasActionButton
                  disabled={!canManageListing}
                  onClick={() => onManageListing(entry)}
                  emphasis="primary"
                >
                  Open Curation
                </TerasActionButton>
              </TerasActionRow>
            </TerasPanel>
          </TerasZone>
        }
      />
    </TerasModalShell>
  );
}

function ProductDashboardTabContent({
  activeTab,
  entry,
  historyEvents,
}: {
  activeTab: ProductDashboardTabId;
  entry: ProductPortfolioEntry;
  historyEvents: ProductPortfolioHistoryEvent[];
}) {
  switch (activeTab) {
    case "overview":
      return (
        <TerasPanel
          frame="padded"
          treatment="neutral"
          fit="fill"
          overflow="hidden"
        >
          <TerasPanelHeader
            description="Canonical product classification, source identity, and accountable owners."
            kicker="Product Record"
            title="Profile and ownership"
          />
          <TerasTrayStack scroll>
            <TerasTrayStack columns={2}>
              <TerasContentTray kicker="Product Profile">
                <TerasMetadataList
                  items={productDashboardProfileFacts(entry)}
                />
              </TerasContentTray>
              <TerasContentTray kicker="Ownership">
                <TerasMetadataList
                  items={productDashboardOwnershipFacts(entry)}
                />
              </TerasContentTray>
            </TerasTrayStack>
            <TerasContentTray kicker="Source Record">
              <TerasMetadataList items={productDashboardSourceFacts(entry)} />
            </TerasContentTray>
          </TerasTrayStack>
        </TerasPanel>
      );
    case "operations":
      return (
        <TerasPanel
          frame="padded"
          treatment="neutral"
          fit="fill"
          overflow="hidden"
        >
          <TerasPanelHeader
            description="Current runtime observation, release evidence, and access posture."
            kicker="Operating Record"
            title="Runtime, release, and security"
          />
          <TerasTrayStack scroll>
            <TerasTrayStack columns={2}>
              <TerasContentTray kicker="Runtime">
                <TerasMetadataList
                  items={productDashboardRuntimeFacts(entry)}
                />
              </TerasContentTray>
              <TerasContentTray kicker="Maturity">
                <TerasMetadataList
                  items={productDashboardMaturityFacts(entry)}
                />
              </TerasContentTray>
            </TerasTrayStack>
            <TerasTrayStack columns={2}>
              <TerasContentTray kicker="Release">
                <TerasMetadataList
                  items={productDashboardReleaseFacts(entry)}
                />
              </TerasContentTray>
              <TerasContentTray kicker="Security">
                <TerasMetadataList
                  items={productDashboardSecurityFacts(entry)}
                />
              </TerasContentTray>
            </TerasTrayStack>
          </TerasTrayStack>
        </TerasPanel>
      );
    case "history":
      const historyRows = productDashboardHistoryRows(historyEvents);

      return (
        <TerasPanel
          frame="padded"
          treatment="neutral"
          fit="fill"
          overflow="hidden"
        >
          <TerasPanelHeader
            actions={
              <TerasStatusPill tone={historyRows.length > 0 ? "info" : "muted"}>
                {historyRows.length} events
              </TerasStatusPill>
            }
            actionsLayout="inline"
            description="Ordered source publications and accepted prototype-local Portfolio receipts."
            kicker="Product History"
            title="Product trail"
          />
          <TerasTrayStack scroll>
            {historyRows.length > 0 ? (
              <TerasTimeline ariaLabel="Product Portfolio history">
                {historyRows.map((row, index) => (
                  <TerasTimelineItem
                    detail={row.detail}
                    displayTimestamp={formatProductTimestamp(row.timestamp)}
                    key={`${row.label}-${row.timestamp}-${index}`}
                    label={row.label}
                    status={row.status}
                    timestamp={row.timestamp}
                    tone={row.tone}
                  />
                ))}
              </TerasTimeline>
            ) : (
              <TerasEmptyState>
                No product history event is available.
              </TerasEmptyState>
            )}
            <TerasTrayStack columns={2}>
              <TerasContentTray kicker="Source Versions">
                <TerasMetadataList
                  items={productDashboardSourceVersionFacts(entry)}
                />
              </TerasContentTray>
              <TerasContentTray kicker="Retained References">
                <TerasMetadataList
                  items={productDashboardRetainedReferences(entry)}
                />
              </TerasContentTray>
            </TerasTrayStack>
          </TerasTrayStack>
        </TerasPanel>
      );
  }
}
