import {
  TerasActionButton,
  TerasRecordCellText,
  TerasRecordStatusStack,
  TerasRecordTable,
  type TerasRecordTableColumn,
  TerasStatusPill,
} from "@/teras";
import type { ProductPortfolioScenarioProjection } from "../../../read-model/types/product-portfolio-fixture-types.ts";
import {
  productPublicationCheckSummary,
  productPublicationRecordCanOpenProduct,
  productPublicationRecordName,
  productPublicationRequirementCounts,
  productPublicationStateLabel,
  productPublicationStateTone,
} from "./publication-view-model.ts";

export function ProductPortfolioPublicationRegisterTable({
  onOpenRecord,
  onSelectRecord,
  records,
  selectedScenarioId,
}: {
  onOpenRecord: (record: ProductPortfolioScenarioProjection) => void;
  onSelectRecord: (record: ProductPortfolioScenarioProjection) => void;
  records: ProductPortfolioScenarioProjection[];
  selectedScenarioId: string | null;
}) {
  const columns: Array<
    TerasRecordTableColumn<ProductPortfolioScenarioProjection>
  > = [
    {
      header: "Candidate",
      intent: "primary",
      key: "candidate",
      render: (record) => (
        <TerasRecordCellText
          description={record.publicationPacket.product.productId}
          meta={`Owner / ${record.publicationPacket.owners.productOwnerRef}`}
          title={productPublicationRecordName(record)}
          variant="value-stack"
        />
      ),
    },
    {
      header: "Checks",
      intent: "evidence",
      key: "checks",
      render: (record) => {
        const counts = productPublicationRequirementCounts(
          record.projection.requirements,
        );
        const clear = counts.satisfied === counts.total;

        return (
          <TerasRecordStatusStack
            meta={`${counts.missing + counts.conflict} unresolved`}
            status={
              <TerasStatusPill tone={clear ? "ok" : "warn"}>
                {productPublicationCheckSummary(record)}
              </TerasStatusPill>
            }
          />
        );
      },
    },
    {
      header: "State",
      intent: "status",
      key: "state",
      render: (record) => (
        <TerasStatusPill
          tone={productPublicationStateTone(record.projection.publicationState)}
        >
          {productPublicationStateLabel(record.projection.publicationState)}
        </TerasStatusPill>
      ),
    },
    {
      header: "Action",
      intent: "action",
      key: "action",
      render: (record) => (
        <TerasActionButton
          onClick={(event) => {
            event.stopPropagation();
            onOpenRecord(record);
          }}
          size="table-compact"
          emphasis="secondary"
        >
          {productPublicationRecordCanOpenProduct(record) ? "Open" : "Review"}
        </TerasActionButton>
      ),
    },
  ];

  return (
    <TerasRecordTable
      columns={columns}
      fill
      getRowId={(record) => record.scenarioId}
      onSelect={onSelectRecord}
      rows={records}
      selectedRowId={selectedScenarioId}
    />
  );
}
