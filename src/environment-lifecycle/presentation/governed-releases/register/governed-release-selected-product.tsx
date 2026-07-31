import {
  TerasActionButton,
  TerasSelectedPanel,
  type TerasTone,
} from "@/teras";

import type { ProductReleaseCapability } from "../../../model/product-release-capability";
import { selectCurrentProductReleaseStep } from "../../../read-model/product-release-selectors";
import {
  productReleaseMaturityLabels,
  productReleaseStepPostureLabels,
  productReleaseStepPostureTones,
} from "../governed-releases-labels";

function selectedProductTone(
  product: ProductReleaseCapability | null,
): TerasTone {
  if (!product) {
    return "muted";
  }

  const currentStep = selectCurrentProductReleaseStep(product);
  if (currentStep) {
    return productReleaseStepPostureTones[currentStep.posture];
  }

  return product.maturity === "fully-governed" ? "ok" : "info";
}

export function GovernedReleaseSelectedProduct({
  onOpenDashboard,
  product,
}: {
  onOpenDashboard: (product: ProductReleaseCapability) => void;
  product: ProductReleaseCapability | null;
}) {
  const currentStep = product
    ? selectCurrentProductReleaseStep(product)
    : null;
  const tone = selectedProductTone(product);

  return (
    <TerasSelectedPanel
      action={
        product
          ? {
              description:
                product.nextMove?.reason ??
                "Inspect the product-owned release path, runtime lifecycle, and supported operator actions.",
              kicker: product.nextMove ? "Required Move" : "Product Control",
              node: (
                <TerasActionButton
                  emphasis="primary"
                  onClick={() => onOpenDashboard(product)}
                >
                  Open Product Dashboard
                </TerasActionButton>
              ),
              title:
                product.nextMove?.label ??
                currentStep?.label ??
                "Review release contract",
            }
          : null
      }
      description={
        product?.unavailableReason ??
        (product
          ? "Product-owned governed release contract and runtime lifecycle controls."
          : "Select a product to inspect its governed release capability.")
      }
      facts={
        product
          ? [
              {
                label: "Maturity",
                value: productReleaseMaturityLabels[product.maturity],
              },
              { label: "Platform owner", value: product.platformOwner },
              {
                label: "Highest endpoint",
                value: product.highestRealEndpoint,
              },
              {
                label: "Runtime lifecycle",
                value: product.runtimeLifecycle ? "Available" : "Unavailable",
              },
            ]
          : []
      }
      kicker="Selected Product"
      selected={Boolean(product)}
      status={{
        label: currentStep
          ? productReleaseStepPostureLabels[currentStep.posture]
          : product
            ? productReleaseMaturityLabels[product.maturity]
            : "No selection",
        tone,
      }}
      title={product?.productLabel ?? "Select a product"}
      tone={tone}
      variant="rich"
    />
  );
}
