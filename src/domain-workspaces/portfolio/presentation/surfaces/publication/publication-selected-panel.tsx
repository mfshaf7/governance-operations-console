import { TerasActionButton, TerasSelectedPanel } from "@/teras";
import type { ProductPortfolioScenarioProjection } from "../../../read-model/types/product-portfolio-fixture-types.ts";
import {
  productPublicationActionModel,
  productPublicationRecordDescription,
  productPublicationRecordName,
  productPublicationSelectedFacts,
  productPublicationStateLabel,
  productPublicationStateTone,
} from "./publication-view-model.ts";

export function ProductPortfolioPublicationSelectedPanel({
  onOpenRecord,
  record,
}: {
  onOpenRecord: (record: ProductPortfolioScenarioProjection) => void;
  record: ProductPortfolioScenarioProjection;
}) {
  const action = productPublicationActionModel(record);
  const tone = productPublicationStateTone(record.projection.publicationState);

  return (
    <TerasSelectedPanel
      action={{
        description: action.description,
        kicker: "Publication Action",
        node: (
          <TerasActionButton
            data-product-portfolio-publication-action="true"
            onClick={() => onOpenRecord(record)}
            emphasis="primary"
          >
            {action.label}
          </TerasActionButton>
        ),
        title: action.title,
      }}
      description={productPublicationRecordDescription(record)}
      facts={productPublicationSelectedFacts(record)}
      kicker="Selected Candidate"
      selected
      status={{
        label: productPublicationStateLabel(record.projection.publicationState),
        tone,
      }}
      title={productPublicationRecordName(record)}
      tone={tone}
      variant="rich"
    />
  );
}
