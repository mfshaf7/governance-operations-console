import {
  TerasMetadataList,
  TerasPanelStack,
  TerasWizardPanel,
} from "@/teras";

import type {
  ProductReleaseCapability,
  ProductReleaseOperationCapability,
  ProductReleaseStep,
} from "../../../model/product-release-capability";
import type {
  ProductReleaseActionDraft,
} from "../../../work-model/product-release/product-release-action-draft";
import {
  formatProductReleaseStatus,
} from "../governed-releases-labels";

export function ProductReleaseActionReviewStep({
  draft,
  operation,
  product,
  releaseStep,
}: {
  draft: ProductReleaseActionDraft;
  operation: ProductReleaseOperationCapability;
  product: ProductReleaseCapability;
  releaseStep: ProductReleaseStep;
}) {
  return (
    <TerasPanelStack fill="last">
      <TerasWizardPanel
        description="Confirm the canonical step, owner, and required capability."
        fit="content"
        kicker="Request Context"
        title="Release boundary"
      >
        <TerasMetadataList
          columns={3}
          items={[
            { label: "Product", value: product.productLabel },
            { label: "Release step", value: releaseStep.label },
            {
              label: "Canonical status",
              value: formatProductReleaseStatus(
                releaseStep.canonicalStatus,
              ),
            },
            {
              label: "Workflow owner",
              value: operation.workflowOwner,
            },
            {
              label: "Required capability",
              value: operation.requiredCapability,
            },
            {
              label: "Action adapter",
              value: operation.adapter.ref ?? "Adapter unavailable",
            },
            {
              label: "Source record",
              value: releaseStep.sourceRef,
            },
          ]}
        />
      </TerasWizardPanel>

      <TerasWizardPanel
        description="Normalized values sent through the declared product adapter."
        kicker="Request Draft"
        title="Requested values"
      >
        <TerasMetadataList
          items={operation.fields.map((field) => ({
            label: field.label,
            tone: draft.values[field.id]?.trim() ? undefined : "muted",
            value:
              field.options.find(
                (option) =>
                  option.value === draft.values[field.id],
              )?.label ??
              draft.values[field.id]?.trim() ??
              "Not provided",
          }))}
        />
      </TerasWizardPanel>
    </TerasPanelStack>
  );
}
