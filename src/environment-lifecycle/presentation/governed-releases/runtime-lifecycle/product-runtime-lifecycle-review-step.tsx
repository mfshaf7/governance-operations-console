import {
  TerasMetadataList,
  TerasWizardPanel,
} from "@/teras";

import type {
  ProductReleaseCapability,
  ProductRuntimeLifecycleCapability,
} from "../../../model/product-release-capability";
import {
  selectProductRuntimeLifecycleTransition,
} from "../../../model/product-release-capability";
import type {
  ProductRuntimeLifecycleDraft,
} from "../../../work-model/product-release/product-release-action-draft";
import {
  productRuntimeLifecycleTone,
} from "../governed-releases-labels";

export function ProductRuntimeLifecycleReviewStep({
  draft,
  lifecycle,
  product,
}: {
  draft: ProductRuntimeLifecycleDraft;
  lifecycle: ProductRuntimeLifecycleCapability;
  product: ProductReleaseCapability;
}) {
  const currentState =
    lifecycle.states.find(
      (state) => state.id === lifecycle.currentState,
    ) ?? null;
  const targetState =
    lifecycle.states.find(
      (state) => state.id === draft.targetState,
    ) ?? null;
  const transition = selectProductRuntimeLifecycleTransition(
    lifecycle,
    draft.targetState,
  );

  return (
    <TerasWizardPanel
      description="Confirm the exact product transition and required context."
      kicker="Lifecycle Review"
      title="Runtime lifecycle request"
    >
      <TerasMetadataList
        columns={3}
        items={[
          { label: "Product", value: product.productLabel },
          {
            label: "Current state",
            tone: productRuntimeLifecycleTone(currentState),
            value: currentState?.label ?? lifecycle.currentState,
          },
          {
            label: "Target state",
            tone: productRuntimeLifecycleTone(targetState),
            value: targetState?.label ?? "Not selected",
          },
          {
            label: "Reason",
            value: draft.reason,
          },
          {
            label:
              transition?.incidentRequirement === "incident-follow-up"
                ? "Incident follow-up"
                : "Incident reference",
            tone: draft.incidentRef ? undefined : "muted",
            value: draft.incidentRef || "Not required",
          },
          {
            label: "Production verification",
            value:
              transition?.verificationEffect === "pending"
                ? "Fresh verification required"
                : transition?.verificationEffect === "inactive"
                  ? "Inactive outside live"
                  : "Preserved",
          },
          {
            label: "Source record",
            value: lifecycle.sourceRef,
          },
          {
            label: "Action adapter",
            value: lifecycle.adapter.ref ?? "Adapter unavailable",
          },
        ]}
      />
    </TerasWizardPanel>
  );
}
