import type {
  ConsoleAttentionCandidate,
  ConsoleAttentionSource,
  ConsoleAttentionSourceMode,
  ConsoleAttentionSourceSnapshot,
} from "../../../console-integration/attention-contract.ts";
import { consoleAttentionSourceRegistrations } from "../../../console-integration/attention-source-registry.ts";
import { projectProductPortfolioEffectiveProjection } from "../local-runtime/product-portfolio-effective-projection.ts";
import {
  getProductPortfolioRuntimeProjectionSnapshot,
  subscribeProductPortfolioRuntimeProjection,
} from "../local-runtime/product-portfolio-runtime-store.ts";
import type { ProductPortfolioRequiredAction } from "../work-model/publication/product-publication-review-types.ts";
import { productPortfolioReadModel } from "./product-portfolio-read-model.ts";
import type { ProductPortfolioScenarioProjection } from "./types/product-portfolio-fixture-types.ts";

const registration = consoleAttentionSourceRegistrations.portfolio;
let cachedRuntime = getProductPortfolioRuntimeProjectionSnapshot();
let cachedSnapshot = projectPortfolioAttentionSnapshot(cachedRuntime);

export const portfolioAttentionSource: ConsoleAttentionSource = {
  getSnapshot() {
    const runtime = getProductPortfolioRuntimeProjectionSnapshot();

    if (runtime !== cachedRuntime) {
      cachedRuntime = runtime;
      cachedSnapshot = projectPortfolioAttentionSnapshot(runtime);
    }

    return cachedSnapshot;
  },
  registration,
  subscribe: subscribeProductPortfolioRuntimeProjection,
};

function projectPortfolioAttentionSnapshot(
  runtime: ReturnType<typeof getProductPortfolioRuntimeProjectionSnapshot>,
): ConsoleAttentionSourceSnapshot {
  const projection = projectProductPortfolioEffectiveProjection({
    runtimeProjection: runtime,
    sourceReadModel: productPortfolioReadModel,
  });
  const readModel = projection.readModel;
  const projectedAt = portfolioProjectedAt(readModel.scenarioProjections);

  return {
    candidates: readModel.scenarioProjections.flatMap((scenario) => {
      if (scenario.projection.requiredAction.kind === "none") {
        return [];
      }

      return [portfolioAttentionCandidate(scenario, projectedAt)];
    }),
    registration,
    schemaVersion: 1,
    source: {
      authority: "product-portfolio-registry",
      freshness: "current",
      mode: "prototype-local",
      observedAt: projectedAt,
      projectedAt,
      ref: "portfolio://attention-projection",
      version: `portfolio-attention-v1:${readModel.scenarioProjections.length}:${projection.publicationReceipts.length}:${projection.listingReceipts.length}`,
    },
  };
}

