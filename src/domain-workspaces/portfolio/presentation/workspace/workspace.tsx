"use client";

import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import type { OperationWorkbenchDomainContract } from "../../../../operation-workbench/operation-workbench-contract.ts";
import { ProductPortfolioPublicationSurface } from "../surfaces/publication/publication-surface.tsx";
import { ProductPortfolioCurationSurface } from "../surfaces/curation/curation-surface.tsx";
import { ProductDashboardModal } from "../surfaces/products/dashboard/product-dashboard-modal.tsx";
import { ProductPortfolioProductsSurface } from "../surfaces/products/products-surface.tsx";
import { ProductPortfolioWorkspaceShell } from "./product-portfolio-workspace-shell.tsx";
import { useProductPortfolioWorkspaceController } from "./use-product-portfolio-workspace-controller.ts";

export type PortfolioWorkspaceProps = {
  contract: OperationWorkbenchDomainContract;
  entryIntent?: ConsoleSurfaceEntryIntent | null;
  onClose: () => void;
};

export function PortfolioWorkspace({
  contract,
  entryIntent = null,
  onClose,
}: PortfolioWorkspaceProps) {
  const controller = useProductPortfolioWorkspaceController({
    entryIntent,
  });

  return (
    <ProductPortfolioWorkspaceShell
      activeSurfaceId={controller.activeSurfaceId}
      contract={contract}
      onActiveSurfaceChange={controller.setActiveSurfaceId}
      onClose={onClose}
      readModel={controller.readModel}
    >
      {controller.activeSurfaceId === "products" ? (
        <ProductPortfolioProductsSurface
          entries={controller.readModel.entries}
          onOpenProduct={controller.openProduct}
        />
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

      <ProductDashboardModal
        entry={controller.dashboardEntry}
        historyEvents={controller.dashboardHistoryEvents}
        onClose={controller.closeDashboard}
        onManageListing={controller.openCuration}
        onOpenPrimaryTarget={controller.openPrimaryTarget}
      />
    </ProductPortfolioWorkspaceShell>
  );
}
