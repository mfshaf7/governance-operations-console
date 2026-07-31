"use client";

import type { ReactNode } from "react";

import {
  TerasFullscreenSurfaceFrame,
  TerasModalShell,
  TerasSurfaceNav,
  TerasSurfaceNavButton,
  TerasSurfaceSummaryHeader,
} from "@/teras";
import {
  getOperationWorkbenchSurfaceAttributes,
  type OperationWorkbenchDomainContract,
} from "../../../../operation-workbench/operation-workbench-contract.ts";
import { projectOperationSurfaceStatusItems } from "@/domain-workspaces/operation-projections";
import type { ProductPortfolioReadModel } from "../../read-model/types/product-portfolio-fixture-types.ts";
import {
  productPortfolioWorkspaceNavMeta,
  productPortfolioWorkspaceStatuses,
  productPortfolioWorkspaceSummaryMetrics,
  productPortfolioWorkspaceSummaryTitle,
  productPortfolioWorkspaceSurfaces,
  type ProductPortfolioWorkspaceSurfaceId,
} from "./product-portfolio-workspace-view-model.ts";

export function ProductPortfolioWorkspaceShell({
  activeSurfaceId,
  children,
  contract,
  onActiveSurfaceChange,
  onClose,
  readModel,
}: {
  activeSurfaceId: ProductPortfolioWorkspaceSurfaceId;
  children: ReactNode;
  contract: OperationWorkbenchDomainContract;
  onActiveSurfaceChange: (
    surfaceId: ProductPortfolioWorkspaceSurfaceId,
  ) => void;
  onClose: () => void;
  readModel: ProductPortfolioReadModel;
}) {
  return (
    <TerasModalShell
      bodyLayout="fill"
      description="Fullscreen product catalog for managed-product discovery, publication, and Portfolio-owned listing curation."
      kicker="Product Portfolio"
      modalAttributes={getOperationWorkbenchSurfaceAttributes(contract)}
      onClose={onClose}
      height="fill"
      surfaceId="product-portfolio-workspace"
      title="Product Portfolio"
      width="viewport"
    >
      <TerasFullscreenSurfaceFrame
        data-product-portfolio-surface={activeSurfaceId}
        nav={
          <TerasSurfaceNav
            ariaLabel="Product Portfolio sections"
            description="Switch between product catalog controls."
            kicker="Workspace Nav"
            title="Portfolio Areas"
          >
            {productPortfolioWorkspaceSurfaces.map((surface) => (
              <TerasSurfaceNavButton
                current={activeSurfaceId === surface.id}
                data-product-portfolio-section={surface.id}
                key={surface.id}
                kicker={surface.kicker}
                meta={productPortfolioWorkspaceNavMeta(readModel, surface.id)}
                onClick={() => onActiveSurfaceChange(surface.id)}
                title={surface.title}
                tone={surface.tone}
              />
            ))}
          </TerasSurfaceNav>
        }
        summary={
          <TerasSurfaceSummaryHeader
            ariaLabel="Product Portfolio summary"
            metrics={productPortfolioWorkspaceSummaryMetrics(
              readModel,
              activeSurfaceId,
            )}
            statuses={projectOperationSurfaceStatusItems(
              productPortfolioWorkspaceStatuses(readModel),
            )}
            title={productPortfolioWorkspaceSummaryTitle(activeSurfaceId)}
          />
        }
      >
        {children}
      </TerasFullscreenSurfaceFrame>
    </TerasModalShell>
  );
}
