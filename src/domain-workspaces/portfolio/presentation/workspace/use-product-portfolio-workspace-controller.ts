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
import { useProductMaintenanceLiveRuntime } from "../../live-runtime/use-product-maintenance-live-runtime.ts";
import type { ProductMaintenanceIntent } from "../../live-runtime/product-maintenance-live-types.ts";
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
  const dashboardEntrySource =
    readModel.entries.find(
      (entry) => entry.identity.productId === dashboardProductId,
    ) ?? null;
  const dashboardHistoryEvents = dashboardProductId
    ? (readModel.historyByProductId[dashboardProductId] ?? [])
    : [];
  const dashboardPublicationReceipt = [...effectiveProjection.publicationReceipts]
    .reverse()
    .find(
      (receipt) =>
        receipt.productId === dashboardProductId && receipt.authorityEvidence,
    );
  const maintenanceLiveRuntime = useProductMaintenanceLiveRuntime(
    dashboardEntrySource?.provenance.publicationRequestId ??
      dashboardPublicationReceipt?.authorityEvidence?.requestId ??
      null,
  );
  const dashboardEntry = useMemo(() => {
    if (!dashboardEntrySource || maintenanceLiveRuntime.mode?.mode !== "live") {
      return dashboardEntrySource;
    }
    const health = maintenanceLiveRuntime.composition?.health;
    if (!health) {
      return {
        ...dashboardEntrySource,
        provenance: { ...dashboardEntrySource.provenance, freshness: "unknown" as const },
        runtime: {
          ...dashboardEntrySource.runtime,
          availability: "unknown" as const,
          evidenceRefs: [],
          observedAt: null,
        },
      };
    }
    const availability = {
      available: "live",
      degraded: "degraded",
      unavailable: "offline",
      unknown: "unknown",
    } as const;
    return {
      ...dashboardEntrySource,
      ownership: {
        ...dashboardEntrySource.ownership,
        platformOwnerRef: health.platformOwner,
        runtimeOwnerRef: health.runtimeOwner,
      },
      provenance: {
        ...dashboardEntrySource.provenance,
        freshness: health.freshness === "current" ? "fresh" as const : "stale" as const,
        refreshedAt: health.observedAt,
      },
      runtime: {
        ...dashboardEntrySource.runtime,
        availability: availability[health.availability.state],
        evidenceRefs: health.evidence.map((item) => item.sourceRef),
        observedAt: health.observedAt,
      },
    };
  }, [dashboardEntrySource, maintenanceLiveRuntime.composition, maintenanceLiveRuntime.mode]);
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

  async function applyProductMaintenance(
    action: ProductMaintenanceIntent["action"],
    reason: string,
    intentId: string,
    decidedAt: string,
  ) {
    const composition = maintenanceLiveRuntime.composition;
    if (!composition || !dashboardProductId) {
      throw new Error("Current owner maintenance evidence is unavailable.");
    }
    const lifecycle = composition.maintenance.lifecycle;
    if (
      lifecycle.record_digest === null ||
      lifecycle.state === "not-projected"
    ) {
      throw new Error("The exact lifecycle record is not available for review.");
    }
    return maintenanceLiveRuntime.submit({
      action,
      decided_at: decidedAt,
      expected_source: {
        lifecycle_record_digest: lifecycle.record_digest,
        lifecycle_state: lifecycle.state,
        publication_posture: composition.maintenance.publication.posture,
        publication_version: composition.maintenance.publication.version,
        receipt_digest: composition.source.maintenance_receipt_digest,
        receipt_id: composition.source.maintenance_receipt_id,
        request_id: composition.request_id,
      },
      intent_id: intentId,
      reason,
    });
  }

  return {
    activeSurfaceId,
    applyPublicationDecision,
    applyListing,
    capturePublicationSource: submitProductPortfolioPublicationCapture,
    closeDashboard: () => setDashboardProductId(null),
    dashboardEntry,
    dashboardHistoryEvents,
    maintenanceRuntime: {
      apply: applyProductMaintenance,
      composition: maintenanceLiveRuntime.composition,
      error: maintenanceLiveRuntime.error,
      mode: maintenanceLiveRuntime.mode,
      pending: maintenanceLiveRuntime.pending,
    },
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
