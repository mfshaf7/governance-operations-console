"use client";

import {
  TerasActionButton,
  TerasActionRow,
  TerasEmptyState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasSegmentedControl,
  TerasStatusPill,
} from "@/teras";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import type { ProductPortfolioScenarioProjection } from "../../../read-model/types/product-portfolio-fixture-types.ts";
import type { ProductPublicationDecisionReceipt } from "../../../work-model/publication/product-publication-decision-types.ts";
import { ProductPortfolioPublicationRegisterTable } from "./publication-register-table.tsx";
import { ProductPortfolioPublicationSelectedPanel } from "./publication-selected-panel.tsx";
import {
  productPublicationRegisterViewCount,
  productPublicationRegisterViews,
} from "./publication-view-model.ts";
import { ProductPublicationSessionModal } from "./session/publication-session-modal.tsx";
import type { ProductPublicationDecisionSubmitHandler } from "./session/publication-session-view-model.ts";
import { useProductPortfolioPublicationController } from "./use-publication-controller.ts";
import type { ProductPortfolioRouteResolution } from "../../routing/product-portfolio-route-model.ts";
import { ProductPublicationCaptureDialog } from "./capture/publication-capture-dialog.tsx";
import type { ProductPublicationCaptureSubmitHandler } from "./capture/publication-capture-view-model.ts";

export function ProductPortfolioPublicationSurface({
  publicationSources,
  decidedByRef,
  decisionReceipts = [],
  focusProductId = null,
  onCapturePublication,
  onApplyDecision,
  onOpenRoute,
  onOpenProduct,
  records,
  resolveRoute,
}: {
  publicationSources: ProductPortfolioScenarioProjection[];
  decidedByRef: string;
  decisionReceipts?: ProductPublicationDecisionReceipt[];
  focusProductId?: string | null;
  onCapturePublication: ProductPublicationCaptureSubmitHandler;
  onApplyDecision: ProductPublicationDecisionSubmitHandler;
  onOpenRoute: (routeRef: string) => boolean;
  onOpenProduct: (entry: ProductPortfolioEntry) => void;
  records: ProductPortfolioScenarioProjection[];
  resolveRoute: (routeRef: string) => ProductPortfolioRouteResolution;
}) {
  const controller = useProductPortfolioPublicationController({
    publicationSources,
    capturedByRef: decidedByRef,
    decisionReceipts,
    focusProductId,
    onCapturePublication,
    onOpenProduct,
    records,
  });
  const viewCount = productPublicationRegisterViewCount(
    records,
    controller.viewId,
  );

  return (
    <>
      <TerasRecordControlLayout
        composition="fullscreen-register"
        data-product-portfolio-publication-surface="true"
        mode="register-selected"
        register={
          <TerasRegisterPanel
            actions={
              <TerasActionRow spacing="compact">
                <TerasStatusPill tone="info">
                  {controller.visibleRecords.length}/{viewCount} shown
                </TerasStatusPill>
                <TerasActionButton
                  disabled={controller.capture.availableSources.length === 0}
                  onClick={controller.capture.openDialog}
                  title={
                    controller.capture.availableSources.length === 0
                      ? "No uncaptured publication source is available."
                      : undefined
                  }
                >
                  Capture Publication
                </TerasActionButton>
              </TerasActionRow>
            }
            bodyProps={{
              "data-product-portfolio-publication-register": controller.viewId,
            }}
            description="Review product-owner publication packets and their source-backed publication state."
            filterBar={
              <TerasFilterBar
                action={
                  <TerasSegmentedControl
                    ariaLabel="Select publication register view"
                    onValueChange={controller.setViewId}
                    options={productPublicationRegisterViews}
                    value={controller.viewId}
                  />
                }
                search={{
                  ariaLabel: "Search Product Portfolio publication",
                  onValueChange: controller.setQuery,
                  placeholder: "Search candidate, owner, packet, or state...",
                  value: controller.query,
                }}
              />
            }
            kicker="Publication Register"
            title="Product candidates"
          >
            {controller.visibleRecords.length > 0 ? (
              <ProductPortfolioPublicationRegisterTable
                onOpenRecord={controller.openRecord}
                onSelectRecord={controller.selectRecord}
                records={controller.visibleRecords}
                selectedScenarioId={controller.selectedScenarioId}
              />
            ) : (
              <TerasEmptyState fill>
                No publication record matches the current view and search.
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
          controller.selectedRecord ? (
            <ProductPortfolioPublicationSelectedPanel
              onOpenRecord={controller.openRecord}
              record={controller.selectedRecord}
            />
          ) : (
            <TerasEmptyState fill>
              No publication record is selected from the current results.
            </TerasEmptyState>
          )
        }
        selectedProps={{
          "data-product-portfolio-selected-publication": "true",
        }}
      />
      <ProductPublicationSessionModal
        decidedByRef={decidedByRef}
        initialReceipt={controller.sessionReceipt}
        onApplyDecision={onApplyDecision}
        onClose={controller.closeSession}
        onOpenRoute={onOpenRoute}
        onOpenProduct={onOpenProduct}
        record={controller.activeSessionRecord}
        resolveRoute={resolveRoute}
      />
      <ProductPublicationCaptureDialog
        applying={controller.capture.applying}
        error={controller.capture.error}
        onClose={controller.capture.close}
        onSelectSource={controller.capture.selectSource}
        onSubmit={controller.capture.submit}
        open={controller.capture.open}
        selectedSourceId={controller.capture.selectedSourceId}
        sources={controller.capture.availableSources}
      />
    </>
  );
}
