import type {
  ProductReleaseCapability,
  ProductReleaseMaturity,
} from "../model/product-release-capability.ts";
import {
  productReleaseStepActionAvailability,
} from "../model/product-release-capability.ts";

export type ProductReleaseFilters = Readonly<{
  endpoint: "all" | "production" | "stage" | "unavailable";
  maturity: ProductReleaseMaturity | "all";
  query: string;
}>;

export function selectProductReleaseCapabilityById(
  products: readonly ProductReleaseCapability[],
  productId: string,
) {
  return products.find((product) => product.productId === productId) ?? null;
}

export function filterProductReleaseCapabilities(
  products: readonly ProductReleaseCapability[],
  filters: ProductReleaseFilters,
) {
  const query = filters.query.trim().toLowerCase();

  return products.filter((product) => {
    const matchesQuery =
      !query ||
      [
        product.productId,
        product.productLabel,
        product.platformOwner,
        product.highestRealEndpoint,
      ].some((value) => value.toLowerCase().includes(query));

    const highestEndpoint = product.productionPromotionSupported
      ? "production"
      : product.stageSupported
        ? "stage"
        : "unavailable";
    const matchesEndpoint =
      filters.endpoint === "all" || filters.endpoint === highestEndpoint;

    return (
      matchesQuery &&
      matchesEndpoint &&
      (filters.maturity === "all" ||
        product.maturity === filters.maturity)
    );
  });
}

export function selectCurrentProductReleaseStep(
  product: ProductReleaseCapability,
) {
  return (
    product.releasePath.find(
      (step) => step.posture === "current" || step.posture === "failed",
    ) ?? null
  );
}

export function selectProductReleaseNextMove(
  product: ProductReleaseCapability,
): ProductReleaseCapability["nextMove"] {
  const currentStep = selectCurrentProductReleaseStep(product);
  if (!currentStep) {
    if (
      product.releasePath.length > 0 &&
      product.releasePath.every((step) => step.posture === "complete")
    ) {
      return null;
    }

    return product.nextMove;
  }

  const availability = productReleaseStepActionAvailability(
    product,
    currentStep,
  );
  if (!availability.allowed && currentStep.actionRequirement) {
    return currentStep.actionRequirement.blockedMove;
  }

  const operation = currentStep.action
    ? product.releaseOperations.find(
        (candidate) => candidate.action === currentStep.action,
      ) ?? null
    : null;

  return availability.allowed && operation
    ? {
        actionId: operation.action,
        label: currentStep.label,
        ownerRef: operation.workflowOwner,
        reason: operation.description,
      }
    : product.nextMove;
}

export function summarizeProductReleaseCapabilities(
  products: readonly ProductReleaseCapability[],
) {
  return products.reduce(
    (summary, product) => {
      summary.products += 1;
      summary.stageSupported += Number(product.stageSupported);
      summary.productionSupported += Number(
        product.productionPromotionSupported,
      );
      summary.runtimeLifecycleSupported += Number(
        product.runtimeLifecycle !== null,
      );
      return summary;
    },
    {
      products: 0,
      productionSupported: 0,
      runtimeLifecycleSupported: 0,
      stageSupported: 0,
    },
  );
}
