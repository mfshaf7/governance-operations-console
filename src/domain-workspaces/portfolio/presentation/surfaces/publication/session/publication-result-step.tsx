import { TerasMetadataList, TerasStatusPill, TerasWizardPanel } from "@/teras";
import type { ProductPublicationDecisionReceipt } from "../../../../work-model/publication/product-publication-decision-types.ts";
import {
  productPublicationResultFacts,
  productPublicationResultLabel,
  productPublicationResultTone,
} from "./publication-session-view-model.ts";

export function ProductPublicationResultStep({
  receipt,
}: {
  receipt: ProductPublicationDecisionReceipt;
}) {
  const tone = productPublicationResultTone(receipt);

  return (
    <TerasWizardPanel
      actions={
        <TerasStatusPill tone={tone}>
          {productPublicationResultLabel(receipt)}
        </TerasStatusPill>
      }
      description="Review the prototype-local decision receipt and the resulting Product Portfolio state."
      kicker="Publication Result"
      title="Decision Receipt"
    >
      <TerasMetadataList
        columns={2}
        items={productPublicationResultFacts(receipt)}
      />
    </TerasWizardPanel>
  );
}
