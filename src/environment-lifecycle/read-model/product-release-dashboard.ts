import type {
  ProductExecutionAdapter,
  ProductReleaseCapability,
  ProductReleaseOperationCapability,
  ProductReleaseStep,
  ProductRuntimeLifecycleStateCapability,
} from "../model/product-release-capability.ts";
import {
  productReleaseStepActionAvailability,
} from "../model/product-release-capability.ts";
import {
  selectCurrentProductReleaseStep,
  selectProductReleaseNextMove,
} from "./product-release-selectors.ts";

export type ProductReleaseDashboard = Readonly<{
  currentStep: ProductReleaseStep | null;
  nextMove: ProductReleaseCapability["nextMove"];
  operatorRoute: ProductReleaseCapability["operatorRoute"];
  overview: Readonly<{
    highestRealEndpoint: string;
    maturity: ProductReleaseCapability["maturity"];
    platformOwner: string;
    productId: string;
    productLabel: string;
    productionPromotionSupported: boolean;
    rollback: ProductReleaseCapability["rollback"];
    securityOwner: string;
    source: ProductReleaseCapability["source"];
    stageSupported: boolean;
  }>;
  releasePath: Readonly<{
    available: boolean;
    steps: readonly Readonly<{
      actionable: boolean;
      operation: ProductReleaseOperationCapability | null;
      step: ProductReleaseStep;
      unavailableReason: string | null;
    }>[];
    unavailableReason: string | null;
  }>;
  runtimeLifecycle: Readonly<{
    adapter: ProductExecutionAdapter | null;
    available: boolean;
    currentState: ProductRuntimeLifecycleStateCapability | null;
    sourceRef: string | null;
    targetStates: readonly ProductRuntimeLifecycleStateCapability[];
    unavailableReason: string | null;
  }>;
  supportingEvidenceRefs: readonly string[];
}>;

export function buildProductReleaseDashboard(
  product: ProductReleaseCapability,
): ProductReleaseDashboard {
  const currentStep = selectCurrentProductReleaseStep(product);
  const runtimeCurrentState =
    product.runtimeLifecycle?.states.find(
      (state) => state.id === product.runtimeLifecycle?.currentState,
    ) ?? null;
  const releaseSteps = product.releasePath.map((step) => {
    const operation =
      product.releaseOperations.find(
        (candidate) => candidate.action === step.action,
      ) ?? null;
    const availability =
      productReleaseStepActionAvailability(product, step);

    return {
      actionable: operation !== null && availability.allowed,
      operation,
      step,
      unavailableReason: availability.reason,
    };
  });
  const runtimeTargetStateIds = new Set(
    product.runtimeLifecycle?.transitions
      .filter(
        (transition) =>
          transition.fromStateId ===
          product.runtimeLifecycle?.currentState,
      )
      .map((transition) => transition.toStateId) ?? [],
  );

  return {
    currentStep,
    nextMove: selectProductReleaseNextMove(product),
    operatorRoute: product.operatorRoute,
    overview: {
      highestRealEndpoint: product.highestRealEndpoint,
      maturity: product.maturity,
      platformOwner: product.platformOwner,
      productId: product.productId,
      productLabel: product.productLabel,
      productionPromotionSupported: product.productionPromotionSupported,
      rollback: product.rollback,
      securityOwner: product.securityOwner,
      source: product.source,
      stageSupported: product.stageSupported,
    },
    releasePath: {
      available: product.releasePath.length > 0,
      steps: releaseSteps,
      unavailableReason: product.unavailableReason,
    },
    runtimeLifecycle: {
      adapter: product.runtimeLifecycle?.adapter ?? null,
      available:
        product.runtimeLifecycle !== null &&
        product.runtimeLifecycle.adapter.available &&
        runtimeTargetStateIds.size > 0,
      currentState: runtimeCurrentState,
      sourceRef: product.runtimeLifecycle?.sourceRef ?? null,
      targetStates:
        product.runtimeLifecycle?.states.filter(
          (state) => runtimeTargetStateIds.has(state.id),
        ) ?? [],
      unavailableReason:
        product.runtimeLifecycle?.adapter.unavailableReason ?? null,
    },
    supportingEvidenceRefs: product.supportingEvidenceRefs,
  };
}
