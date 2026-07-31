import type { OperationWorkbenchDomainContract } from "../../../../operation-workbench/operation-workbench-contract.ts";

export function getPortfolioOperationWorkbenchContract(): OperationWorkbenchDomainContract {
  return {
    backendOwner:
      "Workspace active product inventory and product owners; Portfolio owns publication decisions and listing state after canonical product registration",
    domain: "portfolio",
    handoff:
      "Review publication packets for active Workspace products, project authority-owned product truth, and curate only Portfolio-owned listing fields.",
    localState:
      "Portfolio register selection, filters, publication decisions, listing drafts, and prototype-local receipts until live adapters exist.",
    mutationBoundary:
      "Prototype-local publication and listing receipts; owner-routed canonical mutation after baseline",
    surfacePurpose:
      "Discover managed products, review publication packets, inspect stable product dashboards, and curate listings without becoming a product registry, build lane, or runtime authority.",
    readModel:
      "Authority-shaped publication packets, normalized product entries, listing state, release, runtime, security, Delivery-history, and freshness projections",
    sourceOfTruth:
      "Workspace active product inventory, product-owned manifests, owner repositories, Platform runtime and release evidence, Security review evidence, Delivery outcomes, WGCF freshness, and Portfolio-owned listing state",
  };
}