function portfolioAttentionCandidate(
  scenario: ProductPortfolioScenarioProjection,
  projectedAt: string,
): ConsoleAttentionCandidate {
  const action = scenario.projection.requiredAction;
  if (action.kind === "none") {
    throw new Error(
      `Portfolio scenario ${scenario.scenarioId} has no attention action.`,
    );
  }

  const productId = scenario.publicationPacket.product.productId;
  const displayName =
    scenario.publicationPacket.manifest.displayName.trim() ||
    portfolioAttentionFallbackTitle(productId);
  const sourceRef =
    scenario.publicationPacket.manifest.ref.trim() ||
    scenario.publicationPacket.product.registryRef;
  const requiredMove = portfolioRequiredMove(action);
  const sourceVersion =
    scenario.publicationPacket.sourceVersions
      .map((version) => `${version.authority}:${version.version}`)
      .join("|") || scenario.publicationPacket.product.registryVersion;
  const evidenceRefs = scenario.projection.requirements.flatMap(
    (requirement) => requirement.evidenceRefs,
  );

  return {
    attentionClass: action.kind.startsWith("repair-") ? "recovery" : "review",
    candidateId: `portfolio:${productId}:${requiredMove.id}`,
    correlationRef: scenario.publicationPacket.correlationId,
    dedupeKey: `${productId}:${requiredMove.id}`,
    dueAt: null,
    evidenceRefs,
    owner: {
      label: action.ownerRef,
      ref: action.ownerRef,
    },
    ownerRank: portfolioOwnerRank(action),
    reason: portfolioRequiredMoveReason(action),
    receiptRefs: [scenario.projection.receipt.receiptRef],
    requiredMove,
    reviewAt: null,
    route: {
      availability: "available",
      entryIntent: {
        mode: action.kind.startsWith("repair-") ? "resolve" : "review",
        requiredMoveRef: requiredMove.id,
        subjectRef: productId,
        target: {
          id: "workbench:portfolio",
          kind: "workbench-domain",
          surfaceLabel: "PORTFOLIO",
        },
      },
      externalHref: null,
      label: "Open Portfolio",
      unavailableReason: null,
    },
    schemaVersion: 1,
    source: {
      authority: "product-portfolio-registry",
      freshness:
        scenario.projection.entry?.provenance.freshness === "stale"
          ? "stale"
          : "current",
      mode: portfolioSourceMode(scenario),
      observedAt: scenario.projectionContext.evaluatedAt,
      projectedAt,
      ref: sourceRef,
      version: sourceVersion,
    },
    subject: {
      kind: "portfolio-product",
      ref: productId,
      title: displayName,
    },
    urgency: action.kind.startsWith("repair-") ? "high" : "normal",
  };
}

function portfolioAttentionFallbackTitle(productId: string) {
  return productId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function portfolioRequiredMove(
  action: Exclude<ProductPortfolioRequiredAction, { kind: "none" }>,
) {
  const labels = {
    "open-existing-product": "Open Existing Product",
    "repair-publication": "Repair Publication",
    "repair-runtime-evidence": "Repair Runtime Evidence",
    "review-publication": "Review Product Publication",
    "review-listing": "Review Product Listing",
  } as const;

  return {
    id: `portfolio.${action.kind}`,
    label: labels[action.kind],
  };
}

function portfolioRequiredMoveReason(
  action: Exclude<ProductPortfolioRequiredAction, { kind: "none" }>,
) {
  const requirement = action.requirementCodes.join(", ");

  switch (action.kind) {
    case "open-existing-product":
      return "The publication resolves to an existing product record that needs operator review.";
    case "repair-publication":
      return requirement
        ? `Repair publication requirements: ${requirement}.`
        : "Repair the source publication before publication can continue.";
    case "repair-runtime-evidence":
      return "Refresh degraded, offline, or stale runtime evidence before the listing is treated as current.";
    case "review-publication":
      return requirement
        ? `Review publication requirements: ${requirement}.`
        : "Review the captured product publication before publication.";
    case "review-listing":
      return "Review the product listing posture and requested visibility.";
  }
}

function portfolioOwnerRank(
  action: Exclude<ProductPortfolioRequiredAction, { kind: "none" }>,
) {
  switch (action.kind) {
    case "repair-publication":
    case "repair-runtime-evidence":
      return 10;
    case "review-publication":
      return 30;
    case "review-listing":
    case "open-existing-product":
      return 40;
  }
}

function portfolioSourceMode(
  scenario: ProductPortfolioScenarioProjection,
): ConsoleAttentionSourceMode {
  return scenario.provenance.mode === "authority-snapshot"
    ? "source-projected"
    : "synthetic";
}

function portfolioProjectedAt(
  scenarios: readonly ProductPortfolioScenarioProjection[],
) {
  return (
    scenarios
      .map((scenario) => scenario.projectionContext.evaluatedAt)
      .sort()
      .at(-1) ?? "2026-07-28T00:00:00.000Z"
  );
}
