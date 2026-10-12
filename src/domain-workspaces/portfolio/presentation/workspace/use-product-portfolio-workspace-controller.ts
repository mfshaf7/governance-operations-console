"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import { openExternalConsoleRoute } from "../../../../console-integration/external-route.ts";
import {
  getProductPortfolioRuntimeProjectionSnapshot,
  submitProductPortfolioPublicationCapture,
  submitProductPortfolioPublicationDecision,
  submitProductPortfolioListingCommand,
  subscribeProductPortfolioRuntimeProjection,
} from "../../local-runtime/product-portfolio-runtime.ts";
import { projectProductPortfolioEffectiveProjection } from "../../local-runtime/product-portfolio-effective-projection.ts";
import { productPortfolioReadModel } from "../../read-model/product-portfolio-read-model.ts";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import type { ProductListingCommand } from "../../work-model/listing/product-listing-types.ts";
import { useProductPublicationLiveRuntime } from "../../live-runtime/use-product-publication-live-runtime.ts";
import {
  governedIntentFromPortfolioDecision,
  portfolioSubmissionFromGovernedResult,
} from "../../live-runtime/product-publication-live-projection.ts";
import type { ProductPortfolioPublicationSubmission } from "../../local-runtime/product-portfolio-runtime-model.ts";
import {
  resolveProductPortfolioEntryIntent,
  resolveProductPortfolioRoute,
  type ProductPortfolioRouteResolution,
} from "../routing/product-portfolio-route-model.ts";
import type { ProductPortfolioWorkspaceSurfaceId } from "./product-portfolio-workspace-view-model.ts";

export function useProductPortfolioWorkspaceController({
  entryIntent = null,
}: {
  entryIntent?: ConsoleSurfaceEntryIntent | null;
} = {}) {
  const runtimeProjection = useSyncExternalStore(
    subscribeProductPortfolioRuntimeProjection,
    getProductPortfolioRuntimeProjectionSnapshot,
    getProductPortfolioRuntimeProjectionSnapshot,
  );
  const publicationLiveRuntime = useProductPublicationLiveRuntime();
  const effectiveProjection = useMemo(
    () =>
      projectProductPortfolioEffectiveProjection({
        runtimeProjection,
        sourceReadModel: productPortfolioReadModel,
      }),
    [runtimeProjection],
  );
  const readModel = effectiveProjection.readModel;
  const [activeSurfaceId, setActiveSurfaceId] =
    useState<ProductPortfolioWorkspaceSurfaceId>("products");
  const [dashboardProductId, setDashboardProductId] = useState<string | null>(
    null,
  );
  const [focusedCurationProductId, setFocusedCurationProductId] = useState<
    string | null
  >(null);
  const [focusedPublicationProductId, setFocusedPublicationProductId] = useState<
    string | null
  >(null);
  const appliedEntryIntentRef = useRef<string | null>(null);
  const dashboardEntry =
    readModel.entries.find(
      (entry) => entry.identity.productId === dashboardProductId,
    ) ?? null;
  const dashboardHistoryEvents = dashboardProductId
    ? (readModel.historyByProductId[dashboardProductId] ?? [])
    : [];
  useEffect(() => {
    if (!entryIntent) {
      return;
    }

    const entryKey = `${entryIntent.subjectRef}:${entryIntent.requiredMoveRef}`;
    if (appliedEntryIntentRef.current === entryKey) {
      return;
    }

    const route = resolveProductPortfolioEntryIntent(entryIntent, readModel);
    if (!route || route.kind === "unavailable") {
      return;
    }

    appliedEntryIntentRef.current = entryKey;
    applyResolvedRoute(route);
  }, [entryIntent, readModel]);

  function openProduct(entry: ProductPortfolioEntry) {
    setDashboardProductId(entry.identity.productId);
  }

  function openCuration(entry: ProductPortfolioEntry) {
    setDashboardProductId(null);
    setFocusedCurationProductId(entry.identity.productId);
    setActiveSurfaceId("curation");
  }

  function openPrimaryTarget(entry: ProductPortfolioEntry) {
    openExternalConsoleRoute(entry.experience.primaryTarget.href);
  }

  function applyResolvedRoute(route: ProductPortfolioRouteResolution) {
    switch (route.kind) {
      case "publication":
        setFocusedPublicationProductId(route.productId);
        setActiveSurfaceId("publication");
        return true;
      case "curation":
        setDashboardProductId(null);
        setFocusedCurationProductId(route.productId);
        setActiveSurfaceId("curation");
        return true;
      case "external":
        return openExternalConsoleRoute(route.href);
      case "product-dashboard": {
        const entry = readModel.entries.find(
          (candidate) => candidate.identity.productId === route.productId,
        );
        if (!entry) return false;
        openProduct(entry);
        setActiveSurfaceId("products");
        return true;
      }
      case "unavailable":
        return false;
    }
  }

  function openRoute(routeRef: string) {
    return applyResolvedRoute(resolveRoute(routeRef));
  }

  function resolveRoute(routeRef: string) {
    return resolveProductPortfolioRoute(routeRef, readModel);
  }

  async function applyListing(command: ProductListingCommand) {
    return submitProductPortfolioListingCommand(command);
  }

  async function applyPublicationDecision(
    submission: ProductPortfolioPublicationSubmission,
  ) {
    if (publicationLiveRuntime.error) {
      throw new Error(
        `Product Publication owner path is unavailable: ${publicationLiveRuntime.error}`,
      );
    }
    if (publicationLiveRuntime.mode === null) {
      throw new Error(
        "Product Publication capability is still resolving. Try again after its source posture is visible.",
      );
    }
    if (publicationLiveRuntime.mode.mode === "disconnected-preview") {
      return submitProductPortfolioPublicationDecision(submission);
    }
    const result = await publicationLiveRuntime.submit(
      governedIntentFromPortfolioDecision(submission),
    );
    return submitProductPortfolioPublicationDecision(
      portfolioSubmissionFromGovernedResult({ result, submission }),
    );
  }

  return {
    activeSurfaceId,
    applyPublicationDecision,
    applyListing,
    capturePublicationSource: submitProductPortfolioPublicationCapture,
    closeDashboard: () => setDashboardProductId(null),
    dashboardEntry,
    dashboardHistoryEvents,
    decisionReceipts: effectiveProjection.publicationReceipts,
    focusedCurationProductId,
    focusedPublicationProductId,
    listingReceipts: effectiveProjection.listingReceipts,
    openCuration,
    openRoute,
    openPrimaryTarget,
    openProduct,
    publicationRuntime: {
      error: publicationLiveRuntime.error,
      mode: publicationLiveRuntime.mode,
      pending: publicationLiveRuntime.pending,
    },
    readModel,
    resolveRoute,
    setActiveSurfaceId,
  };
}
