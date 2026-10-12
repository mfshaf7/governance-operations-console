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
import type {
  ProductMaintenanceComposition,
  ProductMaintenanceIntent,
  ProductMaintenanceMode,
} from "@/domain-workspaces/portfolio/live-runtime/product-maintenance-live-types";
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
  maintenanceRuntime,
  onClose,
  onManageListing,
  onOpenPrimaryTarget,
}: {
  entry: ProductPortfolioEntry | null;
  historyEvents: ProductPortfolioHistoryEvent[];
  maintenanceRuntime: {
    apply: (
      action: ProductMaintenanceIntent["action"],
      reason: string,
      intentId: string,
      decidedAt: string,
    ) => Promise<unknown>;
    composition: ProductMaintenanceComposition | null;
    error: string | null;
    mode: ProductMaintenanceMode | null;
    pending: boolean;
  };
  onClose: () => void;
  onManageListing: (entry: ProductPortfolioEntry) => void;
  onOpenPrimaryTarget: (entry: ProductPortfolioEntry) => void;
}) {
  const [activeTab, setActiveTab] = useState<ProductDashboardTabId>("overview");
  const [review, setReview] = useState<{
    action: ProductMaintenanceIntent["action"];
    decidedAt: string;
    intentId: string;
  } | null>(null);

  useEffect(() => {
    setActiveTab("overview");
    setReview(null);
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
              maintenance={maintenanceRuntime.composition}
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

            <TerasPanel
              frame="padded"
              treatment="rail"
              fit="content"
              spacing="normal"
              tone={maintenanceRuntime.error ? "danger" : maintenanceRuntime.composition ? "warn" : "muted"}
            >
              <TerasPanelHeader
                description={maintenanceRuntime.error ?? (
                  maintenanceRuntime.composition
                    ? "Review an archive or restoration request. OOS remains the lifecycle authority."
                    : maintenanceRuntime.mode?.mode === "disconnected-preview"
                      ? "Lifecycle maintenance is not commissioned."
                      : "No governed publication binding is available for this product."
                )}
                kicker="Product Lifecycle"
                title={maintenanceRuntime.composition?.maintenance.lifecycle.state ?? "Unavailable"}
              />
              <TerasActionRow spacing="normal">
                <TerasActionButton
                  disabled={maintenanceRuntime.pending || maintenanceRuntime.composition?.maintenance.lifecycle.state !== "active"}
                  onClick={() => setReview(createMaintenanceReview(entry, "archive"))}
                  emphasis="secondary"
                >
                  Review archive
                </TerasActionButton>
                <TerasActionButton
                  disabled={maintenanceRuntime.pending || maintenanceRuntime.composition?.maintenance.lifecycle.state !== "retired"}
                  onClick={() => setReview(createMaintenanceReview(entry, "restore"))}
                  emphasis="primary"
                >
                  Review restore
                </TerasActionButton>
              </TerasActionRow>
            </TerasPanel>
          </TerasZone>
        }
      />
      {review && maintenanceRuntime.composition ? (
        <TerasModalShell
          bodyLayout="scroll"
          description={`Confirm the ${review.action} request against the exact lifecycle and publication receipts shown below.`}
          footer={
            <TerasActionRow spacing="normal">
              <TerasActionButton onClick={() => setReview(null)} emphasis="secondary">
                Cancel
              </TerasActionButton>
              <TerasActionButton
                disabled={maintenanceRuntime.pending}
                onClick={() => void maintenanceRuntime.apply(
                  review.action,
                  `Operator reviewed ${review.action} for ${entry.identity.productId} against the displayed owner evidence.`,
                  review.intentId,
                  review.decidedAt,
                ).then(() => setReview(null)).catch(() => undefined)}
                emphasis="primary"
              >
                Confirm {review.action}
              </TerasActionButton>
            </TerasActionRow>
          }
          height="content"
          kicker="Lifecycle Review"
          onClose={() => setReview(null)}
          surfaceId="product-maintenance-review"
          title={`${review.action === "archive" ? "Archive" : "Restore"} ${entry.identity.displayName}`}
          width="standard"
        >
          <TerasMetadataList
            items={productMaintenanceReviewFacts(maintenanceRuntime.composition)}
          />
        </TerasModalShell>
      ) : null}
    </TerasModalShell>
  );
}

function ProductDashboardTabContent({
  activeTab,
  entry,
  historyEvents,
  maintenance,
}: {
  activeTab: ProductDashboardTabId;
  entry: ProductPortfolioEntry;
  historyEvents: ProductPortfolioHistoryEvent[];
  maintenance: ProductMaintenanceComposition | null;
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
            {maintenance ? (
              <TerasTrayStack columns={2}>
                <TerasContentTray kicker="Lifecycle and Publication">
                  <TerasMetadataList items={productMaintenanceStateFacts(maintenance)} />
                </TerasContentTray>
                <TerasContentTray kicker="Platform Health">
                  <TerasMetadataList items={productMaintenanceHealthFacts(maintenance)} />
                </TerasContentTray>
              </TerasTrayStack>
            ) : null}
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
            {maintenance && maintenance.maintenance.history.length > 0 ? (
              <TerasTimeline ariaLabel="Authoritative product maintenance history">
                {maintenance.maintenance.history.map((event) => (
                  <TerasTimelineItem
                    detail={`${event.publication_posture} · receipt ${event.receipt_ref.id}`}
                    displayTimestamp={formatProductTimestamp(event.recorded_at)}
                    key={`${event.sequence}-${event.receipt_ref.digest}`}
                    label={`${event.action} · version ${event.publication_version}`}
                    status="Owner receipt"
                    timestamp={event.recorded_at}
                    tone="info"
                  />
                ))}
              </TerasTimeline>
            ) : null}
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

function productMaintenanceStateFacts(composition: ProductMaintenanceComposition) {
  return [
    { label: "Lifecycle", value: composition.maintenance.lifecycle.state },
    { label: "Publication", value: composition.maintenance.publication.posture },
    { label: "Publication Version", value: String(composition.maintenance.publication.version) },
    { label: "Evidence", value: composition.maintenance.evidence_posture.state },
    { label: "Owner Route", value: `${composition.maintenance.owner_route.repo}@${composition.maintenance.owner_route.revision}` },
  ];
}

function productMaintenanceHealthFacts(composition: ProductMaintenanceComposition) {
  return [
    { label: "Availability", value: composition.health.availability.state },
    { label: "Freshness", value: composition.health.freshness },
    { label: "Issues", value: composition.health.issues.codes.join(", ") || "None" },
    { label: "Runtime Owner", value: composition.health.runtimeOwner },
    { label: "Recovery", value: composition.health.recovery.runbookRef },
  ];
}

function productMaintenanceReviewFacts(composition: ProductMaintenanceComposition) {
  return [
    ...productMaintenanceStateFacts(composition),
    { label: "Lifecycle Digest", value: composition.maintenance.lifecycle.record_digest ?? "Unavailable" },
    { label: "Maintenance Receipt", value: composition.source.maintenance_receipt_id },
    { label: "Health Projection", value: composition.source.health_projection_ref },
    { label: "Authority", value: "OOS validates; owner repositories remain authoritative" },
  ];
}

function createMaintenanceReview(
  entry: ProductPortfolioEntry,
  action: ProductMaintenanceIntent["action"],
) {
  const decidedAt = new Date().toISOString();
  const nonce = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    action,
    decidedAt,
    intentId: `product-maintenance-intent:${entry.identity.productId.replace(/^product:/, "")}:${action}:${nonce}`,
  };
}
