"use client";

import { useState } from "react";
import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import type { ConsoleWorkspaceId } from "../../../../console-architecture.ts";
import type { OperationWorkbenchDomainContract } from "../../../../operation-workbench/operation-workbench-contract.ts";
import { OwnerPublicationPreview } from "../surfaces/publication/owner-publication-preview.tsx";
import { OwnerPublicationSurface, useOwnerPublicationState } from "../surfaces/publication/owner-publication-surface.tsx";
import { TerasActionButton, TerasActionRow, TerasDraftCloseGuardDialog, TerasPanel, TerasPanelHeader } from "@/teras";
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
  const publicationState = useOwnerPublicationState();
  const activeSurfaceId = !controller.productContinuity.fixtureMode && controller.activeSurfaceId === "curation"
    ? "publication" : controller.activeSurfaceId;
  const [pendingExit, setPendingExit] = useState<(() => void) | null>(null);
  function requestExit(leave: () => void) {
    if (controller.nativePublicationRuntime.pending || publicationState.uncertain) {
      controller.setActiveSurfaceId("publication");
      return;
    }
    if (publicationState.dirty) setPendingExit(() => leave);
    else leave();
  }

  return (
    <>
    <ProductPortfolioWorkspaceShell
      activeSurfaceId={activeSurfaceId}
      contract={contract}
      onActiveSurfaceChange={controller.setActiveSurfaceId}
      onClose={() => requestExit(onClose)}
      readModel={controller.readModel}
      productContinuity={controller.productContinuity}
    >
      {activeSurfaceId === "products" ? (
        controller.productContinuity.fixtureMode ? (
          <ProductPortfolioProductsSurface
            entries={controller.readModel.entries}
            onOpenProduct={controller.openProduct}
          />
        ) : (
          <ProductPortfolioContinuitySurface
            focusProductId={controller.focusedContinuityProductId}
            onOpenRegistry={(product) => requestExit(() => onOpenWorkspace("workspace-registry", {
              mode: "review",
              requiredMoveRef: "workspace-inventory.lifecycle-maintenance",
              subjectRef: product.product_id,
            }))}
          />
        )
      ) : activeSurfaceId === "publication" ? (
        controller.productContinuity.fixtureMode ? (
        <OwnerPublicationPreview entries={controller.readModel.entries} state={publicationState} runtime={controller.nativePublicationRuntime} />
        ) : <OwnerPublicationSurface state={publicationState} runtime={controller.nativePublicationRuntime}
          products={controller.productContinuity.products} productsError={controller.productContinuity.error}
          authorityRevision={controller.productContinuity.projection?.authority.revision ?? null}
          onRetryProducts={() => void controller.productContinuity.reload().catch(() => undefined)}
          onApplied={() => void controller.productContinuity.reload().catch(() => undefined)} />
      ) : (
        controller.productContinuity.fixtureMode ? (
        <ProductPortfolioCurationSurface
          entries={controller.readModel.entries}
          focusedProductId={controller.focusedCurationProductId}
          listingReceipts={controller.listingReceipts}
          onApplyListing={controller.applyListing}
        />
        ) : <TerasPanel frame="padded" fit="content" treatment="neutral"><TerasPanelHeader kicker="Listing settings" title="Manage listing through Publication"
          description="Change listing and audience using the latest publication receipt and a committed product manifest. Product details remain in Registry; the product component controls access." />
          <TerasActionRow spacing="normal"><TerasActionButton onClick={() => controller.setActiveSurfaceId("publication")}>Open Publication</TerasActionButton></TerasActionRow>
        </TerasPanel>
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
          onOpenWorkspaceRegistry={(entry) => requestExit(() => onOpenWorkspace("workspace-registry", {
            mode: "review",
            requiredMoveRef: "workspace-inventory.lifecycle-maintenance",
            subjectRef: entry.identity.productId,
          }))}
        />
      ) : null}
    </ProductPortfolioWorkspaceShell>
    <TerasDraftCloseGuardDialog
      open={pendingExit !== null}
      title="Discard publication draft?"
      kicker="Unsaved publication"
      description="Your publication inputs and review are kept while switching sections. Leaving Portfolio will discard this unsent draft."
      leaveLabel="Discard draft"
      onKeepEditing={() => setPendingExit(null)}
      onLeave={() => { const leave = pendingExit; setPendingExit(null); leave?.(); }}
    />
    </>
  );
}
