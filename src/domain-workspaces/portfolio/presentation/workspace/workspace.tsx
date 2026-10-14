"use client";

import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import type { ConsoleWorkspaceId } from "../../../../console-architecture.ts";
import type { OperationWorkbenchDomainContract } from "../../../../operation-workbench/operation-workbench-contract.ts";
import { ProductPortfolioPublicationSurface } from "../surfaces/publication/publication-surface.tsx";
import { ProductPortfolioCurationSurface } from "../surfaces/curation/curation-surface.tsx";
import { ProductDashboardModal } from "../surfaces/products/dashboard/product-dashboard-modal.tsx";
import { ProductPortfolioProductsSurface } from "../surfaces/products/products-surface.tsx";
import { ProductPortfolioContinuitySurface } from "../surfaces/products/product-portfolio-continuity-surface.tsx";
import { ProductPortfolioWorkspaceShell } from "./product-portfolio-workspace-shell.tsx";
import { useProductPortfolioWorkspaceController } from "./use-product-portfolio-workspace-controller.ts";

export type PortfolioWorkspaceProps = {
  consoleDevMode: boolean;
  contract: OperationWorkbenchDomainContract;
  entryIntent?: ConsoleSurfaceEntryIntent | null;
  onClose: () => void;
  onOpenWorkspace: (workspaceId: ConsoleWorkspaceId, entryIntent: ConsoleSurfaceEntryIntent) => void;
};

export function PortfolioWorkspace({
  consoleDevMode,
  contract,
  entryIntent = null,
  onClose,
  onOpenWorkspace,
}: PortfolioWorkspaceProps) {
  const controller = useProductPortfolioWorkspaceController({
    consoleDevMode,
    entryIntent,
  });

  return (
    <ProductPortfolioWorkspaceShell
      activeSurfaceId={controller.activeSurfaceId}
      contract={contract}
      onActiveSurfaceChange={controller.setActiveSurfaceId}
      onClose={onClose}
      readModel={controller.readModel}
      productContinuity={controller.productContinuity}
    >
      {controller.activeSurfaceId === "products" ? (
        controller.productContinuity.fixtureMode ? (
          <ProductPortfolioProductsSurface
            entries={controller.readModel.entries}
            onOpenProduct={controller.openProduct}
          />
        ) : (
          <ProductPortfolioContinuitySurface
            error={controller.productContinuity.error}
            focusProductId={controller.focusedContinuityProductId}
            loading={controller.productContinuity.loading}
            onOpenRegistry={(product) => onOpenWorkspace("workspace-registry", {
              mode: "review",
              requiredMoveRef: "workspace-inventory.lifecycle-maintenance",
              subjectRef: product.product_id,
            })}
            onRetry={() => void controller.productContinuity.reload()}
            products={controller.productContinuity.products}
          />
        )
      ) : controller.activeSurfaceId === "publication" ? (
        <ProductPortfolioPublicationSurface
          publicationSources={controller.readModel.publicationSources}
          decidedByRef="operator://portfolio-console/local"
          decisionReceipts={controller.decisionReceipts}
          focusProductId={controller.focusedPublicationProductId}
          onCapturePublication={controller.capturePublicationSource}
          onApplyDecision={controller.applyPublicationDecision}
          onOpenRoute={controller.openRoute}
          onOpenProduct={controller.openProduct}
          records={controller.readModel.publicationRecords}
          runtime={controller.publicationRuntime}
          resolveRoute={controller.resolveRoute}
        />
      ) : (
        <ProductPortfolioCurationSurface
          entries={controller.readModel.entries}
          focusedProductId={controller.focusedCurationProductId}
          listingReceipts={controller.listingReceipts}
          onApplyListing={controller.applyListing}
        />
      )}

      {controller.productContinuity.fixtureMode ? (
        <ProductDashboardModal
          entry={controller.dashboardEntry}
          historyEvents={controller.dashboardHistoryEvents}
          maintenanceRuntime={controller.maintenanceRuntime}
          onClose={controller.closeDashboard}
          onManageListing={controller.openCuration}
          onOpenPrimaryTarget={controller.openPrimaryTarget}
          onOpenPublication={controller.openPublication}
          onOpenWorkspaceRegistry={(entry) => onOpenWorkspace("workspace-registry", {
            mode: "review",
            requiredMoveRef: "workspace-inventory.lifecycle-maintenance",
            subjectRef: entry.identity.productId,
          })}
        />
      ) : null}
    </ProductPortfolioWorkspaceShell>
  );
}
